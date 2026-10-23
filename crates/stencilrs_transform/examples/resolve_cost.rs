//! Time `transpile` over examples/ui-kit with and without `resolve_imports` (what the Vite
//! plugin turns on), in Rust alone: the cost of following imports, and what the process-wide
//! caches save on the later passes.
//!
//!   cargo run --release -p stencilrs_transform --example resolve_cost
use std::path::{Path, PathBuf};
use std::time::Instant;

use stencilrs_transform::{DEFAULT_CORE_IMPORT_PATH, Jsx, TranspileOptions, transpile};

fn walk(dir: &Path, out: &mut Vec<PathBuf>) {
    for entry in std::fs::read_dir(dir).unwrap().flatten() {
        let p = entry.path();
        if p.is_dir() {
            walk(&p, out);
        } else if p.extension().is_some_and(|e| e == "tsx") {
            out.push(p);
        }
    }
}

fn main() {
    let mut files = Vec::new();
    walk(Path::new(concat!(env!("CARGO_MANIFEST_DIR"), "/../../examples/ui-kit/src")), &mut files);
    files.sort();
    let sources: Vec<(String, String)> =
        files.iter().map(|p| (p.to_string_lossy().replace('\\', "/"), std::fs::read_to_string(p).unwrap())).collect();
    for (resolve_imports, complex_types) in [(false, false), (true, false), (false, false), (true, false), (true, true), (true, true)] {
        let mut times = Vec::new();
        for pass in 0..15 {
            let t = Instant::now();
            for (file, src) in &sources {
                let opts = TranspileOptions {
                    file: file.clone(),
                    core_import_path: DEFAULT_CORE_IMPORT_PATH.into(),
                    jsx: Jsx::Automatic { import_source: "@stencil/core".into() },
                    resolve_imports,
                    complex_types,
                    source_map: false,
                    transform_as_base_class: false,
                    component_export: Default::default(),
                    component_metadata: Default::default(),
                    emit_styles: true,
                };
                std::hint::black_box(transpile(src, &opts));
            }
            times.push((pass, t.elapsed().as_secs_f64() * 1000.0));
        }
        let first = times[0].1;
        let mut rest: Vec<f64> = times[1..].iter().map(|t| t.1).collect();
        rest.sort_by(f64::total_cmp);
        println!(
            "resolve {resolve_imports:5} complex {complex_types:5}: first pass {first:6.1} ms, next {}: median {:6.1} ms, best {:6.1} ms ({} files)",
            rest.len(),
            rest[rest.len() / 2],
            rest[0],
            sources.len()
        );
    }
}
