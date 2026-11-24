//! Process-wide caches for build-accurate mode (`resolve.rs`): the `strictNullChecks` of a
//! tsconfig, the summaries of imported modules, and the tags the components of a project
//! declare. They outlive one `transpile` call and are shared by every thread, so a long-lived
//! dev server reads and parses each file once. Every use is validated against the modification
//! time and size of the files the entry came from, so an edit shows up in the next call (the one
//! exception, a tag nothing declared a moment ago, is described at `component_with_tag`).
//!
//! Only owned, plain data is cached (never oxc ASTs or `Rc`s). Each cache is bounded; at the
//! limit it is emptied, which costs a re-read, never a wrong answer.

use rustc_hash::FxHashMap;
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex, MutexGuard, OnceLock};
use std::time::{Duration, Instant, SystemTime};

use crate::resolve::{TypeSummary, ValueSummary};

const MAX_MODULES: usize = 4096;
const MAX_TSCONFIGS: usize = 1024;
const MAX_TAG_INDEXES: usize = 64;
/// How long "no component declares this tag" is believed before the project is walked again.
const TAG_MISS_TTL: Duration = Duration::from_secs(1);
/// Folders nested deeper than this under `src` are not walked.
const MAX_TAG_DEPTH: u8 = 12;

/// What a file looked like when it was read.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct Stamp {
    mtime: Option<SystemTime>,
    len: u64,
}

/// The stamp of a regular file, or `None` when there is none (missing, or not a file).
pub fn stamp(path: &Path) -> Option<Stamp> {
    let meta = std::fs::metadata(path).ok().filter(|m| m.is_file())?;
    Some(Stamp {
        mtime: meta.modified().ok(),
        len: meta.len(),
    })
}

/// A file a cached result was derived from. `stamp: None` records that the file was absent,
/// so creating it later invalidates the result.
#[derive(Clone, Debug)]
pub struct Dep {
    pub path: PathBuf,
    pub stamp: Option<Stamp>,
}

impl Dep {
    /// The file as a build tool can compare it later: its path and a stamp string
    /// (`<mtime in ns>:<size>`, as `fs.statSync(path, { bigint: true })` reports them), or `None`
    /// when the file was absent.
    pub fn report(&self) -> (String, Option<String>) {
        let stamp = self.stamp.map(|s| {
            let ns = s
                .mtime
                .and_then(|t| t.duration_since(SystemTime::UNIX_EPOCH).ok())
                .map(|d| d.as_nanos().to_string())
                .unwrap_or_else(|| "none".into());
            format!("{ns}:{}", s.len)
        });
        (self.path.to_string_lossy().replace('\\', "/"), stamp)
    }

    /// The file as it is now.
    pub fn of(path: &Path) -> Dep {
        Dep {
            path: path.to_owned(),
            stamp: stamp(path),
        }
    }
}

fn fresh(deps: &[Dep]) -> bool {
    deps.iter().all(|d| stamp(&d.path) == d.stamp)
}

