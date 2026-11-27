// grass (pure-Rust Sass) over the sheets the Ionic build compiles with dart-sass.
//   grass-bench <sheets.txt> <outdir> [threads...]
// Each line of sheets.txt is a .scss path. Paths under /src/css/ are compiled `compressed` (the harness's global CSS), the rest `expanded`.
// Pass 1: sequential, one output file per sheet (out/<n>.css) or out/<n>.err; per-sheet times to out/times.tsv.
// Then, for each thread count, 7 timed rayon runs over all sheets (outputs discarded).
use rayon::prelude::*;
use std::time::Instant;

fn opts(path: &str) -> grass::Options<'static> {
    let style = if path.contains("/src/css/") { grass::OutputStyle::Compressed } else { grass::OutputStyle::Expanded };
    grass::Options::default().style(style).quiet(true)
}

fn main() {
    let a: Vec<String> = std::env::args().collect();
    let list = std::fs::read_to_string(&a[1]).unwrap();
    let out = &a[2];
    std::fs::create_dir_all(out).unwrap();
    let files: Vec<&str> = list.lines().filter(|l| !l.is_empty()).collect();
    let mut times = String::new();
    let t0 = Instant::now();
    let mut fails = 0;
    for (i, f) in files.iter().enumerate() {
        let t = Instant::now();
        let r = grass::from_path(f, &opts(f));
        let ms = t.elapsed().as_secs_f64() * 1000.0;
        match r {
            Ok(css) => std::fs::write(format!("{out}/{i}.css"), css).unwrap(),
            Err(e) => {
                fails += 1;
                std::fs::write(format!("{out}/{i}.err"), format!("{e}")).unwrap();
            }
        }
        times.push_str(&format!("{i}\t{ms:.3}\t{f}\n"));
    }
    let seq = t0.elapsed().as_secs_f64() * 1000.0;
    std::fs::write(format!("{out}/times.tsv"), times).unwrap();
    println!("sequential (incl. file writes): {seq:.1} ms for {} sheets, {fails} failed", files.len());
    for n in a[3..].iter().map(|s| s.parse::<usize>().unwrap()) {
        let pool = rayon::ThreadPoolBuilder::new().num_threads(n).build().unwrap();
        let mut runs = vec![];
        for _ in 0..7 {
            let t = Instant::now();
            let ok: usize = pool.install(|| files.par_iter().map(|f| grass::from_path(f, &opts(f)).is_ok() as usize).sum());
            runs.push((t.elapsed().as_secs_f64() * 1000.0, ok));
        }
        let mut ms: Vec<f64> = runs.iter().map(|r| r.0).collect();
        ms.sort_by(|a, b| a.partial_cmp(b).unwrap());
        println!("threads {n}: median {:.1} ms (min {:.1}, max {:.1}), ok {}", ms[3], ms[0], ms[6], runs[0].1);
    }
}
