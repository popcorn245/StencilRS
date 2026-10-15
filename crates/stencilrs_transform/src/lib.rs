//! stencilrs: Stencil v5's component transforms on oxc.
//!
//! `analyze` reads Stencil decorators into component metadata; `transpile` also generates
//! the `customelement` module (what `transpileSync` emits for `@stencil/unplugin`).
//! See `docs/transformers.md` §5 for the port order.

mod analyze;
pub mod codegen;
mod default_value;
mod edits;
mod eval;
mod locals;
pub mod meta;
mod prop_type;
mod resolve;
mod sourcemap;

use oxc::allocator::Allocator;
use oxc::parser::{ParserReturn, Parser};
use oxc::span::SourceType;
use serde::Serialize;

pub use analyze::to_dash_case;
pub use codegen::{CodegenOptions2 as TranspileOptions, DEFAULT_CORE_IMPORT_PATH, Jsx, normalize};
use meta::{ComponentMeta, Diagnostic, Level};

#[derive(Debug, Serialize)]
pub struct AnalyzeResult {
    pub components: Vec<ComponentMeta>,
    pub diagnostics: Vec<Diagnostic>,
}

#[derive(Debug, Serialize)]
pub struct TranspileResult {
    pub code: String,
    /// Source map v3 JSON from `code` to the original source, when `source_map` was asked for.
    pub map: Option<String>,
    pub components: Vec<ComponentMeta>,
    pub diagnostics: Vec<Diagnostic>,
}

fn parse<'a>(allocator: &'a Allocator, source: &'a str, file_name: &str) -> (ParserReturn<'a>, Vec<Diagnostic>) {
    let source_type = SourceType::from_path(file_name).unwrap_or_else(|_| SourceType::tsx()).with_module(true);
    let parsed = Parser::new(allocator, source, source_type).parse();
    let diagnostics = parsed
        .diagnostics
        .errors()
        .map(|e| {
            let (start, end) = e
                .labels
                .first()
                .map(|l| (l.offset() as u32, (l.offset() + l.len()) as u32))
                .unwrap_or((0, 0));
            Diagnostic { level: Level::Error, message: e.message.to_string(), start, end }
        })
        .collect();
    (parsed, diagnostics)
}

/// Parse one component module and return the metadata of every `@Component` class in it,
/// as Stencil's single-file `transpileSync` sees it.
pub fn analyze(source: &str, file_name: &str) -> AnalyzeResult {
    analyze_with(source, file_name, false)
}

/// `analyze`, optionally build-accurate: relative imports followed, lib types known, as a full
/// `stencil build` sees the component.
pub fn analyze_with(source: &str, file_name: &str, resolve_imports: bool) -> AnalyzeResult {
    let allocator = Allocator::default();
    let (parsed, mut diagnostics) = parse(&allocator, source, file_name);
    let resolver = resolve_imports.then(resolve::Resolver::new);
    let analysis = analyze::analyze_program(&parsed.program, source, resolver.as_ref(), file_name);
    diagnostics.extend(analysis.diagnostics);
    AnalyzeResult { components: analysis.components, diagnostics }
}

/// Analyse one component module and generate its `customelement` code.
pub fn transpile(source: &str, opts: &TranspileOptions) -> TranspileResult {
    let allocator = Allocator::default();
    let (parsed, mut diagnostics) = parse(&allocator, source, &opts.file);
    let resolver = opts.resolve_imports.then(resolve::Resolver::new);
    let analysis = analyze::analyze_program(&parsed.program, source, resolver.as_ref(), &opts.file);
    diagnostics.extend(analysis.diagnostics);
    let (code, map) = match codegen::generate(&parsed.program, source, &analysis.components, opts) {
        Ok(generated) => (generated.code, generated.map),
        Err(message) => {
            diagnostics.push(Diagnostic { level: Level::Error, message, start: 0, end: 0 });
            (String::new(), None)
        }
    };
    TranspileResult { code, map, components: analysis.components, diagnostics }
}
