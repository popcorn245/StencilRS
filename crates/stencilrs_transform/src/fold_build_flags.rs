//! Port of Stencil's `foldBuildFlags` (`src/compiler/bundle/build-flags-plugin.ts`): `Build.<flag>`
//! reads, where `Build` is a named import from `@stencil/core`, become `true` / `false` literals,
//! so a bundler can drop the gated branches. Text in, text out: no printer is involved.
//!
//! Replacements are padded to the original length (line breaks kept), so a source map for the
//! input stays valid. Like Stencil's, it is not scope-aware: a `Build` declared anywhere else in
//! the module (a parameter, a local, another import) leaves every read of that name alone, as does
//! any write to a flag. Only top-level named imports count: no namespace import, no `import type`.
//! TypeScript's parser recovers from a syntax error and folds anyway; oxc's does not, so a file
//! that does not parse is left alone.

use std::collections::{HashMap, HashSet};

use fancy_regex::Regex;
use oxc::allocator::Allocator;
use oxc::ast::ast::{
    AssignmentExpression, AssignmentTarget, BindingIdentifier, ChainElement, ComputedMemberExpression, Expression,
    ImportDeclarationSpecifier, ImportOrExportKind, SimpleAssignmentTarget, Statement, StaticMemberExpression, TSInterfaceDeclaration,
    TSTypeAliasDeclaration, TSTypeParameter, UnaryExpression, UnaryOperator, UpdateExpression,
};
use oxc::ast_visit::{Visit, walk};
use oxc::parser::Parser;
use oxc::span::{SourceType, Span};

/// Stencil's cheap pre-check; also decides the oddities (`import D, { Build }` is never folded).
const BUILD_IMPORT: &str = r#"\bimport\s*\{[^}]*\bBuild\b[^}]*\}\s*from\s*['"]@stencil/core"#;
const STENCIL_CORE_IMPORT: &str = r"^@stencil/core(?:/runtime(?:/(?:client(?:/(?:standalone|lazy))?|server))?)?$";

/// Fold the flags in `flags` (name to value). `None` when nothing was folded.
pub fn fold_build_flags(code: &str, file_name: &str, flags: &HashMap<String, bool>) -> Option<String> {
    let build_import = Regex::new(BUILD_IMPORT).ok()?;
    if !build_import.is_match(code).unwrap_or(false) {
        return None;
    }
    let allocator = Allocator::default();
    let parsed = Parser::new(&allocator, code, source_type(file_name)).parse();

    let core = Regex::new(STENCIL_CORE_IMPORT).ok()?;
    let mut specifiers = HashSet::new(); // start of each `Build` import's local name
    let mut locals = HashSet::new();
    for stmt in &parsed.program.body {
        let Statement::ImportDeclaration(import) = stmt else { continue };
        if import.import_kind == ImportOrExportKind::Type || !core.is_match(import.source.value.as_str()).unwrap_or(false) {
            continue;
        }
        for spec in import.specifiers.iter().flatten() {
            if let ImportDeclarationSpecifier::ImportSpecifier(s) = spec
                && s.import_kind != ImportOrExportKind::Type
                && s.imported.name() == "Build"
            {
                specifiers.insert(s.local.span.start);
                locals.insert(s.local.name.to_string());
            }
        }
    }
    if specifiers.is_empty() {
        return None;
    }

    let mut folder = Folder { flags, locals, specifiers, unsafe_locals: HashSet::new(), reads: Vec::new(), writes: HashSet::new(), skip_binding: false };
    folder.visit_program(&parsed.program);
    let unsafe_locals = folder.unsafe_locals;
    let mut reads: Vec<_> = folder.reads.into_iter().filter(|r| !unsafe_locals.contains(&r.local)).collect();
    if reads.is_empty() {
        return None;
    }

    reads.sort_by_key(|r| std::cmp::Reverse(r.span.start));
    let mut out = code.to_string();
    for Read { span, value, .. } in reads {
        let original = &code[span.start as usize..span.end as usize];
        let (head, tail) = original.find(['\r', '\n']).map_or((original, ""), |i| original.split_at(i));
        let text = value.to_string();
        let pad = head.encode_utf16().count().saturating_sub(text.len());
        // JS pads and blanks by UTF-16 code unit.
        let blank: String = tail.chars().flat_map(|c| if c == '\r' || c == '\n' { vec![c] } else { vec![' '; c.len_utf16()] }).collect();
        out.replace_range(span.start as usize..span.end as usize, &format!("{text}{}{blank}", " ".repeat(pad)));
    }
    Some(out)
}

