//! Node binding for stencilrs.

use std::sync::atomic::{AtomicUsize, Ordering};

use napi::bindgen_prelude::{AsyncTask, Env, Task};
use napi_derive::napi;
use stencilrs_transform::{ComponentExport, ComponentMetadata, DEFAULT_CORE_IMPORT_PATH, Jsx, SSR_CORE_IMPORT_PATH, TranspileOptions};

#[cfg(not(all(target_os = "linux", target_arch = "aarch64")))]
#[global_allocator]
static GLOBAL: mimalloc_safe::MiMalloc = mimalloc_safe::MiMalloc;

/// The result as one JSON string, which `index.js` parses: far cheaper than napi building the
/// JS objects property by property from a `serde_json::Value`.
fn to_js<T: serde::Serialize>(value: T) -> napi::Result<String> {
    serde_json::to_string(&value).map_err(|e| napi::Error::from_reason(e.to_string()))
}

/// Analyse one component module: `{ components: ComponentMeta[], diagnostics: Diagnostic[] }`.
/// `resolve_imports`: build-accurate metadata (relative imports followed, lib types known).
#[napi]
/// `complex_types`: a type `complexType` cannot be computed for is reported as not ported.
pub fn analyze(source: String, file_name: String, resolve_imports: Option<bool>, complex_types: Option<bool>) -> napi::Result<String> {
    to_js(stencilrs_transform::analyze_with(&source, &file_name, resolve_imports.unwrap_or(false), complex_types.unwrap_or(false)))
}

#[napi(object)]
pub struct JsTranspileOptions {
    pub file: String,
    /// Defaults to `@stencil/core/runtime/client/standalone`, or `@stencil/core/runtime/server`
    /// for `componentExport: "ssr"`.
    pub core_import_path: Option<String>,
    /// `"classic"` (h) or `"automatic"` (jsx-runtime). Defaults to automatic.
    pub jsx: Option<String>,
    /// Defaults to `@stencil/core`.
    pub jsx_import_source: Option<String>,
    /// Build-accurate metadata, as a full `stencil build` computes it: follow relative imports and
    /// know lib types. Default false: exactly what single-file `transpileSync` produces.
    pub resolve_imports: Option<bool>,
    /// Report a prop, event or method whose `complexType` cannot be computed as not ported
    /// (`stencilrs:` error). Default false.
    pub complex_types: Option<bool>,
    /// Return a source map (v3 JSON string) in `map`. Default true, as in `transpileSync`.
    pub source_map: Option<bool>,
    /// Compile the file as base classes for components to extend (Stencil's
    /// `transformAsBaseClass`). Default false.
    pub transform_as_base_class: Option<bool>,
    /// The output to generate, as Stencil's `componentExport`: `"customelement"` (default),
    /// `"module"`, `"lazy"` (the lazy-loading `loader-bundle` shape, `null` in Stencil) or `"ssr"`
    /// (the hydrate / server-side rendering shape).
    pub component_export: Option<String>,
    /// `"compilerstatic"`: add `static get COMPILER_META()` to each component, as Stencil's
    /// `componentMetadata`. Default none.
    pub component_metadata: Option<String>,
    /// Import and attach the component's styles. Default true; false is Stencil's `style: null`.
    pub emit_styles: Option<bool>,
}

impl JsTranspileOptions {
    /// The compiler's options, or why they are invalid.
    fn into_options(self) -> napi::Result<TranspileOptions> {
        let jsx = match self.jsx.as_deref() {
            Some("classic") => Jsx::Classic,
            _ => Jsx::Automatic { import_source: self.jsx_import_source.unwrap_or_else(|| "@stencil/core".into()) },
        };
        let component_export = match self.component_export.as_deref().map(|e| e.trim().to_lowercase()).as_deref() {
            None | Some("customelement") => ComponentExport::CustomElement,
            Some("module") => ComponentExport::Module,
            Some("lazy") => ComponentExport::Lazy,
            Some("ssr") => ComponentExport::Ssr,
            Some(other) => {
                return Err(napi::Error::from_reason(format!(
                    "unknown componentExport {other:?}: expected \"customelement\", \"module\", \"lazy\" or \"ssr\""
                )));
            }
        };
        let component_metadata = match self.component_metadata.as_deref().map(|e| e.trim().to_lowercase()).as_deref() {
            None | Some("") => ComponentMetadata::None,
            Some("compilerstatic") => ComponentMetadata::CompilerStatic,
            Some(other) => {
                return Err(napi::Error::from_reason(format!("unknown componentMetadata {other:?}: expected \"compilerstatic\"")));
            }
        };
        Ok(TranspileOptions {
            component_export,
            component_metadata,
            emit_styles: self.emit_styles.unwrap_or(true),
            file: self.file,
            core_import_path: self.core_import_path.unwrap_or_else(|| {
                if component_export == ComponentExport::Ssr { SSR_CORE_IMPORT_PATH } else { DEFAULT_CORE_IMPORT_PATH }.into()
            }),
            jsx,
            resolve_imports: self.resolve_imports.unwrap_or(false),
            complex_types: self.complex_types.unwrap_or(false),
            source_map: self.source_map.unwrap_or(true),
            transform_as_base_class: self.transform_as_base_class.unwrap_or(false),
        })
    }
}

