//! Span-based text edits over the original source (a tiny magic-string).

pub struct Edits<'s> {
    source: &'s str,
    /// (start, end, replacement, insertion order). Insertions have start == end.
    edits: Vec<(u32, u32, String, usize)>,
}

impl<'s> Edits<'s> {
    pub fn new(source: &'s str) -> Self {
        Self { source, edits: Vec::new() }
    }

    pub fn replace(&mut self, start: u32, end: u32, text: impl Into<String>) {
        let n = self.edits.len();
        self.edits.push((start, end, text.into(), n));
    }

    pub fn remove(&mut self, start: u32, end: u32) {
        self.replace(start, end, "");
    }

    pub fn insert(&mut self, at: u32, text: impl Into<String>) {
        self.replace(at, at, text);
    }

    /// Apply all edits, and say where each stretch of the output came from (for source maps).
    /// Replacements must not overlap; insertions at the same offset keep their order, and come
    /// before a replacement that starts there.
    pub fn apply_mapped(mut self) -> (String, OffsetMap) {
        self.edits.sort_by(|a, b| a.0.cmp(&b.0).then((a.1 > a.0).cmp(&(b.1 > b.0))).then(a.3.cmp(&b.3)));
        let mut out = String::with_capacity(self.source.len() + 256);
        let mut segments = Vec::new();
        let mut pos = 0usize;
        for (start, end, text, _) in &self.edits {
            let (start, end) = (*start as usize, *end as usize);
            if start < pos {
                // Overlaps an earlier replacement: that edit already covers this range.
                if end <= pos {
                    continue;
                }
                push(&mut out, &mut segments, text, None);
            } else {
                push(&mut out, &mut segments, &self.source[pos..start], Some(pos));
                push_replacement(&mut out, &mut segments, text, &self.source[start..end], start);
            }
            pos = pos.max(end);
        }
        push(&mut out, &mut segments, &self.source[pos..], Some(pos));
        (out, OffsetMap { segments, source_len: self.source.len() as u32 })
    }
}

fn push(out: &mut String, segments: &mut Vec<Segment>, text: &str, from: Option<usize>) {
    if text.is_empty() {
        return;
    }
    let start = out.len() as u32;
    out.push_str(text);
    segments.push(Segment { start, end: out.len() as u32, from: from.map(|f| f as u32) });
}

/// Write the text of an edit that replaced `replaced` (at `at` in the source). Identifiers the
/// new text keeps from the old (`export class X` → `const X = class`, the names left in a
/// rewritten import) map to where they were written: the next occurrence after the previous
/// match, else the first (`X` and `class` swap places above). The rest is new code, with no
/// source position.
fn push_replacement(out: &mut String, segments: &mut Vec<Segment>, text: &str, replaced: &str, at: usize) {
    let mut written = 0; // in `text`
    let mut searched = 0; // in `replaced`, past the last match
    for (i, ident) in identifiers(text) {
        let Some(found) = find_identifier(replaced, ident, searched).or_else(|| find_identifier(replaced, ident, 0)) else { continue };
        push(out, segments, &text[written..i], None);
        push(out, segments, ident, Some(at + found));
        written = i + ident.len();
        searched = found + ident.len();
    }
    push(out, segments, &text[written..], None);
}

fn is_ident_char(c: char) -> bool {
    c.is_ascii_alphanumeric() || c == '_' || c == '$'
}

/// The identifier-like words of `text`, with their byte offsets.
fn identifiers(text: &str) -> impl Iterator<Item = (usize, &str)> {
    let mut rest = text.char_indices().peekable();
    std::iter::from_fn(move || {
        loop {
            let (start, c) = rest.next()?;
            if !(is_ident_char(c) && !c.is_ascii_digit()) {
                continue;
            }
            let mut end = start + c.len_utf8();
            while let Some(&(i, c)) = rest.peek() {
                if !is_ident_char(c) {
                    break;
                }
                end = i + c.len_utf8();
                rest.next();
            }
            return Some((start, &text[start..end]));
        }
    })
}

/// The offset of `ident` as a whole word in `text`, at or after `from`.
fn find_identifier(text: &str, ident: &str, from: usize) -> Option<usize> {
    let mut at = from;
    while let Some(i) = text[at..].find(ident) {
        let start = at + i;
        let end = start + ident.len();
        let before = text[..start].chars().next_back();
        let after = text[end..].chars().next();
        if !before.is_some_and(is_ident_char) && !after.is_some_and(is_ident_char) {
            return Some(start);
        }
        at = start + ident.len();
    }
    None
}

/// One stretch of edited output: copied from the source at `from`, or (`None`) new text an
/// edit wrote.
struct Segment {
    start: u32,
    end: u32,
    from: Option<u32>,
}

/// Maps a byte offset in the edited text back to the original source.
pub struct OffsetMap {
    segments: Vec<Segment>,
    source_len: u32,
}

impl OffsetMap {
    /// Copied text maps to itself. Text an edit wrote has no original (`None`): like
    /// TypeScript's synthesized nodes, generated code stays unmapped.
    pub fn to_original(&self, offset: u32) -> Option<u32> {
        let i = self.segments.partition_point(|s| s.end <= offset);
        match self.segments.get(i) {
            Some(s) => s.from.map(|from| from + (offset - s.start)),
            None => Some(self.source_len),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::Edits;

    #[test]
    fn replacements_keep_their_identifiers_mapped() {
        let source = "@Cmp({ tag: 'x-foo' })\nexport class Foo {}\n";
        let mut ed = Edits::new(source);
        ed.replace(0, source.find(" {}").unwrap() as u32, "const Foo = class extends HTMLElement");
        ed.insert(source.len() as u32, "define(Foo);\n");
        let (out, map) = ed.apply_mapped();
        let at = |s: &str| out.find(s).unwrap() as u32;
        // Kept from the replaced text: the class name and `class`.
        assert_eq!(map.to_original(at("Foo =")), Some(source.find("Foo").unwrap() as u32));
        assert_eq!(map.to_original(at("class ext")), Some(source.find("class").unwrap() as u32));
        // New code: no source position.
        assert_eq!(map.to_original(at("const")), None);
        assert_eq!(map.to_original(at("HTMLElement")), None);
        assert_eq!(map.to_original(at("define")), None);
        // Copied text maps to itself.
        assert_eq!(map.to_original(at(" {}")), Some(source.find(" {}").unwrap() as u32));
    }
}