fn lock<K, V>(map: &'static OnceLock<Mutex<HashMap<K, V>>>) -> MutexGuard<'static, HashMap<K, V>> {
    map.get_or_init(Mutex::default)
        .lock()
        .unwrap_or_else(|poisoned| poisoned.into_inner())
}

/// The exports of a module, shared between calls.
#[derive(Clone)]
pub struct Exports {
    pub file: String,
    pub types: Arc<FxHashMap<String, TypeSummary>>,
    pub values: Arc<FxHashMap<String, ValueSummary>>,
}

#[derive(Clone)]
struct ModuleEntry {
    exports: Exports,
    /// The module and every module its summary was merged from.
    deps: Arc<Vec<Dep>>,
}

static MODULES: OnceLock<Mutex<HashMap<PathBuf, ModuleEntry>>> = OnceLock::new();
/// Summaries of modules read as the entry point of a walk (nothing in progress), kept apart from
/// `MODULES` because they are only valid as such: a module in an import cycle reads differently
/// when another member of the cycle is being read around it.
static ROOTS: OnceLock<Mutex<HashMap<PathBuf, ModuleEntry>>> = OnceLock::new();

type Modules = OnceLock<Mutex<HashMap<PathBuf, ModuleEntry>>>;

fn lookup(map: &'static Modules, path: &Path) -> Option<(Exports, Arc<Vec<Dep>>)> {
    let entry = lock(map).get(path)?.clone();
    if fresh(&entry.deps) {
        return Some((entry.exports, entry.deps));
    }
    lock(map).remove(path);
    None
}

fn store(map: &'static Modules, path: &Path, exports: Exports, deps: Arc<Vec<Dep>>) {
    let mut modules = lock(map);
    if modules.len() >= MAX_MODULES {
        modules.clear();
    }
    modules.insert(path.to_owned(), ModuleEntry { exports, deps });
}

/// The cached summary of the module at `path`, if none of the files it came from has changed.
pub fn module(path: &Path) -> Option<(Exports, Arc<Vec<Dep>>)> {
    lookup(&MODULES, path)
}

pub fn store_module(path: &Path, exports: Exports, deps: Arc<Vec<Dep>>) {
    store(&MODULES, path, exports, deps);
}

/// The cached summary of the module at `path` read as the entry point of a walk.
pub fn root(path: &Path) -> Option<(Exports, Arc<Vec<Dep>>)> {
    lookup(&ROOTS, path)
}

pub fn store_root(path: &Path, exports: Exports, deps: Arc<Vec<Dep>>) {
    store(&ROOTS, path, exports, deps);
}

#[derive(Clone)]
struct TsconfigEntry {
    strict: bool,
    /// Every `tsconfig.json` looked for on the way up (absent ones too), and the `extends` chain.
    deps: Arc<Vec<Dep>>,
}

static TSCONFIGS: OnceLock<Mutex<HashMap<PathBuf, TsconfigEntry>>> = OnceLock::new();

/// `strictNullChecks` for files in `dir`, if the tsconfigs it came from have not changed.
pub fn tsconfig(dir: &Path) -> Option<(bool, Arc<Vec<Dep>>)> {
    let entry = lock(&TSCONFIGS).get(dir)?.clone();
    if fresh(&entry.deps) {
        return Some((entry.strict, entry.deps));
    }
    lock(&TSCONFIGS).remove(dir);
    None
}

pub fn store_tsconfig(dir: &Path, strict: bool, deps: Arc<Vec<Dep>>) {
    let mut tsconfigs = lock(&TSCONFIGS);
    if tsconfigs.len() >= MAX_TSCONFIGS {
        tsconfigs.clear();
    }
    tsconfigs.insert(
        dir.to_owned(),
        TsconfigEntry {
            strict,
            deps,
        },
    );
}

/// The component tags of the source files under one `src` folder.
struct TagIndex {
    /// Every source file walked: what it looked like, and the tags its components declare.
    files: HashMap<PathBuf, (Option<Stamp>, Vec<String>)>,
    /// The first file, in walk order, that declares each tag.
    tags: HashMap<String, PathBuf>,
    walked: Instant,
}

static TAG_INDEXES: OnceLock<Mutex<HashMap<PathBuf, TagIndex>>> = OnceLock::new();

/// The file under `src` in which a component declares `tag` (`tags_of` reads the tags off a
/// source text), from an index of the project that is kept between calls: the project is walked
/// once, not once for every type that names an element.
///
/// A tag that is found is checked against the file that declares it, so it is never stale. A tag
/// that is not found is believed for `TAG_MISS_TTL` before the project is walked again (files
/// that did not change are not read again): for that long a component that was just created is
/// not seen, which errs on the side of leaving its type to Stencil.
pub fn component_with_tag(src: &Path, tag: &str, tags_of: fn(&str) -> Vec<String>) -> Option<PathBuf> {
    let mut indexes = lock(&TAG_INDEXES);
    if let Some(index) = indexes.get(src) {
        match index.tags.get(tag) {
            Some(path) if index.files.get(path).is_some_and(|f| f.0 == stamp(path)) => {
                return Some(path.clone());
            }
            None if index.walked.elapsed() < TAG_MISS_TTL => return None,
            _ => {}
        }
    }
    let previous = indexes.remove(src);
    if indexes.len() >= MAX_TAG_INDEXES {
        indexes.clear();
    }
    let mut index = TagIndex {
        files: HashMap::new(),
        tags: HashMap::new(),
        walked: Instant::now(),
    };
    walk_tags(src, 0, previous.as_ref(), tags_of, &mut index);
    let hit = index.tags.get(tag).cloned();
    indexes.insert(src.to_owned(), index);
    hit
}

fn walk_tags(
    dir: &Path,
    depth: u8,
    previous: Option<&TagIndex>,
    tags_of: fn(&str) -> Vec<String>,
    index: &mut TagIndex,
) {
    if depth > MAX_TAG_DEPTH {
        return;
    }
    let Ok(entries) = std::fs::read_dir(dir) else {
        return;
    };
    let mut entries: Vec<_> = entries.flatten().collect();
    entries.sort_by_key(|e| e.file_name());
    for entry in entries {
        let name = entry.file_name();
        let name = name.to_string_lossy();
        let path = entry.path();
        if path.is_dir() {
            if name != "node_modules" && !name.starts_with('.') {
                walk_tags(&path, depth + 1, previous, tags_of, index);
            }
        } else if (name.ends_with(".tsx") || name.ends_with(".ts")) && !name.ends_with(".d.ts") {
            let now = stamp(&path);
            let tags = match previous.and_then(|p| p.files.get(&path)) {
                Some((then, tags)) if *then == now => tags.clone(),
                _ => std::fs::read_to_string(&path)
                    .map(|text| tags_of(&text))
                    .unwrap_or_default(),
            };
            for tag in &tags {
                index
                    .tags
                    .entry(tag.clone())
                    .or_insert_with(|| path.clone());
            }
            index.files.insert(path, (now, tags));
        }
    }
}