/// Generate a component module, `customelement` unless `componentExport` says otherwise:
/// `{ code, map, components, diagnostics, baseClasses }`.
#[napi]
pub fn transpile(source: String, options: JsTranspileOptions) -> napi::Result<String> {
    to_js(stencilrs_transform::transpile(&source, &options.into_options()?))
}

/// `transpileAsync`: the work of `transpile` on the libuv thread pool, the result as a JSON string.
pub struct TranspileTask {
    source: String,
    options: TranspileOptions,
}

impl Task for TranspileTask {
    type Output = String;
    type JsValue = String;

    fn compute(&mut self) -> napi::Result<String> {
        serde_json::to_string(&stencilrs_transform::transpile(&self.source, &self.options)).map_err(|e| napi::Error::from_reason(e.to_string()))
    }

    fn resolve(&mut self, _env: Env, output: String) -> napi::Result<String> {
        Ok(output)
    }
}

/// `transpile` off the calling thread: a promise of the same result, as a JSON string.
#[napi]
pub fn transpile_async(source: String, options: JsTranspileOptions) -> napi::Result<AsyncTask<TranspileTask>> {
    Ok(AsyncTask::new(TranspileTask { source, options: options.into_options()? }))
}

#[napi(object)]
pub struct JsTranspileInput {
    pub source: String,
    pub options: JsTranspileOptions,
}

/// One file of `transpileMany`: the options already checked, or why they are not valid.
struct ManyJob {
    source: String,
    options: Result<TranspileOptions, String>,
}

/// `{"result": …}` or `{"error": "…"}` for one file.
fn run_job(job: &ManyJob) -> String {
    let options = match &job.options {
        Ok(options) => options,
        Err(message) => return serde_json::json!({ "error": message }).to_string(),
    };
    // A panic in one file is that file's error, not the batch's.
    match std::panic::catch_unwind(|| serde_json::to_string(&stencilrs_transform::transpile(&job.source, options))) {
        Ok(Ok(json)) => format!("{{\"result\":{json}}}"),
        Ok(Err(e)) => serde_json::json!({ "error": e.to_string() }).to_string(),
        Err(_) => serde_json::json!({ "error": format!("stencilrs: internal error transpiling {}", options.file) }).to_string(),
    }
}

/// `transpileMany`: the files in parallel on scoped threads, a JSON array in input order.
pub struct TranspileManyTask {
    jobs: Vec<ManyJob>,
}

impl Task for TranspileManyTask {
    type Output = String;
    type JsValue = String;

    fn compute(&mut self) -> napi::Result<String> {
        let jobs = &self.jobs;
        let next = AtomicUsize::new(0);
        let threads = std::thread::available_parallelism().map_or(1, |n| n.get()).min(jobs.len()).max(1);
        let mut done: Vec<(usize, String)> = Vec::with_capacity(jobs.len());
        std::thread::scope(|scope| {
            let workers: Vec<_> = (0..threads)
                .map(|_| {
                    // The parser and the type walk recurse: a roomy stack, as libuv's pool threads have.
                    std::thread::Builder::new()
                        .stack_size(8 << 20)
                        .spawn_scoped(scope, || {
                            let mut mine = Vec::new();
                            // A shared counter is the work queue: a thread takes the next file when it is free.
                            loop {
                                let i = next.fetch_add(1, Ordering::Relaxed);
                                let Some(job) = jobs.get(i) else { break };
                                mine.push((i, run_job(job)));
                            }
                            mine
                        })
                        .expect("spawn transpile worker")
                })
                .collect();
            for worker in workers {
                done.extend(worker.join().expect("transpile worker"));
            }
        });
        done.sort_unstable_by_key(|(i, _)| *i);
        Ok(format!("[{}]", done.into_iter().map(|(_, json)| json).collect::<Vec<_>>().join(",")))
    }

    fn resolve(&mut self, _env: Env, output: String) -> napi::Result<String> {
        Ok(output)
    }
}

/// `transpile` for many files at once, in parallel: a promise of a JSON array with one
/// `{ result }` or `{ error }` per input, in input order.
#[napi]
pub fn transpile_many(files: Vec<JsTranspileInput>) -> AsyncTask<TranspileManyTask> {
    let jobs = files
        .into_iter()
        .map(|f| ManyJob { source: f.source, options: f.options.into_options().map_err(|e| e.reason.to_string()) })
        .collect();
    AsyncTask::new(TranspileManyTask { jobs })
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

/// Stencil's `foldBuildFlags`: `Build.<flag>` reads (`Build` imported from `@stencil/core`) replaced
/// by the boolean literals in `flags`, padded to the original length. `null` when nothing folded.
#[napi]
pub fn fold_build_flags(code: String, file_name: String, flags: serde_json::Value) -> Option<String> {
    let flags = flags.as_object()?.iter().filter_map(|(k, v)| v.as_bool().map(|b| (k.clone(), b))).collect();
    stencilrs_transform::fold_build_flags(&code, &file_name, &flags)
}
