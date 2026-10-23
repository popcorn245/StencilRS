//! Source maps for the generated module.
//!
//! Codegen runs in two steps: text edits on the TypeScript source (`edits.rs`), then oxc's
//! transformer and printer on the edited text. oxc's printer maps its output back to the
//! edited text; this module carries those mappings on through the edits to the original
//! source, so the map points at what the author wrote.

use std::borrow::Cow;
use std::cell::Cell;
use rustc_hash::FxHashMap;

use oxc_sourcemap::{SourceMap, Token};

use crate::edits::OffsetMap;

/// Line starts of a text, for converting between byte offsets and source map positions
/// (0-based lines, columns in UTF-16 code units). Lines end at `\n`, `\r\n`, `\r`, U+2028 and
/// U+2029, as in oxc's printer and the ECMAScript spec.
struct LineIndex<'a> {
    text: &'a str,
    starts: Vec<u32>,
    /// Per line: all ASCII, so byte and UTF-16 columns agree (the common case, O(1) lookups).
    /// Empty when the whole text is ASCII.
    ascii: Vec<bool>,
    /// The line `position` found last, to start the next search from.
    last_line: Cell<usize>,
}

impl<'a> LineIndex<'a> {
    fn new(text: &'a str) -> Self {
        // Bytes, not chars: every line break starts with a byte that can't occur inside a
        // multi-byte char (`\n`, `\r`, or 0xE2, the lead byte of U+2028 / U+2029).
        let bytes = text.as_bytes();
        let mut starts = vec![0];
        let all_ascii = text.is_ascii();
        let mut ascii = Vec::new();
        let mut line_start = 0;
        let mut i = 0;
        while let Some(found) = memchr::memchr3(b'\n', b'\r', 0xE2, &bytes[i..]) {
            let at = i + found;
            let end = match bytes[at] {
                b'\n' => at + 1,
                b'\r' if bytes.get(at + 1) == Some(&b'\n') => at + 2,
                b'\r' => at + 1,
                _ if bytes.get(at + 1) == Some(&0x80) && matches!(bytes.get(at + 2), Some(0xA8 | 0xA9)) => at + 3,
                _ => {
                    // Some other char that starts with 0xE2: not a break.
                    i = at + 1;
                    continue;
                }
            };
            if !all_ascii {
                ascii.push(bytes[line_start..at].is_ascii());
            }
            starts.push(end as u32);
            line_start = end;
            i = end;
        }
        if !all_ascii {
            ascii.push(bytes[line_start..].is_ascii());
        }
        Self { text, starts, ascii, last_line: Cell::new(0) }
    }

    fn line_is_ascii(&self, line: usize) -> bool {
        self.ascii.is_empty() || self.ascii[line]
    }

    /// The byte offset of a line and UTF-16 column, if the text has it.
    fn offset(&self, line: u32, col: u32) -> Option<u32> {
        let start = *self.starts.get(line as usize)?;
        if self.line_is_ascii(line as usize) {
            let end = self.starts.get(line as usize + 1).map_or(self.text.len() as u32, |&e| e);
            return (start + col <= end).then_some(start + col);
        }
        let rest = &self.text[start as usize..];
        let mut units = 0;
        for (i, ch) in rest.char_indices() {
            if units >= col {
                return Some(start + i as u32);
            }
            units += ch.len_utf16() as u32;
        }
        (units >= col).then_some(self.text.len() as u32)
    }

    /// The line holding a byte offset. Lookups come in near each other, so the last line (or the
    /// one after) is tried before searching.
    fn line_of(&self, offset: u32) -> usize {
        let last = self.last_line.get();
        let holds = |line: usize| self.starts[line] <= offset && self.starts.get(line + 1).is_none_or(|&next| offset < next);
        let line = if holds(last) {
            last
        } else if last + 1 < self.starts.len() && holds(last + 1) {
            last + 1
        } else {
            self.starts.partition_point(|&s| s <= offset) - 1
        };
        self.last_line.set(line);
        line
    }

    /// The line and UTF-16 column of a byte offset (a char boundary).
    fn position(&self, offset: u32) -> (u32, u32) {
        let line = self.line_of(offset);
        let start = self.starts[line] as usize;
        let col = if self.line_is_ascii(line) {
            offset as usize - start
        } else {
            self.text[start..offset as usize].encode_utf16().count()
        };
        (line as u32, col as u32)
    }
}

/// Compose oxc's map (output → `edited`) with the edits (`edited` → `source`) into a map from
/// the output to the original source, as source map v3 JSON. `prefix_lines`: lines put in
/// front of oxc's output afterwards. `anchors` moves a mapped position in `edited` to another
/// one first (class members, from their modifier to the first token that is printed).
pub fn compose(printed: &SourceMap, edited: &str, edits: &OffsetMap, anchors: &FxHashMap<u32, u32>, source: &str, file: &str, prefix_lines: u32) -> String {
    let edited_lines = LineIndex::new(edited);
    let source_lines = LineIndex::new(source);
    let tokens: Vec<Token> = printed
        .get_tokens()
        .filter(|t| t.get_source_id().is_some())
        .filter_map(|t| {
            let at = edited_lines.offset(t.get_src_line(), t.get_src_col())?;
            let at = anchors.get(&at).copied().unwrap_or(at);
            let (line, col) = source_lines.position(edits.to_original(at)?);
            Some(Token::new(t.get_dst_line() + prefix_lines, t.get_dst_col(), line, col, Some(0), t.get_name_id()))
        })
        .collect();
    let names = printed.get_names().map(Cow::Borrowed).collect();
    let name = file.rsplit(['/', '\\']).next().unwrap_or(file);
    let output = match name.rfind('.') {
        Some(dot) => format!("{}.js", &name[..dot]),
        None => format!("{name}.js"),
    };
    SourceMap::new(
        Some(Cow::Owned(output)),
        names,
        None,
        vec![Cow::Owned(name.to_owned())],
        vec![Some(Cow::Borrowed(source))],
        tokens.into_boxed_slice(),
        None,
    )
    .to_json_string()
}

#[cfg(test)]
mod tests {
    use super::LineIndex;

    #[test]
    fn line_index_round_trips_utf16_columns() {
        let text = "ab\r\nc\u{1F600}d\re\u{2028}f\n";
        let idx = LineIndex::new(text);
        // Line 1 holds "c😀d": the emoji is one char, two UTF-16 units.
        let d = text.find('d').unwrap() as u32;
        assert_eq!(idx.position(d), (1, 3));
        assert_eq!(idx.offset(1, 3), Some(d));
        assert_eq!(idx.position(text.find('e').unwrap() as u32), (2, 0));
        assert_eq!(idx.position(text.find('f').unwrap() as u32), (3, 0));
        assert_eq!(idx.offset(9, 0), None);
    }
}
