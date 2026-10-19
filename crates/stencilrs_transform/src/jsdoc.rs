//! JSDoc text and tags, as Stencil serialises them (`serializeSymbol`,
//! `transformers/transform-utils.ts`): `ts.displayPartsToString(getDocumentationComment())`
//! and `getJsDocTags()` with each tag's parts joined.
//!
//! The comment is read the way TypeScript's JSDoc parser (`parseJSDocCommentWorker`) reads it:
//! the same token stream, margin and indentation rules, so the text keeps (and drops) the same
//! whitespace. `{@link …}` is kept as written; TypeScript rebuilds it from parts that join to
//! the same text unless the link carries a `|` label.

use oxc::ast::ast::Comment;

use crate::meta::{Docs, DocsTag};

/// One parsed `/** … */` comment.
#[derive(Debug, Clone, Default, PartialEq)]
pub struct JsDoc {
    /// The text before the first tag.
    pub comment: String,
    pub tags: Vec<Tag>,
}

#[derive(Debug, Clone, PartialEq)]
pub struct Tag {
    pub name: String,
    /// `JSDocTagInfo.text`, joined.
    pub text: Option<String>,
    /// The tag's own comment, which is what a `@param` documents its parameter with.
    pub comment: Option<String>,
    /// The parameter a `@param` tag names.
    pub param: Option<String>,
}

#[derive(Clone, Copy, PartialEq, Eq, Debug)]
enum Tok {
    Eof,
    Newline,
    Whitespace,
    Asterisk,
    At,
    OpenBrace,
    CloseBrace,
    OpenBracket,
    CloseBracket,
    Dot,
    Backtick,
    Equals,
    Ident,
    CommentText,
    Other,
}

fn is_space(c: char) -> bool {
    matches!(c, ' ' | '\t' | '\u{b}' | '\u{c}' | '\u{a0}' | '\u{1680}' | '\u{2000}'..='\u{200b}' | '\u{202f}' | '\u{205f}' | '\u{3000}' | '\u{feff}')
}

fn is_line_break(c: char) -> bool {
    matches!(c, '\n' | '\r' | '\u{2028}' | '\u{2029}')
}

fn is_ident_start(c: char) -> bool {
    c == '$' || c == '_' || c.is_alphabetic()
}

fn is_ident_part(c: char) -> bool {
    c == '$' || c == '_' || c == '\u{200c}' || c == '\u{200d}' || c.is_alphanumeric()
}

#[derive(Clone)]
struct Scan<'a> {
    s: &'a [char],
    pos: usize,
    start: usize,
    tok: Tok,
}

impl Scan<'_> {
    fn text(&self) -> String {
        self.s[self.start..self.pos].iter().collect()
    }

    fn at(&self, i: usize) -> Option<char> {
        self.s.get(i).copied()
    }

    /// `scanJsDocToken`.
    fn next(&mut self) -> Tok {
        self.start = self.pos;
        let Some(c) = self.at(self.pos) else { return self.set(Tok::Eof) };
        self.pos += 1;
        let tok = match c {
            '\t' | '\u{b}' | '\u{c}' | ' ' => {
                while self.at(self.pos).is_some_and(is_space) {
                    self.pos += 1;
                }
                Tok::Whitespace
            }
            '@' => Tok::At,
            '\r' | '\n' => {
                if c == '\r' && self.at(self.pos) == Some('\n') {
                    self.pos += 1;
                }
                Tok::Newline
            }
            '*' => Tok::Asterisk,
            '{' => Tok::OpenBrace,
            '}' => Tok::CloseBrace,
            '[' => Tok::OpenBracket,
            ']' => Tok::CloseBracket,
            '.' => Tok::Dot,
            '`' => Tok::Backtick,
            '=' => Tok::Equals,
            c if is_ident_start(c) => {
                while self.at(self.pos).is_some_and(|c| is_ident_part(c) || c == '-') {
                    self.pos += 1;
                }
                Tok::Ident
            }
            _ => Tok::Other,
        };
        self.set(tok)
    }

    /// `scanJSDocCommentTextToken`: the rest of the line, up to a `{` or an `@` that starts a tag.
    fn next_text(&mut self, in_backticks: bool) -> Tok {
        self.start = self.pos;
        if self.pos >= self.s.len() {
            return self.set(Tok::Eof);
        }
        while let Some(c) = self.at(self.pos) {
            if is_line_break(c) || c == '`' {
                break;
            }
            if !in_backticks {
                if c == '{' {
                    break;
                }
                if c == '@'
                    && self.pos > 0
                    && is_space(self.s[self.pos - 1])
                    && !self.at(self.pos + 1).is_some_and(|n| is_space(n) || is_line_break(n))
                {
                    break;
                }
            }
            self.pos += 1;
        }
        if self.pos == self.start {
            return self.next();
        }
        self.set(Tok::CommentText)
    }

    fn set(&mut self, tok: Tok) -> Tok {
        self.tok = tok;
        tok
    }

    fn reset(&mut self, pos: usize) {
        self.pos = pos;
        self.start = pos;
        self.tok = Tok::Other;
    }
}

