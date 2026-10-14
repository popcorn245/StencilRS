//! stencilrs: Stencil v5's component transforms on oxc.
//!
//! The first slice reads Stencil decorators into component metadata. Code generation
//! (the `standalone` output) comes next; see `docs/transformers.md` §5 for the port order.

mod analyze;
mod eval;
pub mod meta;
mod prop_type;

use oxc::allocator::Allocator;
use oxc::parser::Parser;
use oxc::span::SourceType;
use serde::Serialize;

pub use analyze::to_dash_case;
use meta::{ComponentMeta, Diagnostic, Level};

#[derive(Debug, Serialize)]
pub struct AnalyzeResult {
    pub components: Vec<ComponentMeta>,
    pub diagnostics: Vec<Diagnostic>,
}

/// Parse one component module and return the metadata of every `@Component` class in it.
pub fn analyze(source: &str, file_name: &str) -> AnalyzeResult {
    let allocator = Allocator::default();
    let source_type = SourceType::from_path(file_name).unwrap_or_else(|_| SourceType::tsx());
    let parsed = Parser::new(&allocator, source, source_type).parse();

    let mut diagnostics: Vec<Diagnostic> = parsed
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

    let analysis = analyze::analyze_program(&parsed.program, source);
    diagnostics.extend(analysis.diagnostics);
    AnalyzeResult { components: analysis.components, diagnostics }
}
