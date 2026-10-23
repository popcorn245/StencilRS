//! Process-wide caches for build-accurate mode (`resolve.rs`): the `strictNullChecks` of a
//! tsconfig, and the summaries of imported modules. Both outlive one `transpile` call and are
//! shared by every thread, so a long-lived dev server reads and parses each file once. Every
//! use is validated against the modification time and size of the files the entry came from,
//! so an edit shows up in the next call.
//!
//! Only owned, plain data is cached (never oxc ASTs or `Rc`s). Each cache is bounded; at the
//! limit it is emptied, which costs a re-read, never a wrong answer.

use std::collections::HashMap;
use rustc_hash::FxHashMap;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex, MutexGuard, OnceLock};
use std::time::SystemTime;

use crate::resolve::{TypeSummary, ValueSummary};

const MAX_MODULES: usize = 4096;
const MAX_TSCONFIGS: usize = 1024;

/// What a file looked like when it was read.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct Stamp {
    mtime: Option<SystemTime>,
    len: u64,
}

/// The stamp of a regular file, or `None` when there is none (missing, or not a file).
pub fn stamp(path: &Path) -> Option<Stamp> {
    let meta = std::fs::metadata(path).ok().filter(|m| m.is_file())?;
    Some(Stamp { mtime: meta.modified().ok(), len: meta.len() })
}

/// A file a cached result was derived from. `stamp: None` records that the file was absent,
/// so creating it later invalidates the result.
#[derive(Clone, Debug)]
pub struct Dep {
    pub path: PathBuf,
    pub stamp: Option<Stamp>,
}

impl Dep {
    /// The file as it is now.
    pub fn of(path: &Path) -> Dep {
        Dep { path: path.to_owned(), stamp: stamp(path) }
    }
}

fn fresh(deps: &[Dep]) -> bool {
    deps.iter().all(|d| stamp(&d.path) == d.stamp)
}

fn lock<K, V>(map: &'static OnceLock<Mutex<HashMap<K, V>>>) -> MutexGuard<'static, HashMap<K, V>> {
    map.get_or_init(Mutex::default).lock().unwrap_or_else(|poisoned| poisoned.into_inner())
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

/// The cached summary of the module at `path`, if none of the files it came from has changed.
pub fn module(path: &Path) -> Option<(Exports, Arc<Vec<Dep>>)> {
    let entry = lock(&MODULES).get(path)?.clone();
    if fresh(&entry.deps) {
        return Some((entry.exports, entry.deps));
    }
    lock(&MODULES).remove(path);
    None
}

pub fn store_module(path: &Path, exports: Exports, deps: Arc<Vec<Dep>>) {
    let mut modules = lock(&MODULES);
    if modules.len() >= MAX_MODULES {
        modules.clear();
    }
    modules.insert(path.to_owned(), ModuleEntry { exports, deps });
}

#[derive(Clone)]
struct TsconfigEntry {
    strict: bool,
    /// Every `tsconfig.json` looked for on the way up (absent ones too), and the `extends` chain.
    deps: Arc<Vec<Dep>>,
}

static TSCONFIGS: OnceLock<Mutex<HashMap<PathBuf, TsconfigEntry>>> = OnceLock::new();

/// `strictNullChecks` for files in `dir`, if the tsconfigs it came from have not changed.
pub fn tsconfig(dir: &Path) -> Option<bool> {
    let entry = lock(&TSCONFIGS).get(dir)?.clone();
    if fresh(&entry.deps) {
        return Some(entry.strict);
    }
    lock(&TSCONFIGS).remove(dir);
    None
}

pub fn store_tsconfig(dir: &Path, strict: bool, deps: Vec<Dep>) {
    let mut tsconfigs = lock(&TSCONFIGS);
    if tsconfigs.len() >= MAX_TSCONFIGS {
        tsconfigs.clear();
    }
    tsconfigs.insert(dir.to_owned(), TsconfigEntry { strict, deps: Arc::new(deps) });
}