/// Stencil's `getScriptKind`: `.ts`/`.mts`/`.cts` have no JSX, everything else has.
fn source_type(file_name: &str) -> SourceType {
    let name = file_name.rsplit(['/', '\\']).next().unwrap_or(file_name);
    let ext = name.rsplit_once('.').map_or("", |(_, e)| e);
    match ext {
        "tsx" => SourceType::tsx(),
        "ts" | "mts" | "cts" => SourceType::ts(),
        // TypeScript's parser takes type syntax in `.js` too; oxc needs the TSX mode for that.
        _ => SourceType::tsx(),
    }
}

struct Read {
    local: String,
    span: Span,
    value: bool,
}

struct Folder<'f> {
    flags: &'f HashMap<String, bool>,
    locals: HashSet<String>,
    /// Where the `Build` imports' own names start: not a redeclaration.
    specifiers: HashSet<u32>,
    unsafe_locals: HashSet<String>,
    reads: Vec<Read>,
    /// Member expressions that are assigned to, updated or deleted.
    writes: HashSet<Span>,
    /// The next binding identifier names a type, which Stencil does not count as a declaration.
    skip_binding: bool,
}

impl Folder<'_> {
    fn access(&mut self, object: &Expression, flag: &str, span: Span) {
        let Expression::Identifier(id) = object else { return };
        let name = id.name.as_str();
        if !self.locals.contains(name) {
            return;
        }
        if self.writes.contains(&span) {
            self.unsafe_locals.insert(name.to_string());
        } else if let Some(&value) = self.flags.get(flag) {
            self.reads.push(Read { local: name.to_string(), span, value });
        }
    }
}

fn simple_target_span(target: &SimpleAssignmentTarget) -> Option<Span> {
    match target {
        SimpleAssignmentTarget::StaticMemberExpression(m) => Some(m.span),
        SimpleAssignmentTarget::ComputedMemberExpression(m) => Some(m.span),
        _ => None,
    }
}

impl<'a> Visit<'a> for Folder<'_> {
    fn visit_binding_identifier(&mut self, it: &BindingIdentifier<'a>) {
        if std::mem::take(&mut self.skip_binding) {
            return;
        }
        if self.locals.contains(it.name.as_str()) && !self.specifiers.contains(&it.span.start) {
            self.unsafe_locals.insert(it.name.to_string());
        }
    }

    fn visit_ts_type_alias_declaration(&mut self, it: &TSTypeAliasDeclaration<'a>) {
        self.skip_binding = true;
        walk::walk_ts_type_alias_declaration(self, it);
    }

    fn visit_ts_interface_declaration(&mut self, it: &TSInterfaceDeclaration<'a>) {
        self.skip_binding = true;
        walk::walk_ts_interface_declaration(self, it);
    }

    fn visit_ts_type_parameter(&mut self, it: &TSTypeParameter<'a>) {
        self.skip_binding = true;
        walk::walk_ts_type_parameter(self, it);
    }

    fn visit_assignment_expression(&mut self, it: &AssignmentExpression<'a>) {
        match &it.left {
            AssignmentTarget::StaticMemberExpression(m) => self.writes.insert(m.span),
            AssignmentTarget::ComputedMemberExpression(m) => self.writes.insert(m.span),
            _ => false,
        };
        walk::walk_assignment_expression(self, it);
    }

    fn visit_update_expression(&mut self, it: &UpdateExpression<'a>) {
        self.writes.extend(simple_target_span(&it.argument));
        walk::walk_update_expression(self, it);
    }

    fn visit_unary_expression(&mut self, it: &UnaryExpression<'a>) {
        if it.operator == UnaryOperator::Delete {
            let span = match &it.argument {
                Expression::StaticMemberExpression(m) => Some(m.span),
                Expression::ComputedMemberExpression(m) => Some(m.span),
                Expression::ChainExpression(c) => match &c.expression {
                    ChainElement::StaticMemberExpression(m) => Some(m.span),
                    ChainElement::ComputedMemberExpression(m) => Some(m.span),
                    _ => None,
                },
                _ => None,
            };
            self.writes.extend(span);
        }
        walk::walk_unary_expression(self, it);
    }

    fn visit_static_member_expression(&mut self, it: &StaticMemberExpression<'a>) {
        self.access(&it.object, it.property.name.as_str(), it.span);
        walk::walk_static_member_expression(self, it);
    }

    fn visit_computed_member_expression(&mut self, it: &ComputedMemberExpression<'a>) {
        let flag = match &it.expression {
            Expression::StringLiteral(s) => Some(s.value.to_string()),
            Expression::TemplateLiteral(t) if t.expressions.is_empty() && t.quasis.len() == 1 => t.quasis[0].value.cooked.as_ref().map(|c| c.to_string()),
            _ => None,
        };
        if let Some(flag) = flag {
            self.access(&it.object, &flag, it.span);
        }
        walk::walk_computed_member_expression(self, it);
    }
}
