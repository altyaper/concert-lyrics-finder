import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../auto-scroll.js', import.meta.url), 'utf8').catch(() => '');
const moduleUrl = `data:text/javascript;base64,${Buffer.from(source || 'export const createScrollStepper = undefined;').toString('base64')}`;
const { createScrollStepper } = await import(moduleUrl);

test('auto-scroll accumulates sub-pixel frames when the browser rounds scrollTop', () => {
  assert.equal(typeof createScrollStepper, 'function');
  let position = 0;
  const surface = {};
  Object.defineProperty(surface, 'scrollTop', {
    get: () => position,
    set: value => { position = Math.trunc(value); }
  });
  const stepper = createScrollStepper();

  for (let frame = 0; frame < 60; frame += 1) stepper.advance(surface, 42 / 60);

  assert.equal(surface.scrollTop, 42);
});

test('prompter animation and offline build use the cross-browser scroll stepper', async () => {
  const [app, build, worker] = await Promise.all([
    readFile(new URL('../app.js', import.meta.url), 'utf8'),
    readFile(new URL('../scripts/verify-build.js', import.meta.url), 'utf8'),
    readFile(new URL('../sw.js', import.meta.url), 'utf8')
  ]);

  assert.match(app, /import \{ createScrollStepper \} from ['"]\.\/auto-scroll\.js['"]/);
  assert.match(app, /scrollStepper\.advance\(surface,/);
  assert.match(app, /scrollStepper\.reset\(\)/);
  assert.match(build, /auto-scroll\.js/);
  assert.match(worker, /\.\/auto-scroll\.js/);
  assert.match(worker, /CACHE = `\$\{CACHE_PREFIX\}v7`/);
});
