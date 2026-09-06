import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('prompter is static, browser-local and has complete reading controls', async () => {
  const app = await read('app.js');
  assert.match(app, /localStorage/);
  assert.doesNotMatch(app, /innerHTML/);
  assert.doesNotMatch(app, /fetch\s*\(/);
  for (const contract of ['prompter-play', 'prompter-reset', 'font-decrease', 'font-increase', 'prompter-fullscreen', 'scroll-speed']) {
    assert.match(app, new RegExp(contract));
  }
  assert.match(app, /wakeLock/);
});

test('lyrics are not bundled and the empty state supports paste plus web search', async () => {
  const [songs, html] = await Promise.all([read('songs.js'), read('index.html')]);
  assert.doesNotMatch(songs, /lyrics\s*:/);
  assert.match(html, /id="lyrics-editor"/);
  assert.match(html, /Pega aquí la letra/);
  assert.match(html, /Buscar letra en internet/);
});
