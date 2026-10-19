//! Node binding for stencilrs.

use napi_derive::napi;
use stencilrs_transform::{DEFAULT_CORE_IMPORT_PATH, Jsx, TranspileOptions};

fn to_js<T: serde::Serialize>(value: T) -> napi::Result<serde_json::Value> {
    serde_json::to_value(value).map_err(|e| napi::Error::from_reason(e.to_string()))
}

/// Analyse one component module: `{ components: ComponentMeta[], diagnostics: Diagnostic[] }`.
/// `resolve_imports`: build-accurate metadata (relative imports followed, lib types known).
#[napi]
pub fn analyze(source: String, file_name: String, resolve_imports: Option<bool>) -> napi::Result<serde_json::Value> {
    to_js(stencilrs_transform::analyze_with(&source, &file_name, resolve_imports.unwrap_or(false)))
}

#[napi(object)]
pub struct JsTranspileOptions {
    pub file: String,
    /// Defaults to `@stencil/core/runtime/client/standalone`.
    pub core_import_path: Option<String>,
    /// `"classic"` (h) or `"automatic"` (jsx-runtime). Defaults to automatic.
    pub jsx: Option<String>,
    /// Defaults to `@stencil/core`.
    pub jsx_import_source: Option<String>,
    /// Build-accurate metadata, as a full `stencil build` computes it: follow relative imports and
    /// know lib types. Default false: exactly what single-file `transpileSync` produces.
    pub resolve_imports: Option<bool>,
    /// Return a source map (v3 JSON string) in `map`. Default true, as in `transpileSync`.
    pub source_map: Option<bool>,
    /// Compile the file as base classes for components to extend (Stencil's
    /// `transformAsBaseClass`). Default false.
    pub transform_as_base_class: Option<bool>,
}

/// Generate the `customelement` module: `{ code, map, components, diagnostics, baseClasses }`.
#[napi]
pub fn transpile(source: String, options: JsTranspileOptions) -> napi::Result<serde_json::Value> {
    let jsx = match options.jsx.as_deref() {
        Some("classic") => Jsx::Classic,
        _ => Jsx::Automatic { import_source: options.jsx_import_source.unwrap_or_else(|| "@stencil/core".into()) },
    };
    let opts = TranspileOptions {
        file: options.file,
        core_import_path: options.core_import_path.unwrap_or_else(|| DEFAULT_CORE_IMPORT_PATH.into()),
        jsx,
        resolve_imports: options.resolve_imports.unwrap_or(false),
        source_map: options.source_map.unwrap_or(true),
        transform_as_base_class: options.transform_as_base_class.unwrap_or(false),
    };
    to_js(stencilrs_transform::transpile(&source, &opts))
}

/// Reprint JavaScript through one printer with comments dropped, for comparing outputs.
#[napi]
pub fn normalize(code: String) -> napi::Result<String> {
    stencilrs_transform::normalize(&code).map_err(napi::Error::from_reason)
}

/// Stencil's `scopeCss`: CSS rewritten for a `scoped` component with scope id `scopeId`.
#[napi]
pub fn scope_css(css: String, scope_id: String, comment_original_selector: Option<bool>) -> napi::Result<String> {
    stencilrs_transform::scope_css::scope_css(&css, &scope_id, comment_original_selector.unwrap_or(false))
        .map_err(|e| napi::Error::from_reason(e.0))
}
