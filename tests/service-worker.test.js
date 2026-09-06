import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

async function loadWorker({ keys = [], match, fetchImpl } = {}) {
  const source = await readFile(new URL('../sw.js', import.meta.url), 'utf8');
  const handlers = {};
  const deleted = [];
  const opened = [];
  const puts = [];
  const cache = {
    addAll: async () => {},
    match: match || (async () => undefined),
    put: async (...args) => { puts.push(args); }
  };
  const context = {
    URL,
    Promise,
    fetch: fetchImpl || (async () => ({ ok: true, clone() { return this; } })),
    caches: {
      keys: async () => keys,
      delete: async key => { deleted.push(key); return true; },
      open: async key => { opened.push(key); return cache; }
    },
    self: {
      location: { origin: 'https://altyaper.github.io' },
      addEventListener: (name, handler) => { handlers[name] = handler; },
      skipWaiting: async () => {},
      clients: { claim: async () => {} }
    }
  };
  vm.runInNewContext(source, context);
  return { handlers, deleted, opened, puts };
}

function runEvent(handler, event) {
  let result;
  handler({ ...event, waitUntil: promise => { result = promise; }, respondWith: promise => { result = promise; } });
  return result;
}

test('activation deletes only outdated LetraLista caches on the shared Pages origin', async () => {
  const worker = await loadWorker({ keys: ['other-app-cache', 'letralista-shell-v0', 'letralista-shell-v1'] });
  await runEvent(worker.handlers.activate, {});
  assert.deepEqual(worker.deleted, ['letralista-shell-v0', 'letralista-shell-v1']);
});

test('navigation is network-first so deployed HTML updates immediately', async () => {
  const network = { source: 'network', ok: true, clone() { return this; } };
  const cached = { source: 'cache' };
  const worker = await loadWorker({ match: async () => cached, fetchImpl: async () => network });
  const response = await runEvent(worker.handlers.fetch, {
    request: { mode: 'navigate', method: 'GET', url: 'https://altyaper.github.io/concert-lyrics-finder/' }
  });
  assert.equal(response.source, 'network');
});

test('offline index fallback is limited to document navigation', async () => {
  const index = { source: 'offline-index' };
  const worker = await loadWorker({ match: async request => request === './index.html' ? index : undefined, fetchImpl: async () => { throw Error('offline'); } });
  const navigation = await runEvent(worker.handlers.fetch, {
    request: { mode: 'navigate', method: 'GET', url: 'https://altyaper.github.io/concert-lyrics-finder/' }
  });
  assert.equal(navigation.source, 'offline-index');
  await assert.rejects(runEvent(worker.handlers.fetch, {
    request: { mode: 'no-cors', method: 'GET', url: 'https://altyaper.github.io/concert-lyrics-finder/missing.js' }
  }), /offline/);
});

test('shell assets are network-first and finish their cache write before responding', async () => {
  const cached = { source: 'cache' };
  const network = { source: 'network', ok: true, clone() { return this; } };
  const worker = await loadWorker({ match: async () => cached, fetchImpl: async () => network });
  const response = await runEvent(worker.handlers.fetch, {
    request: { mode: 'no-cors', method: 'GET', url: 'https://altyaper.github.io/concert-lyrics-finder/app.js' }
  });
  assert.equal(response.source, 'network');
  assert.equal(worker.puts.length, 1);
});