/// `findLinkNameEnd`: where a link's name ends inside its text.
fn link_name_end(text: &str) -> usize {
    let chars: Vec<char> = text.chars().collect();
    if text.starts_with("://") {
        return chars.iter().position(|&c| c == '|').unwrap_or(chars.len());
    }
    if text.starts_with("()") {
        return 2;
    }
    if chars.first() == Some(&'<') {
        let mut depth = 0i32;
        for (i, &c) in chars.iter().enumerate() {
            match c {
                '<' => depth += 1,
                '>' => depth -= 1,
                _ => {}
            }
            if depth == 0 {
                return i + 1;
            }
        }
    }
    0
}

#[derive(Clone, Copy, PartialEq, Eq)]
enum State {
    BeginningOfLine,
    SawAsterisk,
    SavingComments,
    SavingBackticks,
}

struct Parser<'a> {
    sc: Scan<'a>,
    tags: Vec<Tag>,
    /// Whether the checker finds a declaration for a `{@link name}`.
    resolves: &'a dyn Fn(&str) -> bool,
}

fn remove_leading_newlines(c: &mut Vec<String>) {
    while c.first().is_some_and(|s| s == "\n" || s == "\r") {
        c.remove(0);
    }
}

fn remove_trailing_whitespace(c: &mut Vec<String>) {
    while let Some(last) = c.last() {
        let trimmed = last.trim_end();
        if trimmed.is_empty() {
            c.pop();
        } else if trimmed.len() < last.len() {
            let n = c.len();
            c[n - 1] = trimmed.to_owned();
            break;
        } else {
            break;
        }
    }
}

