import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const app = await readFile(new URL('../app.js', import.meta.url), 'utf8');

test('switching songs stops auto-scroll before changing the current song', () => {
  assert.match(app, /function showSong\(song\)\s*\{\s*stopScroll\(\);\s*void fullscreenController\.exit\(\);\s*currentSong = song;/);
});

test('app delegates wake-lock lifecycle to the tested manager', () => {
  assert.match(app, /import \{ createWakeLockManager \} from ['"]\.\/wake-lock\.js['"]/);
  assert.match(app, /wakeLockManager\.acquire\(\)/);
  assert.match(app, /wakeLockManager\.release\(\)/);
});

test('prompter play and fullscreen controls expose changing accessible state', () => {
  assert.match(app, /setAttribute\(['"]aria-pressed['"]/);
  assert.match(app, /fullscreenchange/);
  assert.match(app, /Salir de pantalla completa/);
});
