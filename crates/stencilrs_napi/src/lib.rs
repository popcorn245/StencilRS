//! Node binding for stencilrs.

use napi_derive::napi;

/// Analyse one component module: `{ components: ComponentMeta[], diagnostics: Diagnostic[] }`.
#[napi]
pub fn analyze(source: String, file_name: String) -> napi::Result<serde_json::Value> {
    let result = stencilrs_transform::analyze(&source, &file_name);
    serde_json::to_value(result).map_err(|e| napi::Error::from_reason(e.to_string()))
}
