import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import vm from 'node:vm';

const require = createRequire(import.meta.url);
const { build } = createRequire(require.resolve('vite/package.json'))('esbuild');

const bundle = await build({
  stdin: {
    resolveDir: process.cwd(),
    contents: `
      export { registerServiceWorker } from './src/registerServiceWorker';
      export { resolveRoute } from './src/routes/resolveRoute';
      export { resolveWorkspaceHistoryUrl } from './src/routes/workspaceHistory';
    `,
  },
  bundle: true,
  platform: 'node',
  format: 'cjs',
  write: false,
  plugins: [{
    name: 'capacitor-fixture',
    setup(builder) {
      builder.onResolve({ filter: /^@capacitor\/core$/ }, () => ({ path: 'capacitor', namespace: 'fixture' }));
      builder.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({
        contents: 'export const Capacitor = { isNativePlatform: () => globalThis.fixtureNative };',
      }));
    },
  }],
});

function fixture(options = {}) {
  const events = new Map();
  const values = new Map();
  if (options.alreadyReloaded) values.set('lifegoalapp_sw_reloaded_once', '1');
  const record = { reloads: 0, registers: 0, updates: 0, messages: [], warnings: [], errors: [] };
  const registration = {
    update: async () => {
      record.updates += 1;
      if (options.updateFails) throw new Error('offline');
    },
    waiting: options.waiting ? { postMessage: (message) => record.messages.push(message) } : null,
    installing: null,
  };
  const serviceWorker = {
    controller: options.controlled ? {} : null,
    addEventListener: (name, callback) => {
      const listeners = events.get(name) ?? [];
      listeners.push(callback);
      events.set(name, listeners);
    },
    register: async () => {
      record.registers += 1;
      if (options.registerFails) throw new Error('disabled');
      return options.disabled ? undefined : registration;
    },
  };
  const pathname = options.pathname ?? '/';
  const search = options.search ?? '';
  const href = `https://habitgame.app${pathname}${search}`;
  const navigatorFixture = options.unsupported ? {} : {
    serviceWorker,
    standalone: options.iosStandalone ?? false,
  };
  const context = vm.createContext({
    URL,
    URLSearchParams,
    module: { exports: {} },
    fixtureNative: options.native ?? false,
    navigator: navigatorFixture,
    window: {
      location: {
        href,
        hostname: 'habitgame.app',
        pathname,
        search,
        hash: '',
        reload: () => { record.reloads += 1; },
      },
      matchMedia: () => ({ matches: options.standalone ?? false }),
      sessionStorage: {
        getItem: (key) => {
          if (options.storageReadFails) throw new Error('blocked');
          return values.get(key) ?? null;
        },
        setItem: (key, value) => {
          if (options.storageWriteFails) throw new Error('blocked');
          values.set(key, value);
        },
      },
    },
    console: {
      warn: (...args) => record.warnings.push(args[0]),
      error: (...args) => record.errors.push(args[0]),
      info: () => {},
    },
  });
  vm.runInContext(bundle.outputFiles[0].text, context);
  return {
    api: context.module.exports,
    record,
    registration,
    serviceWorker,
    change(controller = {}) {
      serviceWorker.controller = controller;
      for (const callback of events.get('controllerchange') ?? []) callback();
    },
  };
}

assert.equal(fixture({ native: true }).api.resolveRoute('/'), 'app', 'Capacitor root enters the app');
assert.equal(fixture({ standalone: true }).api.resolveRoute('/'), 'app', 'installed PWA root enters the app');
assert.equal(fixture({ iosStandalone: true }).api.resolveRoute('/'), 'app', 'iOS standalone root enters the app');
assert.equal(fixture().api.resolveRoute('/'), 'world', 'ordinary browser root keeps the public landing');
assert.equal(fixture({ native: true }).api.resolveRoute('/privacy'), 'privacy', 'native explicit public routes remain public');
assert.equal(fixture({ native: true }).api.resolveRoute('/login'), 'login', 'native explicit login route remains explicit');
console.log('PASS route entry: Capacitor, installed PWA, browser and explicit public routes');

const route = fixture().api.resolveWorkspaceHistoryUrl;
for (const workspace of ['planning', 'game', 'account', 'goals', 'unknown']) {
  assert.equal(route(workspace, 'https://habitgame.app/'), '/app');
  assert.equal(route(workspace, 'https://habitgame.app/app?keep=1#anchor'), null);
  assert.equal(route(workspace, 'https://habitgame.app/login?keep=1#anchor'), '/app?keep=1#anchor');
}
assert.equal(route('journal', 'https://habitgame.app/app?mode=x#entry'), '/journal?mode=x#entry');
assert.equal(route('breathing-space', 'https://habitgame.app/app?mode=x#entry'), '/breathing-space?mode=x#entry');
assert.equal(route('planning', 'https://habitgame.app/journal?mode=x#entry'), '/app?mode=x#entry');
for (const host of ['peacebetween.com', 'www.peacebetween.com']) {
  assert.equal(route('planning', `https://${host}/?keep=1#anchor`), null);
}
assert.equal(route('planning', 'https://habitgame.app/conflict/join/fixture?keep=1'), null);
assert.equal(route('planning', 'https://habitgame.app/app/nested?keep=1#anchor'), '/app?keep=1#anchor');
console.log('PASS workspace history: reloadable app path, query/hash and public-surface exclusions');

for (const option of [{ native: true }, { unsupported: true }]) {
  const instance = fixture(option);
  await instance.api.registerServiceWorker();
  assert.equal(instance.record.registers, 0);
}
const fresh = fixture();
await fresh.api.registerServiceWorker();
const firstController = {};
fresh.change(firstController);
assert.equal(fresh.record.reloads, 0, 'first control never reloads');
fresh.change(firstController);
assert.equal(fresh.record.reloads, 0, 'duplicate controller event is ignored');
fresh.change(null);
assert.equal(fresh.record.reloads, 0, 'losing control never reloads');
fresh.change();
assert.equal(fresh.record.reloads, 1, 'actual replacement reloads');
fresh.change();
assert.equal(fresh.record.reloads, 1, 'reload is bounded per document');
const existing = fixture({ controlled: true });
await existing.api.registerServiceWorker();
existing.change();
assert.equal(existing.record.reloads, 1);
for (const option of [{ alreadyReloaded: true }, { storageReadFails: true }, { storageWriteFails: true }]) {
  const instance = fixture({ ...option, controlled: true });
  await instance.api.registerServiceWorker();
  instance.change();
  instance.change();
  assert.equal(instance.record.reloads, 0, 'reload loops remain blocked');
}
const pending = fixture({ controlled: true, waiting: true });
await pending.api.registerServiceWorker();
assert.equal(pending.record.messages[0].type, 'SKIP_WAITING');
pending.registration.installing = { state: 'installing' };
pending.registration.onupdatefound();
pending.registration.installing.state = 'installed';
pending.registration.installing.onstatechange();
assert.equal(pending.record.messages.length, 2);
const offline = fixture({ updateFails: true });
await offline.api.registerServiceWorker();
await Promise.resolve();
assert.equal(offline.record.warnings.length, 1);
const disabled = fixture({ disabled: true });
await disabled.api.registerServiceWorker();
assert.equal(disabled.record.errors.length, 0);
const failed = fixture({ registerFails: true });
await failed.api.registerServiceWorker();
assert.equal(failed.record.errors.length, 1);
console.log('PASS service worker: native skip, bounded replacement reload and failure handling');
