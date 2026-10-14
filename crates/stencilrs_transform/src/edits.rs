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

    /// Apply all edits. Replacements must not overlap; insertions at the same offset keep
    /// their order, and come before a replacement that starts there.
    pub fn apply(mut self) -> String {
        self.edits.sort_by(|a, b| a.0.cmp(&b.0).then((a.1 > a.0).cmp(&(b.1 > b.0))).then(a.3.cmp(&b.3)));
        let mut out = String::with_capacity(self.source.len() + 256);
        let mut pos = 0usize;
        for (start, end, text, _) in &self.edits {
            let (start, end) = (*start as usize, *end as usize);
            if start < pos {
                // Overlaps an earlier replacement: that edit already covers this range.
                if end <= pos {
                    continue;
                }
            } else {
                out.push_str(&self.source[pos..start]);
            }
            out.push_str(text);
            pos = pos.max(end);
        }
        out.push_str(&self.source[pos..]);
        out
    }
}
