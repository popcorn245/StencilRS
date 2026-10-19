//! Source maps for the generated module.
//!
//! Codegen runs in two steps: text edits on the TypeScript source (`edits.rs`), then oxc's
//! transformer and printer on the edited text. oxc's printer maps its output back to the
//! edited text; this module carries those mappings on through the edits to the original
//! source, so the map points at what the author wrote.

use std::borrow::Cow;
use std::collections::HashMap;

use oxc_sourcemap::{SourceMap, Token};

use crate::edits::OffsetMap;

/// Line starts of a text, for converting between byte offsets and source map positions
/// (0-based lines, columns in UTF-16 code units). Lines end at `\n`, `\r\n`, `\r`, U+2028 and
/// U+2029, as in oxc's printer and the ECMAScript spec.
struct LineIndex<'a> {
    text: &'a str,
    starts: Vec<u32>,
    /// Per line: all ASCII, so byte and UTF-16 columns agree (the common case, O(1) lookups).
    ascii: Vec<bool>,
}

impl<'a> LineIndex<'a> {
    fn new(text: &'a str) -> Self {
        // Bytes, not chars: every line break starts with a byte that can't occur inside a
        // multi-byte char (`\n`, `\r`, or 0xE2, the lead byte of U+2028 / U+2029).
        let bytes = text.as_bytes();
        let mut starts = vec![0];
        let mut ascii = Vec::new();
        let mut line_ascii = true;
        let mut i = 0;
        while i < bytes.len() {
            let b = bytes[i];
            let next = match b {
                b'\n' => Some(i + 1),
                b'\r' if bytes.get(i + 1) == Some(&b'\n') => Some(i + 2),
                b'\r' => Some(i + 1),
                0xE2 if bytes.get(i + 1) == Some(&0x80) && matches!(bytes.get(i + 2), Some(0xA8 | 0xA9)) => Some(i + 3),
                _ => {
                    line_ascii &= b.is_ascii();
                    None
                }
            };
            match next {
                Some(n) => {
                    ascii.push(line_ascii);
                    line_ascii = true;
                    starts.push(n as u32);
                    i = n;
                }
                None => i += 1,
            }
        }
        ascii.push(line_ascii);
        Self { text, starts, ascii }
    }

    /// The byte offset of a line and UTF-16 column, if the text has it.
    fn offset(&self, line: u32, col: u32) -> Option<u32> {
        let start = *self.starts.get(line as usize)?;
        if self.ascii[line as usize] {
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

    /// The line and UTF-16 column of a byte offset (a char boundary).
    fn position(&self, offset: u32) -> (u32, u32) {
        let line = self.starts.partition_point(|&s| s <= offset) - 1;
        let start = self.starts[line] as usize;
        let before = &self.text[start..offset as usize];
        let col = if self.ascii[line] { before.len() } else { before.encode_utf16().count() };
        (line as u32, col as u32)
    }
}

/// Compose oxc's map (output → `edited`) with the edits (`edited` → `source`) into a map from
/// the output to the original source, as source map v3 JSON. `prefix_lines`: lines put in
/// front of oxc's output afterwards. `anchors` moves a mapped position in `edited` to another
/// one first (class members, from their modifier to the first token that is printed).
pub fn compose(printed: &SourceMap, edited: &str, edits: &OffsetMap, anchors: &HashMap<u32, u32>, source: &str, file: &str, prefix_lines: u32) -> String {
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
    let names = printed.get_names().map(|n| Cow::Owned(n.to_owned())).collect();
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
