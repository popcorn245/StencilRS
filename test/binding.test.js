import assert from 'node:assert/strict';
import { test } from 'node:test';

import { bindingName, isMusl, platformKey, unsupportedPlatformError } from '../binding.js';

test('bindingName picks the glibc or musl Linux binary', () => {
  assert.equal(bindingName('linux', 'x64', false), 'linux-x64-gnu');
  assert.equal(bindingName('linux', 'x64', true), 'linux-x64-musl');
  assert.equal(bindingName('linux', 'arm64', false), 'linux-arm64-gnu');
  assert.equal(bindingName('linux', 'arm64', true), 'linux-arm64-musl');
});

test('bindingName ignores musl off Linux', () => {
  assert.equal(bindingName('darwin', 'arm64', true), 'darwin-arm64');
  assert.equal(bindingName('darwin', 'x64'), 'darwin-x64');
  assert.equal(bindingName('win32', 'x64', true), 'win32-x64-msvc');
});

test('bindingName is undefined where no binary ships', () => {
  assert.equal(bindingName('linux', 'ia32', false), undefined);
  assert.equal(bindingName('linux', 'riscv64', true), undefined);
  assert.equal(bindingName('win32', 'arm64', false), undefined);
  assert.equal(bindingName('freebsd', 'x64', false), undefined);
});

test('isMusl is false off Linux and a boolean here', () => {
  assert.equal(isMusl('darwin'), false);
  assert.equal(isMusl('win32'), false);
  assert.equal(typeof isMusl(), 'boolean');
});

test('unsupportedPlatformError names the platform and keeps the cause', () => {
  const cause = new Error('boom');
  const error = unsupportedPlatformError('linux', 'riscv64', true, cause);
  assert.match(error.message, /^stencilrs: no prebuilt binary for linux-riscv64-musl\./);
  assert.match(error.message, /Supported: .*linux-x64-musl/);
  assert.match(error.message, /npm run build:native/);
  assert.equal(error.cause, cause);
  assert.equal(unsupportedPlatformError('freebsd', 'x64', false).message.includes('freebsd-x64.'), true);
  assert.equal('cause' in unsupportedPlatformError('freebsd', 'x64', false), false);
  assert.equal(platformKey('linux', 'x64', false), 'linux-x64');
});
