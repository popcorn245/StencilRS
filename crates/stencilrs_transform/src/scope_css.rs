//! Stencil's `scopeCss` (`src/utils/shadow-css.ts`): the scoped-CSS shim, itself a port of
//! Angular's ShadowCss. Ported line for line, quirks included, since the output must match
//! Stencil byte for byte (`parity/scope-css.mjs` checks it against Stencil's own).
//!
//! JS regexes differ from Rust's in ways that matter here, so the patterns spell them out:
//! `\s` is JS's whitespace set ([`WS`]), `\b` and the `i` flag are ASCII-only, `.` stops at
//! all four JS line terminators, and string replacements expand `$&`, `` $` `` and `$'`.
//! Lookaround needs `fancy-regex`. Three regexes that rescanned the whole stylesheet or
//! compiled once per call are matched by hand instead ([`replace_selector`], [`combinators`],
//! [`ScopeMatcher`]); each says which pattern it stands for.

use std::sync::LazyLock;

use fancy_regex::Regex;

type Captures<'h> = fancy_regex::Captures<'h, str>;

/// CSS Stencil's `scopeCss` would throw on (a literal `%BLOCK%` with no block behind it), or a
/// regex that failed at run time.
#[derive(Debug)]
pub struct ScopeCssError(pub String);

type Result<T> = std::result::Result<T, ScopeCssError>;

/// JS `\s` (and what `String.prototype.trim` strips), as a character-class body.
const WS: &str = r"\t\n\x{0B}\x{0C}\r \x{A0}\x{1680}\x{2000}-\x{200A}\x{2028}\x{2029}\x{202F}\x{205F}\x{3000}\x{FEFF}";
/// JS `.` without the `s` flag.
const DOT: &str = r"[^\n\r\x{2028}\x{2029}]";

const POLYFILL_HOST: &str = "-shadowcsshost";
const POLYFILL_SLOTTED: &str = "-shadowcssslotted";
const POLYFILL_HOST_CONTEXT: &str = "-shadowcsscontext";
const POLYFILL_HOST_NO_COMBINATOR: &str = "-shadowcsshost-no-combinator";
const BLOCK_PLACEHOLDER: &str = "%BLOCK%";

fn is_js_ws(c: char) -> bool {
    matches!(
        c,
        '\t' | '\n' | '\x0B' | '\x0C' | '\r' | ' ' | '\u{A0}' | '\u{1680}' | '\u{2000}'..='\u{200A}'
            | '\u{2028}' | '\u{2029}' | '\u{202F}' | '\u{205F}' | '\u{3000}' | '\u{FEFF}'
    )
}

fn trim(s: &str) -> &str {
    s.trim_matches(is_js_ws)
}

fn trim_end(s: &str) -> &str {
    s.trim_end_matches(is_js_ws)
}

/// Compiles a JS pattern: `\s` becomes JS's whitespace set, inside or outside a class.
fn re(pattern: &str) -> Regex {
    let mut out = String::with_capacity(pattern.len());
    let mut in_class = false;
    let mut chars = pattern.chars().peekable();
    while let Some(c) = chars.next() {
        match c {
            '\\' => {
                let next = chars.next().expect("dangling escape");
                if next == 's' {
                    if in_class {
                        out.push_str(WS);
                    } else {
                        out.push('[');
                        out.push_str(WS);
                        out.push(']');
                    }
                } else {
                    out.push('\\');
                    out.push(next);
                }
            }
            '[' if !in_class => {
                in_class = true;
                out.push(c);
                if chars.peek() == Some(&'^') {
                    out.push(chars.next().unwrap());
                }
            }
            ']' if in_class => {
                in_class = false;
                out.push(c);
            }
            _ => out.push(c),
        }
    }
    // JS has no backtracking limit; a whole stylesheet is one haystack, so lift fancy-regex's.
    fancy_regex::RegexBuilder::new(&out).backtrack_limit(usize::MAX).build().unwrap_or_else(|e| panic!("bad pattern {out}: {e}"))
}

/// An ASCII-only case-insensitive literal (JS's `i` flag without `u` never folds `ſ` to `s`).
fn ci(literal: &str) -> String {
    literal
        .chars()
        .map(|c| if c.is_ascii_alphabetic() { format!("[{}{}]", c.to_ascii_lowercase(), c.to_ascii_uppercase()) } else { c.to_string() })
        .collect()
}