impl Parser<'_> {
    /// A `{@link …}` / `{@linkcode …}` / `{@linkplain …}` at the current `{`, as
    /// `buildLinkParts` prints it, with the scanner left on the closing brace.
    fn link(&mut self) -> Option<String> {
        let from = self.sc.start;
        let s = self.sc.s;
        if s.get(from + 1) != Some(&'@') {
            return None;
        }
        let word: String = s[from + 2..].iter().take_while(|c| c.is_alphabetic()).collect();
        if !matches!(word.as_str(), "link" | "linkcode" | "linkplain") {
            return None;
        }
        let body = from + 2 + word.chars().count();
        let close = s[body..].iter().position(|&c| c == '}' || is_line_break(c))? + body;
        if s[close] != '}' {
            return None;
        }
        // The name (`a.b`, `a#b`), then the rest of the link as its text.
        let mut i = body;
        while s.get(i).is_some_and(|&c| is_space(c)) {
            i += 1;
        }
        let name_start = i;
        while s[i..close].first().is_some_and(|&c| is_ident_start(c)) {
            while s.get(i).is_some_and(|&c| is_ident_part(c) || c == '-') {
                i += 1;
            }
            if i < close && matches!(s[i], '.' | '#') && s.get(i + 1).is_some_and(|&c| is_ident_start(c)) {
                i += 1;
            } else {
                break;
            }
        }
        let name: String = s[name_start..i].iter().collect();
        let text: String = s[i..close].iter().collect();
        self.sc.reset(close + 1);
        self.sc.tok = Tok::CloseBrace;
        let prefix = format!("{{@{word} ");
        if name.is_empty() {
            return Some(format!("{prefix}{text}}}"));
        }
        let suffix = link_name_end(&text);
        let name = format!("{name}{}", text.chars().take(suffix).collect::<String>());
        let rest: String = text.chars().skip(suffix).collect();
        let rest = match rest.strip_prefix('|') {
            Some(after) => after.trim_start_matches(' ').to_owned(),
            None => rest,
        };
        let first = name.split(['.', '#']).next().unwrap_or_default();
        if (self.resolves)(first) {
            return Some(format!("{prefix}{name}{rest}}}"));
        }
        let bar_after_name = text.chars().nth(suffix) == Some('|') && !name.ends_with(' ');
        let separator = if suffix == 0 || bar_after_name { " " } else { "" };
        Some(format!("{prefix}{name}{separator}{rest}}}"))
    }

    /// `skipWhitespaceOrAsterisk`: the indentation text of a line break it crossed.
    fn skip_whitespace_or_asterisk(&mut self) -> String {
        if matches!(self.sc.tok, Tok::Whitespace | Tok::Newline) {
            let mut probe = self.sc.clone();
            let eof = loop {
                probe.next();
                match probe.tok {
                    Tok::Eof => break true,
                    Tok::Whitespace | Tok::Newline => {}
                    _ => break false,
                }
            };
            if eof {
                return String::new();
            }
        }
        let mut preceding_line_break = self.sc.start > 0 && self.sc.s[..self.sc.start].last().is_some_and(|&c| is_line_break(c));
        let mut seen_line_break = false;
        let mut indent_text = String::new();
        while (preceding_line_break && self.sc.tok == Tok::Asterisk) || matches!(self.sc.tok, Tok::Whitespace | Tok::Newline) {
            indent_text.push_str(&self.sc.text());
            if self.sc.tok == Tok::Newline {
                preceding_line_break = true;
                seen_line_break = true;
                indent_text.clear();
            } else if self.sc.tok == Tok::Asterisk {
                preceding_line_break = false;
            }
            self.sc.next();
        }
        if seen_line_break { indent_text } else { String::new() }
    }

    fn skip_whitespace(&mut self) {
        if matches!(self.sc.tok, Tok::Whitespace | Tok::Newline) {
            let mut probe = self.sc.clone();
            let eof = loop {
                probe.next();
                match probe.tok {
                    Tok::Eof => break true,
                    Tok::Whitespace | Tok::Newline => {}
                    _ => break false,
                }
            };
            if eof {
                return;
            }
        }
        while matches!(self.sc.tok, Tok::Whitespace | Tok::Newline) {
            self.sc.next();
        }
    }

    /// `parseTrailingTagComments`.
    fn trailing_comments(&mut self, tag_start: usize, mut margin: usize, indent_text: &str) -> Option<String> {
        if indent_text.is_empty() {
            margin += self.sc.start - tag_start;
        }
        let initial: String = indent_text.chars().skip(margin).collect();
        self.tag_comments(margin, initial)
    }

    /// `parseTagComments`.
    fn tag_comments(&mut self, indent: usize, initial_margin: String) -> Option<String> {
        let mut indent = indent;
        let mut comments: Vec<String> = Vec::new();
        let mut state;
        let mut margin: Option<usize> = None;
        macro_rules! push {
            ($text:expr) => {{
                let t: String = $text;
                if margin.unwrap_or(0) == 0 {
                    margin = Some(indent);
                }
                indent += t.chars().count();
                comments.push(t);
            }};
        }
        if !initial_margin.is_empty() {
            push!(initial_margin);
        }
        state = State::SawAsterisk;
        let mut tok = self.sc.tok;
        loop {
            match tok {
                Tok::Newline => {
                    state = State::BeginningOfLine;
                    comments.push(self.sc.text());
                    indent = 0;
                }
                Tok::At => {
                    self.sc.reset(self.sc.pos - 1);
                    break;
                }
                Tok::Eof => break,
                Tok::Whitespace => {
                    let w = self.sc.text();
                    let n = w.chars().count();
                    if let Some(m) = margin {
                        if indent + n > m {
                            comments.push(w.chars().skip(m.saturating_sub(indent)).collect());
                            state = State::SavingComments;
                        }
                    }
                    indent += n;
                }
                Tok::OpenBrace => {
                    state = State::SavingComments;
                    match self.link() {
                        Some(link) => comments.push(link),
                        None => push!(self.sc.text()),
                    }
                }
                Tok::Backtick => {
                    state = if state == State::SavingBackticks { State::SavingComments } else { State::SavingBackticks };
                    push!(self.sc.text());
                }
                Tok::CommentText => {
                    if state != State::SavingBackticks {
                        state = State::SavingComments;
                    }
                    push!(self.sc.text());
                }
                Tok::Asterisk if state == State::BeginningOfLine => {
                    state = State::SawAsterisk;
                    indent += 1;
                }
                _ => {
                    if state != State::SavingBackticks {
                        state = State::SavingComments;
                    }
                    push!(self.sc.text());
                }
            }
            tok = if matches!(state, State::SavingComments | State::SavingBackticks) {
                self.sc.next_text(state == State::SavingBackticks)
            } else {
                self.sc.next()
            };
        }
        remove_leading_newlines(&mut comments);
        let joined = comments.concat();
        let trimmed = joined.trim_end();
        (!trimmed.is_empty()).then(|| trimmed.to_owned())
    }

    /// A `{…}` type expression: its source text, the scanner on the token after it.
    fn type_expression(&mut self) -> Option<String> {
        self.skip_whitespace_or_asterisk();
        if self.sc.tok != Tok::OpenBrace {
            return None;
        }
        let from = self.sc.start;
        let mut depth = 0usize;
        let mut i = from;
        let s = self.sc.s;
        while i < s.len() {
            match s[i] {
                '{' => depth += 1,
                '}' => {
                    depth -= 1;
                    if depth == 0 {
                        break;
                    }
                }
                _ => {}
            }
            i += 1;
        }
        if i >= s.len() {
            // Unterminated: TypeScript reports an error and carries on from the end.
            self.sc.reset(s.len());
            self.sc.next();
            return Some(s[from..].iter().collect());
        }
        self.sc.reset(i + 1);
        self.sc.next();
        Some(s[from..=i].iter().collect())
    }

    /// `parseJSDocEntityName` for a `@param`: the name's source text.
    fn entity_name(&mut self) -> String {
        let from = self.sc.start;
        let mut end = from;
        if self.sc.tok == Tok::Ident {
            end = self.sc.pos;
            self.sc.next();
        }
        loop {
            if self.sc.tok == Tok::OpenBracket {
                self.sc.next();
                if self.sc.tok == Tok::CloseBracket {
                    end = self.sc.pos;
                    self.sc.next();
                }
            }
            if self.sc.tok == Tok::Dot {
                self.sc.next();
                if self.sc.tok == Tok::Ident {
                    end = self.sc.pos;
                    self.sc.next();
                }
            } else {
                break;
            }
        }
        self.sc.s[from..end.max(from)].iter().collect()
    }

    fn param_tag(&mut self, name: String, tag_start: usize, margin: usize) -> Tag {
        let mut has_type = self.type_expression().is_some();
        let name_first = !has_type;
        self.skip_whitespace_or_asterisk();
        let bracketed = self.sc.tok == Tok::OpenBracket;
        if bracketed {
            self.sc.next();
            self.skip_whitespace();
        }
        let quoted = self.sc.tok == Tok::Backtick;
        if quoted {
            self.sc.next();
        }
        let param = self.entity_name();
        if quoted && self.sc.tok == Tok::Backtick {
            self.sc.next();
        }
        if bracketed {
            self.skip_whitespace();
            while !matches!(self.sc.tok, Tok::CloseBracket | Tok::Eof | Tok::Newline) {
                self.sc.next();
            }
            if self.sc.tok == Tok::CloseBracket {
                self.sc.next();
            }
        }
        let indent_text = self.skip_whitespace_or_asterisk();
        if name_first && !self.link_ahead() {
            has_type = self.type_expression().is_some();
        }
        let _ = has_type;
        let comment = self.trailing_comments(tag_start, margin, &indent_text);
        let text = match &comment {
            Some(c) => format!("{param} {c}"),
            None => param.clone(),
        };
        Tag { name, text: Some(text), comment, param: Some(param) }
    }

    fn link_ahead(&self) -> bool {
        let s = self.sc.s;
        self.sc.tok == Tok::OpenBrace && s.get(self.sc.start + 1) == Some(&'@') && {
            let word: String = s[self.sc.start + 2..].iter().take_while(|c| c.is_alphabetic()).collect();
            matches!(word.as_str(), "link" | "linkcode" | "linkplain")
        }
    }

    /// `parseTag`, with the scanner on the `@`.
    fn tag(&mut self, margin: usize) -> Tag {
        let tag_start = self.sc.start;
        self.sc.next();
        let name = if self.sc.tok == Tok::Ident {
            let n = self.sc.text();
            self.sc.next();
            n
        } else {
            String::new()
        };
        let indent_text = self.skip_whitespace_or_asterisk();
        match name.as_str() {
            "param" | "arg" | "argument" => self.param_tag(name, tag_start, margin),
            "return" | "returns" => {
                self.type_expression();
                let comment = self.trailing_comments(tag_start, margin, &indent_text);
                Tag { name, text: comment.clone(), comment, param: None }
            }
            "type" | "satisfies" | "throws" | "exception" => {
                let ty = self.type_expression();
                let comment = self.trailing_comments(tag_start, margin, &indent_text);
                let text = match (&ty, &comment) {
                    (Some(t), Some(c)) => Some(format!("{t} {c}")),
                    (Some(t), None) => Some(t.clone()),
                    (None, c) => c.clone(),
                };
                Tag { name, text, comment, param: None }
            }
            _ => {
                let comment = self.trailing_comments(tag_start, margin, &indent_text);
                Tag { name, text: comment.clone(), comment, param: None }
            }
        }
    }
}

