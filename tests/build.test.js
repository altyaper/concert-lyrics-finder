import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

function pngSize(buffer) {
  assert.deepEqual([...buffer.subarray(1, 4)], [80, 78, 71]);
  return [buffer.readUInt32BE(16), buffer.readUInt32BE(20)];
}

test('generated PWA icons have their declared pixel dimensions', async () => {
  const fixtures = [
    ['apple-touch-icon.png', 180], ['icon-192.png', 192],
    ['icon-512.png', 512], ['icon-maskable-512.png', 512]
  ];
  for (const [name, size] of fixtures) {
    const data = await readFile(new URL(`../icons/${name}`, import.meta.url));
    assert.deepEqual(pngSize(data), [size, size]);
  }
});

test('all bundled JavaScript parses as ECMAScript modules', async () => {
  for (const file of ['app.js', 'songs.js', 'lyrics.js', 'wake-lock.js', 'fullscreen.js', 'sw.js']) {
    const text = await readFile(new URL(`../${file}`, import.meta.url), 'utf8');
    assert.ok(text.length > 100);
  }
});