/// JS `escapeRegExpSpecialCharacters`.
fn escape(text: &str) -> String {
    let mut out = String::with_capacity(text.len());
    for c in text.chars() {
        if ".*+?^${}()|[]\\".contains(c) {
            out.push('\\');
        }
        out.push(c);
    }
    out
}

/// JS `str.replace(re, fn)`: every match when `all`, else the first.
fn replace(re: &Regex, hay: &str, all: bool, mut f: impl FnMut(&Captures) -> Result<String>) -> Result<String> {
    let mut out = String::with_capacity(hay.len());
    let mut last = 0;
    for caps in re.captures_iter(hay) {
        let caps = caps.map_err(|e| ScopeCssError(e.to_string()))?;
        let m = caps.get(0).unwrap();
        out.push_str(&hay[last..m.start()]);
        out.push_str(&f(&caps)?);
        last = m.end();
        if !all {
            break;
        }
    }
    out.push_str(&hay[last..]);
    Ok(out)
}

fn replace_all(re: &Regex, hay: &str, f: impl FnMut(&Captures) -> Result<String>) -> Result<String> {
    replace(re, hay, true, f)
}

fn is_match(re: &Regex, hay: &str) -> Result<bool> {
    re.is_match(hay).map_err(|e| ScopeCssError(e.to_string()))
}

/// A capture as JS sees it: `undefined` (unmatched) reads as `""`.
fn group<'h>(caps: &Captures<'h>, i: usize) -> &'h str {
    caps.get(i).map_or("", |m| m.as_str())
}

/// JS `GetSubstitution` for a replacement string with no capture groups: `$$`, `$&`, `` $` `` and `$'`.
fn substitute(replacement: &str, hay: &str, start: usize, end: usize) -> String {
    let mut out = String::with_capacity(replacement.len());
    let mut chars = replacement.chars().peekable();
    while let Some(c) = chars.next() {
        if c != '$' {
            out.push(c);
            continue;
        }
        match chars.peek() {
            Some('$') => out.push('$'),
            Some('&') => out.push_str(&hay[start..end]),
            Some('`') => out.push_str(&hay[..start]),
            Some('\'') => out.push_str(&hay[end..]),
            _ => {
                out.push('$');
                continue;
            }
        }
        chars.next();
    }
    out
}

/// JS `str.replace(needle, replacement)` with a string needle: the first occurrence only.
fn replace_first_str(hay: &str, needle: &str, replacement: &str) -> String {
    match hay.find(needle) {
        Some(i) => format!("{}{}{}", &hay[..i], substitute(replacement, hay, i, i + needle.len()), &hay[i + needle.len()..]),
        None => hay.to_string(),
    }
}

/// JS `"".split(",")` keeps empty pieces, as does `str::split`; this is `split(/\s+/)` on a trimmed string.
fn split_ws(s: &str) -> Vec<&str> {
    let mut out = Vec::new();
    let mut start = 0;
    let mut in_ws = false;
    for (i, c) in s.char_indices() {
        if is_js_ws(c) {
            if !in_ws {
                out.push(&s[start..i]);
                in_ws = true;
            }
        } else if in_ws {
            start = i;
            in_ws = false;
        }
    }
    if !in_ws {
        out.push(&s[start..]);
    }
    out
}

