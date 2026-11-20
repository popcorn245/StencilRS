// Which prebuilt binary this process needs, and the errors for when there is none.
// Kept apart from index.js so the selection logic can be tested with made-up platforms.
import { readFileSync } from 'node:fs';

/** `<platform>-<arch>[-musl]` -> binding name (the suffix of `stencilrs.<name>.node` and of the package). */
const BINDINGS = {
  'linux-x64': 'linux-x64-gnu',
  'linux-x64-musl': 'linux-x64-musl',
  'linux-arm64': 'linux-arm64-gnu',
  'linux-arm64-musl': 'linux-arm64-musl',
  'darwin-x64': 'darwin-x64',
  'darwin-arm64': 'darwin-arm64',
  'win32-x64': 'win32-x64-msvc',
};

/** The platform key in the form used for messages: `linux-x64-musl`, `darwin-arm64`. */
export const platformKey = (platform, arch, musl) => `${platform}-${arch}${platform === 'linux' && musl ? '-musl' : ''}`;

/**
 * The binding name for a platform, or undefined if no prebuilt binary exists for it.
 * @param {string} platform `process.platform`
 * @param {string} arch `process.arch`
 * @param {boolean} musl whether the C library is musl (only looked at on Linux)
 */
export const bindingName = (platform, arch, musl = false) => BINDINGS[platformKey(platform, arch, musl)];

/** True when this Linux process runs on musl (Alpine and the like), false on glibc and elsewhere. */
export function isMusl(platform = process.platform) {
  if (platform !== 'linux') return false;
  // glibc reports its version; musl does not.
  try {
    const report = process.report?.getReport?.();
    const header = (typeof report === 'string' ? JSON.parse(report) : report)?.header;
    if (header) return !header.glibcVersionRuntime;
  } catch {}
  // No diagnostic report: the dynamic linker script names musl.
  try {
    return readFileSync('/usr/bin/ldd', 'utf8').includes('musl');
  } catch {
    return false;
  }
}

/** The error for a platform without a prebuilt binary, naming it and what is supported. */
export function unsupportedPlatformError(platform, arch, musl, cause) {
  return new Error(
    `stencilrs: no prebuilt binary for ${platformKey(platform, arch, musl)}. ` +
      `Supported: ${Object.keys(BINDINGS).join(', ')}. ` +
      'Build it from source with Rust (npm run build:native, see "Develop" in the README) ' +
      'or open an issue at https://github.com/popcorn245/StencilRS/issues.',
    cause === undefined ? undefined : { cause },
  );
}
