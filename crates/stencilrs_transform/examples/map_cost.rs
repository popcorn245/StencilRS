//! Time `transpile` over the parity corpus with and without source maps, in Rust alone (no
//! Node binding), to see what the maps cost.
//!
//!   cargo run --release -p stencilrs_transform --example map_cost
use std::path::{Path, PathBuf};
use std::time::Instant;

use stencilrs_transform::{DEFAULT_CORE_IMPORT_PATH, Jsx, TranspileOptions, transpile};

fn walk(dir: &Path, out: &mut Vec<PathBuf>) {
    for entry in std::fs::read_dir(dir).unwrap().flatten() {
        let p = entry.path();
        if p.is_dir() {
            walk(&p, out);
        } else if p.extension().is_some_and(|e| e == "tsx" || e == "ts") {
            out.push(p);
        }
    }
}

fn main() {
    let mut files = Vec::new();
    walk(Path::new(concat!(env!("CARGO_MANIFEST_DIR"), "/../../parity/fixtures")), &mut files);
    let sources: Vec<(String, String)> =
        files.iter().map(|p| (p.to_string_lossy().replace('\\', "/"), std::fs::read_to_string(p).unwrap())).collect();
    let rounds = 10;
    for source_map in [false, true, false, true] {
        let t = Instant::now();
        let mut bytes = 0;
        for _ in 0..rounds {
            for (file, src) in &sources {
                let opts = TranspileOptions {
                    file: file.clone(),
                    core_import_path: DEFAULT_CORE_IMPORT_PATH.into(),
                    jsx: Jsx::Automatic { import_source: "@stencil/core".into() },
                    resolve_imports: false,
                    source_map,
                    transform_as_base_class: false,
                    component_export: Default::default(),
                };
                bytes += transpile(src, &opts).map.map_or(0, |m| m.len());
            }
        }
        let ms = t.elapsed().as_secs_f64() * 1000.0 / rounds as f64;
        println!("maps {source_map:5}: {ms:6.1} ms per pass over {} files ({} KiB of maps)", sources.len(), bytes / rounds / 1024);
    }
}
