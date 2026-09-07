import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const fullscreenSource = await readFile(new URL('fullscreen.js', root), 'utf8').catch(() => '');
const fullscreenModule = fullscreenSource
  ? await import(`data:text/javascript;base64,${Buffer.from(fullscreenSource).toString('base64')}`)
  : {};
const { createFullscreenController } = fullscreenModule;

const deferred = () => {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
};

test('unsupported native fullscreen immediately enters and exits the CSS fallback', async () => {
  assert.equal(typeof createFullscreenController, 'function');
  const applied = [];
  let nativeRequested = false;
  const controller = createFullscreenController({
    applyActive: active => applied.push(active),
    requestNative: () => { nativeRequested = true; return false; },
    exitNative: async () => {},
    hasNativeElement: () => false
  });

  const entering = controller.enter();
  assert.equal(nativeRequested, true, 'native request must begin synchronously in the user gesture');
  assert.equal(controller.isActive(), true);
  assert.deepEqual(applied, [true]);
  assert.deepEqual(await entering, { native: false });

  await controller.toggle();
  assert.equal(controller.isActive(), false);
  assert.deepEqual(applied, [true, false]);
});

test('a rejected native request preserves the usable CSS fallback', async () => {
  assert.equal(typeof createFullscreenController, 'function');
  const applied = [];
  const controller = createFullscreenController({
    applyActive: active => applied.push(active),
    requestNative: async () => { throw new Error('NotAllowedError'); },
    exitNative: async () => {},
    hasNativeElement: () => false
  });

  assert.deepEqual(await controller.enter(), { native: false });
  assert.equal(controller.isActive(), true);
  assert.deepEqual(applied, [true]);
});

test('leaving native fullscreen also leaves the CSS fullscreen state', async () => {
  assert.equal(typeof createFullscreenController, 'function');
  let nativeElement = true;
  const applied = [];
  const controller = createFullscreenController({
    applyActive: active => applied.push(active),
    requestNative: async () => true,
    exitNative: async () => { nativeElement = false; },
    hasNativeElement: () => nativeElement
  });

  assert.deepEqual(await controller.enter(), { native: true });
  nativeElement = false;
  controller.handleNativeChange();

  assert.equal(controller.isActive(), false);
  assert.deepEqual(applied, [true, false]);
});

test('a late WebKit fullscreen event is tracked so Escape clears the fallback', async () => {
  assert.equal(typeof createFullscreenController, 'function');
  let nativeElement = false;
  const applied = [];
  const controller = createFullscreenController({
    applyActive: active => applied.push(active),
    requestNative: async () => true,
    exitNative: async () => {},
    hasNativeElement: () => nativeElement
  });

  assert.deepEqual(await controller.enter(), { native: false });
  assert.equal(controller.isActive(), true);
  nativeElement = true;
  controller.handleNativeChange();
  nativeElement = false;
  controller.handleNativeChange();

  assert.equal(controller.isActive(), false);
  assert.deepEqual(applied, [true, false]);
});

test('a late native entry event after exit is immediately cancelled', async () => {
  assert.equal(typeof createFullscreenController, 'function');
  const nativeRequest = deferred();
  let nativeElement = false;
  let exits = 0;
  const applied = [];
  const controller = createFullscreenController({
    applyActive: active => applied.push(active),
    requestNative: () => nativeRequest.promise,
    exitNative: async () => { exits += 1; nativeElement = false; },
    hasNativeElement: () => nativeElement
  });

  const entering = controller.enter();
  await controller.exit();
  nativeElement = true;
  controller.handleNativeChange();
  await Promise.resolve();

  assert.equal(controller.isActive(), false);
  assert.equal(exits, 1);
  assert.deepEqual(applied, [true, false]);
  nativeRequest.resolve(true);
  assert.deepEqual(await entering, { native: false });
});

test('re-entering while native exit is pending preserves the CSS fallback', async () => {
  assert.equal(typeof createFullscreenController, 'function');
  const nativeExit = deferred();
  let nativeElement = false;
  let requests = 0;
  const controller = createFullscreenController({
    applyActive: () => {},
    requestNative: async () => { requests += 1; nativeElement = true; return true; },
    exitNative: () => nativeExit.promise.then(() => { nativeElement = false; }),
    hasNativeElement: () => nativeElement
  });

  assert.deepEqual(await controller.enter(), { native: true });
  const exiting = controller.exit();
  const reentering = controller.enter();
  controller.handleNativeChange();
  nativeExit.resolve();
  await exiting;
  controller.handleNativeChange();

  assert.deepEqual(await reentering, { native: false });
  assert.equal(requests, 1);
  assert.equal(controller.isActive(), true);
});

test('re-entering while a native request is pending reuses that request', async () => {
  assert.equal(typeof createFullscreenController, 'function');
  const nativeRequest = deferred();
  let requests = 0;
  let nativeElement = false;
  let exits = 0;
  const controller = createFullscreenController({
    applyActive: () => {},
    requestNative: () => {
      requests += 1;
      return nativeRequest.promise.then(() => { nativeElement = true; return true; });
    },
    exitNative: async () => { exits += 1; nativeElement = false; },
    hasNativeElement: () => nativeElement
  });

  const firstEnter = controller.enter();
  await controller.exit();
  const resumedEnter = controller.enter();
  assert.equal(requests, 1);

  nativeRequest.resolve();
  assert.deepEqual(await firstEnter, { native: true });
  assert.deepEqual(await resumedEnter, { native: true });
  assert.equal(controller.isActive(), true);
  assert.equal(exits, 0);
});

test('app, CSS, build and offline shell integrate the fallback and Safari aliases', async () => {
  const [app, css, serviceWorker, build] = await Promise.all([
    readFile(new URL('app.js', root), 'utf8'),
    readFile(new URL('styles.css', root), 'utf8'),
    readFile(new URL('sw.js', root), 'utf8'),
    readFile(new URL('scripts/verify-build.js', root), 'utf8')
  ]);

  assert.match(app, /createFullscreenController/);
  assert.match(app, /webkitRequestFullscreen/);
  assert.match(app, /webkitExitFullscreen/);
  assert.match(app, /webkitfullscreenchange/);
  assert.match(css, /\.prompter-shell\.is-fullscreen/);
  assert.match(css, /position:\s*fixed/);
  assert.match(css, /height:\s*100dvh/);
  assert.match(css, /body\.prompter-focus-active/);
  assert.match(serviceWorker, /\.\/fullscreen\.js/);
  assert.match(build, /fullscreen\.js/);
});