static PART_ATTR_RE: LazyLock<Regex> = LazyLock::new(|| re(r#"(\[\s*part~=\s*("[^"]*"|'[^']*')\s*\])"#));
static ATTR_RE: LazyLock<Regex> = LazyLock::new(|| re(r"(\[[^\]]*\])"));
static NTH_RE: LazyLock<Regex> = LazyLock::new(|| re(r"(:nth-[-A-Za-z0-9_]+)(\([^)]+\))"));
static PART_PH_RE: LazyLock<Regex> = LazyLock::new(|| re(r"__part-([0-9]+)__"));
static PH_RE: LazyLock<Regex> = LazyLock::new(|| re(r"__ph-([0-9]+)__"));

struct SafeSelector {
    content: String,
    placeholders: Vec<String>,
}

fn safe_selector(selector: &str) -> Result<SafeSelector> {
    let mut placeholders = Vec::new();
    let selector = replace_all(&PART_ATTR_RE, selector, |c| {
        placeholders.push(group(c, 1).to_string());
        Ok(format!("__part-{}__", placeholders.len() - 1))
    })?;
    let selector = replace_all(&ATTR_RE, &selector, |c| {
        placeholders.push(group(c, 1).to_string());
        Ok(format!("__ph-{}__", placeholders.len() - 1))
    })?;
    let content = replace_all(&NTH_RE, &selector, |c| {
        placeholders.push(group(c, 2).to_string());
        Ok(format!("{}__ph-{}__", group(c, 1), placeholders.len() - 1))
    })?;
    Ok(SafeSelector { content, placeholders })
}

fn restore_safe_selector(placeholders: &[String], content: &str) -> Result<String> {
    // `placeholders[+index]` is `undefined` for a stray `__ph-9__` in the source.
    let lookup = |c: &Captures| {
        Ok(group(c, 1).parse::<usize>().ok().and_then(|i| placeholders.get(i)).map_or("undefined", |s| s.as_str()).to_string())
    };
    let content = replace_all(&PART_PH_RE, content, lookup)?;
    replace_all(&PH_RE, &content, lookup)
}

/// `(-shadowcsshost)(?:\((...)\))?([^,{]*)` and its siblings, with the `gim` flags.
fn colon_rule_re(polyfill: &str) -> Regex {
    re(&format!(r"({})(?:\(((?:\([^)(]*\)|[^)(]*)+?)\))?([^,{{]*)", ci(polyfill)))
}

static CSS_COLON_HOST_RE: LazyLock<Regex> = LazyLock::new(|| colon_rule_re(POLYFILL_HOST));
static CSS_COLON_HOST_CONTEXT_RE: LazyLock<Regex> = LazyLock::new(|| colon_rule_re(POLYFILL_HOST_CONTEXT));
static CSS_COLON_SLOTTED_RE: LazyLock<Regex> = LazyLock::new(|| colon_rule_re(POLYFILL_SLOTTED));
static POLYFILL_HOST_NO_COMBINATOR_RE: LazyLock<Regex> = LazyLock::new(|| re(r"-shadowcsshost-no-combinator([^\s]*)"));
static POLYFILL_HOST_RE: LazyLock<Regex> = LazyLock::new(|| re(&ci(POLYFILL_HOST)));
static SAFE_PART_RE: LazyLock<Regex> = LazyLock::new(|| re(r"__part-([0-9]+)__"));

/// `str.replace(createSupportsRuleRe(selector), "$1" + polyfill)`, without the regex.
///
/// The pattern is `(^|[^@]|@(?!supports\s+selector\s*\([^{]*?SEL\b))(SEL\b)`. Its `@supports`
/// guard can never fire: `SEL` has to follow the `@` directly, so the lookahead never sees
/// `supports` (the `@supports selector(...)` placeholders do that job). What is left: `SEL`
/// not followed by an ASCII word character, whose preceding character (`$1`, put back
/// unchanged) the previous match did not consume. That last rule skips `SEL` written twice
/// in a row. A backtracking regex over a whole stylesheet was the slowest step by far.
fn replace_selector(css: &str, selector: &str, polyfill: &str) -> String {
    let mut out = String::with_capacity(css.len());
    let mut last = 0;
    for (i, _) in css.match_indices(selector) {
        let end = i + selector.len();
        if css[end..].starts_with(|c: char| c.is_ascii_alphanumeric() || c == '_') {
            continue;
        }
        if i > 0 && i - css[..i].chars().next_back().map_or(0, char::len_utf8) < last {
            continue;
        }
        out.push_str(&css[last..i]);
        out.push_str(polyfill);
        last = end;
    }
    out.push_str(&css[last..]);
    out
}

static SUPPORTS_SELECTOR_RE: LazyLock<Regex> = LazyLock::new(|| re(r"@supports\s+selector\s*\(\s*([^)]*)\s*\)"));
static COMMENT_RE: LazyLock<Regex> = LazyLock::new(|| re(r"/\*\s*(?s:.)*?\*/"));
static COMMENT_WITH_HASH_RE: LazyLock<Regex> = LazyLock::new(|| re(r"/\*\s*#\s*source(Mapping)?URL=(?s:.)+?\*/"));
static RULE_RE: LazyLock<Regex> = LazyLock::new(|| re(r"(\s*)([^;{}]+?)(\s*)((?:\{%BLOCK%\}?\s*;?)|(?:\s*;))"));
static SELECTOR_PARTS_RE: LazyLock<Regex> = LazyLock::new(|| re(&format!(r"(^{DOT}*?[^\\])??((:+)({DOT}*)|$)")));
static IS_ATTR_RE: LazyLock<Regex> = LazyLock::new(|| re(r"\[is=([^\]]*)\]"));
static MULTI_WS_RE: LazyLock<Regex> = LazyLock::new(|| re(r"\s{2,}"));
static STAR_RE: LazyLock<Regex> = LazyLock::new(|| re(r">\s*\*\s+([^{, ]+)"));
static PART_SELECTOR_RE: LazyLock<Regex> =
    LazyLock::new(|| re(r"([^\s,{][^,{]*?)::part\(\s*([^)]+?)\s*\)((?:[:.][^,{]*)*)"));

struct Rule {
    selector: String,
    /// `None` is JS's `undefined`: a `%BLOCK%` written in the source has no block behind it.
    content: Option<String>,
}

/// Recursing into `undefined` content throws a TypeError in Stencil.
fn block(content: &Option<String>) -> Result<&str> {
    content.as_deref().ok_or_else(|| ScopeCssError("stray %BLOCK% in the stylesheet".into()))
}

fn process_rules(input: &str, mut callback: impl FnMut(Rule) -> Result<Rule>) -> Result<String> {
    let (escaped, blocks) = escape_blocks(input);
    let mut next_block = 0;
    replace_all(&RULE_RE, &escaped, |m| {
        let mut content = Some(String::new());
        let mut suffix = group(m, 4);
        let mut content_prefix = "";
        if suffix.starts_with("{%BLOCK%") {
            content = blocks.get(next_block).cloned();
            next_block += 1;
            suffix = &suffix[8..];
            content_prefix = "{";
        }
        let rule = callback(Rule { selector: group(m, 2).to_string(), content })?;
        let content = rule.content.as_deref().unwrap_or("undefined");
        Ok(format!("{}{}{}{}{}{}", group(m, 1), rule.selector, group(m, 3), content_prefix, content, suffix))
    })
}

/// `input.split(/([{}])/)`: the pieces between braces (empty ones included) and the braces.
fn split_curly(input: &str) -> Vec<&str> {
    let mut parts = Vec::new();
    let mut last = 0;
    for (i, c) in input.char_indices() {
        if c == '{' || c == '}' {
            parts.push(&input[last..i]);
            parts.push(&input[i..i + 1]);
            last = i + 1;
        }
    }
    parts.push(&input[last..]);
    parts
}

fn escape_blocks(input: &str) -> (String, Vec<String>) {
    let mut result = String::with_capacity(input.len());
    let mut blocks = Vec::new();
    let mut bracket_count = 0i32;
    let mut current: Vec<&str> = Vec::new();
    for part in split_curly(input) {
        if part == "}" {
            bracket_count -= 1;
        }
        if bracket_count > 0 {
            current.push(part);
        } else {
            if !current.is_empty() {
                blocks.push(current.concat());
                result.push_str(BLOCK_PLACEHOLDER);
                current.clear();
            }
            result.push_str(part);
        }
        if part == "{" {
            bracket_count += 1;
        }
    }
    if !current.is_empty() {
        blocks.push(current.concat());
        result.push_str(BLOCK_PLACEHOLDER);
    }
    (result, blocks)
}

fn insert_polyfill_host_in_css_text(css: &str) -> Result<String> {
    let mut supports_blocks = Vec::new();
    let css = replace_all(&SUPPORTS_SELECTOR_RE, css, |c| {
        supports_blocks.push(group(c, 1).to_string());
        Ok(format!("@supports selector(__supports_{}__)", supports_blocks.len() - 1))
    })?;
    let css = replace_selector(&css, ":host-context", POLYFILL_HOST_CONTEXT);
    let css = replace_selector(&css, ":host", POLYFILL_HOST);
    let mut css = replace_selector(&css, "::slotted", POLYFILL_SLOTTED);
    for (i, original) in supports_blocks.iter().enumerate() {
        css = replace_first_str(&css, &format!("__supports_{i}__"), original);
    }
    Ok(css)
}

fn convert_colon_rule(css: &str, re: &Regex, part_replacer: fn(&str, &str, &str) -> String) -> Result<String> {
    replace_all(re, css, |m| {
        let suffix = group(m, 3);
        if !group(m, 2).is_empty() {
            let mut r = Vec::new();
            for p in group(m, 2).split(',') {
                let p = trim(p);
                if p.is_empty() {
                    break;
                }
                r.push(part_replacer(POLYFILL_HOST_NO_COMBINATOR, p, suffix));
            }
            Ok(r.join(","))
        } else {
            Ok(format!("{POLYFILL_HOST_NO_COMBINATOR}{suffix}"))
        }
    })
}

fn colon_host_part_replacer(host: &str, part: &str, suffix: &str) -> String {
    format!("{host}{}{suffix}", part.replacen(POLYFILL_HOST, "", 1))
}

fn colon_host_context_part_replacer(host: &str, part: &str, suffix: &str) -> String {
    if part.contains(POLYFILL_HOST) {
        colon_host_part_replacer(host, part, suffix)
    } else {
        format!("{host}{part}{suffix}, {part} {host}{suffix}")
    }
}

struct SlottedSelector {
    org_selector: String,
    updated_selector: String,
}

fn convert_colon_slotted(css: &str, slot_scope_id: &str) -> Result<(String, Vec<SlottedSelector>)> {
    let slot_class = format!(".{slot_scope_id} > ");
    let mut selectors = Vec::new();
    let css = replace_all(&CSS_COLON_SLOTTED_RE, css, |m| {
        let suffix = group(m, 3);
        if group(m, 2).is_empty() {
            return Ok(format!("{POLYFILL_HOST_NO_COMBINATOR}{suffix}"));
        }
        let compound = trim(group(m, 2));
        let slotted_selector = format!("{slot_class}{compound}{suffix}");
        let offset = m.get(0).unwrap().start();
        let prefix_start = css[..offset].rfind(['}', ',']).map_or(0, |i| i + 1);
        let prefix_selector = &css[prefix_start..offset];
        let org_selector = trim(&format!("{prefix_selector}{slotted_selector}")).to_string();
        let added_selector = trim(&format!("{}{}", trim_end(prefix_selector), trim(&slotted_selector))).to_string();
        if org_selector != added_selector {
            let updated_selector = format!("{added_selector}, {org_selector}");
            selectors.push(SlottedSelector { org_selector, updated_selector });
        }
        Ok(slotted_selector)
    })?;
    Ok((css, selectors))
}

fn convert_shadow_dom_selectors(css: &str) -> String {
    css.replace("::shadow", " ").replace("::content", " ")
}

fn is_line_terminator(c: char) -> bool {
    matches!(c, '\n' | '\r' | '\u{2028}' | '\u{2029}')
}

/// `makeScopeMatcher(scope).test(selector)`: is the selector already scoped?
enum ScopeMatcher {
    /// The usual scope id, where the only regex syntax is `.` (any character). Matched by
    /// hand: compiling a regex per stylesheet cost more than scoping a small one.
    Literal(Vec<Option<char>>),
    Regex(Regex),
}

impl ScopeMatcher {
    fn new(scope_selector: &str) -> Self {
        if !scope_selector.contains(|c: char| "*+?^${}()|\\".contains(c)) {
            return Self::Literal(scope_selector.chars().map(|c| (c != '.').then_some(c)).collect());
        }
        let scope_selector = scope_selector.replace('[', "\\[").replace(']', "\\]");
        // The JS `m` flag: `^` and `$` also match at JS's line terminators.
        Self::Regex(re(&format!(
            r"(?:^|(?<=[\n\r\x{{2028}}\x{{2029}}]))({scope_selector})([>\s~+\[.,{{:](?s:.)*)?(?=[\n\r\x{{2028}}\x{{2029}}]|\z)"
        )))
    }

    fn test(&self, selector: &str) -> Result<bool> {
        let pattern = match self {
            Self::Regex(re) => return is_match(re, selector),
            Self::Literal(pattern) => pattern,
        };
        // `^(SCOPE)([>\s~+[.,{:][\s\S]*)?$` at the start of any line.
        let line_starts = std::iter::once(0).chain(selector.char_indices().filter(|&(_, c)| is_line_terminator(c)).map(|(i, c)| i + c.len_utf8()));
        Ok(line_starts.into_iter().any(|start| {
            let mut rest = selector[start..].chars();
            let scoped = pattern.iter().all(|p| rest.next().is_some_and(|c| p.map_or(!is_line_terminator(c), |p| p == c)));
            scoped
                && match rest.next() {
                    None => true,
                    Some(c) => is_line_terminator(c) || is_js_ws(c) || ">~+[.,{:".contains(c),
                }
        }))
    }
}

fn inject_scoping_selector(selector: &str, scoping_selector: &str) -> Result<String> {
    replace(&SELECTOR_PARTS_RE, selector, false, |m| {
        Ok(format!("{}{scoping_selector}{}{}", group(m, 1), group(m, 3), group(m, 4)))
    })
}

fn apply_simple_selector_scope(selector: &str, scope_selector: &str, host_selector: &str) -> Result<String> {
    if is_match(&POLYFILL_HOST_RE, selector)? {
        let replace_by = format!(".{host_selector}");
        let selector = replace(&POLYFILL_HOST_NO_COMBINATOR_RE, selector, false, |m| inject_scoping_selector(group(m, 1), &replace_by))?;
        return replace_all(&POLYFILL_HOST_RE, &selector, |_| Ok(format!("{replace_by} ")));
    }
    Ok(format!("{scope_selector} {selector}"))
}

/// The matches of `/( |>|\+|~(?!=))(?=(?:[^()]*\([^()]*\))*[^()]*$)\s*/g` as (start,
/// combinator, end), without the regex: a combinator outside parentheses, where "outside"
/// means the rest of the selector is unnested `(...)` groups. The lookahead rescans to the
/// end at every combinator, so this decides it for every position in one backwards pass.
fn combinators(selector: &str) -> Vec<(usize, &str, usize)> {
    // `outside[i]`: does `selector[i..]` match `(?:[^()]*\([^()]*\))*[^()]*$`? Read backwards,
    // that is two states: between groups, or inside one.
    let mut outside = vec![false; selector.len() + 1];
    let (mut between, mut dead) = (true, false);
    outside[selector.len()] = true;
    for (i, c) in selector.char_indices().rev() {
        match c {
            ')' if between => between = false,
            '(' if !between => between = true,
            '(' | ')' => dead = true,
            _ => {}
        }
        outside[i] = !dead && between;
    }
    let mut out = Vec::new();
    let mut chars = selector.char_indices().peekable();
    while let Some((i, c)) = chars.next() {
        let is_sep = match c {
            ' ' | '>' | '+' => true,
            '~' => chars.peek().is_none_or(|&(_, n)| n != '='),
            _ => false,
        };
        if !is_sep || !outside[i + 1] {
            continue;
        }
        let mut end = i + 1;
        while let Some(&(j, n)) = chars.peek() {
            if !is_js_ws(n) {
                break;
            }
            end = j + n.len_utf8();
            chars.next();
        }
        out.push((i, &selector[i..i + 1], end));
    }
    out
}

fn apply_strict_selector_scope(selector: &str, scope_selector: &str, host_selector: &str) -> Result<String> {
    let scope_selector = replace_all(&IS_ATTR_RE, scope_selector, |m| Ok(group(m, 1).to_string()))?;
    let class_name = format!(".{scope_selector}");
    let scope_selector_part = |p: &str| -> Result<String> {
        let mut scoped_p = trim(p).to_string();
        if scoped_p.is_empty() {
            return Ok(String::new());
        }
        if p.contains(POLYFILL_HOST_NO_COMBINATOR) {
            scoped_p = apply_simple_selector_scope(p, &scope_selector, host_selector)?;
        } else {
            let t = replace_all(&POLYFILL_HOST_RE, p, |_| Ok(String::new()))?;
            if !t.is_empty() {
                scoped_p = inject_scoping_selector(&t, &class_name)?;
            }
        }
        Ok(scoped_p)
    };
    let safe = safe_selector(selector)?;
    let selector = safe.content.as_str();
    let mut scoped_selector = String::new();
    let mut start = 0;
    let mut should_scope = !selector.contains(POLYFILL_HOST_NO_COMBINATOR);
    for (sep_start, separator, sep_end) in combinators(selector) {
        let part = trim(&selector[start..sep_start]);
        should_scope = should_scope || part.contains(POLYFILL_HOST_NO_COMBINATOR);
        let scoped_part = if should_scope { scope_selector_part(part)? } else { part.to_string() };
        scoped_selector.push_str(&format!("{scoped_part} {separator} "));
        start = sep_end;
    }
    let part = &selector[start..];
    should_scope = !is_match(&SAFE_PART_RE, part)? && (should_scope || part.contains(POLYFILL_HOST_NO_COMBINATOR));
    scoped_selector.push_str(&if should_scope { scope_selector_part(part)? } else { part.to_string() });
    restore_safe_selector(&safe.placeholders, &scoped_selector)
}

fn scope_selector(selector: &str, scope_matcher: &ScopeMatcher, scope_selector_text: &str, host_selector: &str, slot_selector: &str) -> Result<String> {
    let slot_class = format!(".{slot_selector}");
    let parts = selector
        .split(',')
        .map(|shallow_part| {
            if !slot_selector.is_empty() && shallow_part.contains(&slot_class) {
                Ok(trim(shallow_part).to_string())
            } else if !scope_matcher.test(shallow_part)? {
                Ok(trim(&apply_strict_selector_scope(shallow_part, scope_selector_text, host_selector)?).to_string())
            } else {
                Ok(trim(shallow_part).to_string())
            }
        })
        .collect::<Result<Vec<_>>>()?;
    Ok(parts.join(", "))
}

fn is_scopable_at_rule(selector: &str) -> bool {
    ["@media", "@supports", "@page", "@document", "@layer", "@container"].iter().any(|p| selector.starts_with(p))
}

fn scope_selectors(css: &str, scope_matcher: &ScopeMatcher, scope_selector_text: &str, host_selector: &str, slot_selector: &str) -> Result<String> {
    process_rules(css, |rule| {
        let mut selector = rule.selector.clone();
        let mut content = rule.content;
        if !rule.selector.starts_with('@') {
            selector = scope_selector(&rule.selector, scope_matcher, scope_selector_text, host_selector, slot_selector)?;
        } else if is_scopable_at_rule(&rule.selector) {
            content = Some(scope_selectors(block(&content)?, scope_matcher, scope_selector_text, host_selector, slot_selector)?);
        }
        let selector = trim(&replace_all(&MULTI_WS_RE, &selector, |_| Ok(" ".into()))?).to_string();
        Ok(Rule { selector, content })
    })
}

fn replace_shadow_css_host(css: &str, host_scope_id: &str) -> String {
    css.replace(POLYFILL_HOST_NO_COMBINATOR, &format!(".{host_scope_id}"))
}

fn scope_css_text(css: &str, scope_id: &str, host_scope_id: &str, slot_scope_id: &str) -> Result<(String, Vec<SlottedSelector>)> {
    let css = insert_polyfill_host_in_css_text(css)?;
    let css = convert_colon_rule(&css, &CSS_COLON_HOST_RE, colon_host_part_replacer)?;
    let css = convert_colon_rule(&css, &CSS_COLON_HOST_CONTEXT_RE, colon_host_context_part_replacer)?;
    let (css, slotted) = convert_colon_slotted(&css, slot_scope_id)?;
    let mut css = convert_shadow_dom_selectors(&css);
    if !scope_id.is_empty() {
        css = scope_selectors(&css, &ScopeMatcher::new(scope_id), scope_id, host_scope_id, slot_scope_id)?;
    }
    let css = replace_shadow_css_host(&css, host_scope_id);
    let css = replace_all(&STAR_RE, &css, |m| Ok(format!(" {} ", group(m, 1))))?;
    let slotted = slotted
        .into_iter()
        .map(|s| SlottedSelector {
            org_selector: replace_shadow_css_host(&s.org_selector, host_scope_id),
            updated_selector: replace_shadow_css_host(&s.updated_selector, host_scope_id),
        })
        .collect();
    Ok((trim(&css).to_string(), slotted))
}

/// `selector::part(a b)` also matches `selector [part~="a"][part~="b"]`.
fn expand_part_selectors(css: &str) -> Result<String> {
    process_rules(css, |mut rule| {
        if rule.selector.starts_with('@') {
            return Ok(rule);
        }
        let parts = rule
            .selector
            .split(',')
            .map(|sel| {
                let mut out = vec![trim(sel).to_string()];
                if !sel.contains("::part(") {
                    return Ok(trim(sel).to_string());
                }
                for m in PART_SELECTOR_RE.captures_iter(sel) {
                    let m = m.map_err(|e| ScopeCssError(e.to_string()))?;
                    let before = trim_end(group(&m, 1));
                    let part_attr: String = split_ws(trim(group(&m, 2)))
                        .into_iter()
                        .map(|p| format!("[part~=\"{p}\"]"))
                        .filter(|attr| !rule.selector.contains(attr.as_str()))
                        .collect();
                    let expanded = format!("{before} {part_attr}{}", group(&m, 3));
                    if !part_attr.is_empty() && expanded != trim(sel) {
                        out.push(expanded);
                    }
                }
                Ok(out.join(", "))
            })
            .collect::<Result<Vec<_>>>()?;
        rule.selector = parts.join(", ");
        Ok(rule)
    })
}

/// Stencil's `scopeCss(cssText, scopeId, commentOriginalSelector)`. The compiler passes
/// `false`; the runtime passes `true` for shadow components it has to scope instead.
pub fn scope_css(css: &str, scope_id: &str, comment_original_selector: bool) -> std::result::Result<String, ScopeCssError> {
    let host_scope_id = format!("{scope_id}-h");
    let slot_scope_id = format!("{scope_id}-s");
    let comments_with_hash: Vec<&str> = COMMENT_WITH_HASH_RE
        .find_iter(css)
        .map(|m| m.map(|m| m.as_str()).map_err(|e| ScopeCssError(e.to_string())))
        .collect::<Result<_>>()?;
    let mut css = replace_all(&COMMENT_RE, css, |_| Ok(String::new()))?;
    let mut org_selectors: Vec<(String, String)> = Vec::new();
    if comment_original_selector {
        fn comment_selectors(input: &str, org: &mut Vec<(String, String)>) -> Result<String> {
            process_rules(input, |mut rule| {
                if !rule.selector.starts_with('@') {
                    let placeholder = format!("/*!@___{}___*/", org.len());
                    org.push((placeholder.clone(), format!("/*!@{}*/", rule.selector)));
                    rule.selector = format!("{placeholder}{}", rule.selector);
                } else if is_scopable_at_rule(&rule.selector) {
                    rule.content = Some(comment_selectors(block(&rule.content)?, org)?);
                }
                Ok(rule)
            })
        }
        css = comment_selectors(&css, &mut org_selectors)?;
    }
    let (scoped, slotted) = scope_css_text(&css, scope_id, &host_scope_id, &slot_scope_id)?;
    let mut css = std::iter::once(scoped.as_str()).chain(comments_with_hash).collect::<Vec<_>>().join("\n");
    for (placeholder, comment) in &org_selectors {
        css = replace_first_str(&css, placeholder, comment);
    }
    for s in &slotted {
        let re = re(&format!(r"{}(?=\s*[,{{]|$)", escape(&s.org_selector)));
        let hay = css.clone();
        css = replace_all(&re, &hay, |m| {
            let whole = m.get(0).unwrap();
            Ok(substitute(&s.updated_selector, &hay, whole.start(), whole.end()))
        })?;
    }
    expand_part_selectors(&css)
}

/// Stencil's `getScopeId`: `sc-` + tag, plus `-mode` for a named mode.
pub fn scope_id(tag: &str, mode: Option<&str>) -> String {
    match mode {
        Some(m) if !m.is_empty() && m != "$" => format!("sc-{tag}-{m}"),
        _ => format!("sc-{tag}"),
    }
}