/// Parse one `/** … */` comment. `column` is where it starts on its line.
pub fn parse(comment: &str, column: usize, resolves: &dyn Fn(&str) -> bool) -> JsDoc {
    let chars: Vec<char> = comment.chars().collect();
    if chars.len() < 5 {
        return JsDoc::default();
    }
    // Between `/**` and `*/`.
    let interior = &chars[3..chars.len() - 2];
    let mut p = Parser { sc: Scan { s: interior, pos: 0, start: 0, tok: Tok::Other }, tags: Vec::new(), resolves };

    let mut state = State::SawAsterisk;
    let mut margin: Option<usize> = None;
    let mut indent = column + 4;
    let mut comments: Vec<String> = Vec::new();
    macro_rules! push {
        ($text:expr) => {{
            let t: String = $text;
            if margin.unwrap_or(0) == 0 {
                margin = Some(indent);
            }
            indent += t.chars().count();
            comments.push(t);
        }};
    }

    p.sc.next();
    while p.sc.tok == Tok::Whitespace {
        p.sc.next();
    }
    if p.sc.tok == Tok::Newline {
        p.sc.next();
        state = State::BeginningOfLine;
        indent = 0;
    }
    loop {
        match p.sc.tok {
            Tok::At => {
                remove_trailing_whitespace(&mut comments);
                let tag = p.tag(indent);
                p.tags.push(tag);
                state = State::BeginningOfLine;
                margin = None;
            }
            Tok::Newline => {
                comments.push(p.sc.text());
                state = State::BeginningOfLine;
                indent = 0;
            }
            Tok::Asterisk => {
                let a = p.sc.text();
                if state == State::SawAsterisk {
                    state = State::SavingComments;
                    push!(a);
                } else {
                    state = State::SawAsterisk;
                    indent += 1;
                }
            }
            Tok::Whitespace => {
                let w = p.sc.text();
                let n = w.chars().count();
                if let Some(m) = margin {
                    if indent + n > m {
                        comments.push(w.chars().skip(m.saturating_sub(indent)).collect());
                    }
                }
                indent += n;
            }
            Tok::Eof => break,
            Tok::CommentText => {
                state = State::SavingComments;
                push!(p.sc.text());
            }
            Tok::OpenBrace => {
                state = State::SavingComments;
                match p.link() {
                    Some(link) => comments.push(link),
                    None => push!(p.sc.text()),
                }
            }
            _ => {
                state = State::SavingComments;
                push!(p.sc.text());
            }
        }
        if state == State::SavingComments {
            p.sc.next_text(false);
        } else {
            p.sc.next();
        }
    }
    JsDoc { comment: comments.concat().trim_end().to_owned(), tags: p.tags }
}

