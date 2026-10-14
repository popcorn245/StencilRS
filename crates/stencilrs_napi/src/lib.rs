//! Node binding for stencilrs.

use napi_derive::napi;
use stencilrs_transform::{DEFAULT_CORE_IMPORT_PATH, Jsx, TranspileOptions};

fn to_js<T: serde::Serialize>(value: T) -> napi::Result<serde_json::Value> {
    serde_json::to_value(value).map_err(|e| napi::Error::from_reason(e.to_string()))
}

/// Analyse one component module: `{ components: ComponentMeta[], diagnostics: Diagnostic[] }`.
#[napi]
pub fn analyze(source: String, file_name: String) -> napi::Result<serde_json::Value> {
    to_js(stencilrs_transform::analyze(&source, &file_name))
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
}

/// Generate the `customelement` module: `{ code, components, diagnostics }`.
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
    };
    to_js(stencilrs_transform::transpile(&source, &opts))
}

/// Reprint JavaScript through one printer with comments dropped, for comparing outputs.
#[napi]
pub fn normalize(code: String) -> napi::Result<String> {
    stencilrs_transform::normalize(&code).map_err(napi::Error::from_reason)
}