/// The `/** … */` comments TypeScript attaches to the node starting at `at` (`getJSDocCommentRanges`):
/// the last of those in the trivia right before it that come after a line break.
pub fn leading(source: &str, comments: &[Comment], at: u32, resolves: &dyn Fn(&str) -> bool) -> Vec<JsDoc> {
    // Walk back over whitespace and comments from `at` to the previous token.
    let mut chain: Vec<&Comment> = Vec::new();
    let mut end = at as usize;
    loop {
        let before = source[..end].trim_end();
        let Some(c) = comments.iter().find(|c| c.span.end as usize == before.len()) else { break };
        chain.push(c);
        end = c.span.start as usize;
    }
    chain.reverse();
    let mut out = Vec::new();
    let mut seen_newline = false;
    let mut cursor = chain.first().map_or(0, |c| source[..c.span.start as usize].trim_end().len());
    if cursor == 0 {
        // The start of the file: comments there are leading too.
        seen_newline = true;
    }
    for c in chain {
        let gap = &source[cursor..c.span.start as usize];
        seen_newline |= gap.contains('\n') || gap.contains('\r');
        cursor = c.span.end as usize;
        let text = &source[c.span.start as usize..c.span.end as usize];
        if seen_newline && text.starts_with("/**") && !text.starts_with("/**/") {
            let line_start = source[..c.span.start as usize].rfind('\n').map_or(0, |i| i + 1);
            let column = source[line_start..c.span.start as usize].chars().count();
            out.push(parse(text, column, resolves));
        }
    }
    // TypeScript reads the last one (`getJSDocCommentsAndTags`).
    out.pop().into_iter().collect()
}

/// `getDocumentationComment` + `getJsDocTags` over the JSDoc of a symbol's declarations.
pub fn docs(declarations: &[Vec<JsDoc>]) -> Docs {
    let mut parts: Vec<&str> = Vec::new();
    let mut tags = Vec::new();
    for jsdoc in declarations.iter().flatten() {
        if !jsdoc.comment.is_empty() && !parts.contains(&jsdoc.comment.as_str()) {
            parts.push(&jsdoc.comment);
        }
        tags.extend(jsdoc.tags.iter().map(|t| DocsTag { name: t.name.clone(), text: t.text.clone() }));
    }
    Docs { text: parts.join("\n"), tags }
}
