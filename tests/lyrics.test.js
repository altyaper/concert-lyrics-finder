import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { songs } from '../songs.js';

const root = new URL('../', import.meta.url);
const source = await readFile(new URL('lyrics.js', root), 'utf8').catch(() => '');
const moduleUrl = `data:text/javascript;base64,${Buffer.from(source || 'export default {}').toString('base64')}`;
const lyricsModule = source ? await import(moduleUrl) : {};
const { normalizeLyricsPayload, loadBundledLyrics, resolveLyrics } = lyricsModule;
const songIds = songs.map(song => song.id);

const asPlainObject = value => ({ ...value });

test('bundled lyrics accept only known song IDs and normalized text', () => {
  assert.equal(typeof normalizeLyricsPayload, 'function');
  const result = normalizeLyricsPayload({
    [songIds[0]]: '  Primera línea\r\nSegunda línea  ',
    [songIds[1]]: 42,
    unknown: 'No debe cargarse'
  }, songIds);

  assert.deepEqual(asPlainObject(result), {
    [songIds[0]]: 'Primera línea\nSegunda línea'
  });
});

test('browser-local lyrics override the bundled JSON text', () => {
  assert.equal(typeof resolveLyrics, 'function');
  const bundled = { [songIds[0]]: 'Texto del JSON' };
  assert.equal(resolveLyrics(songIds[0], 'Edición local', bundled), 'Edición local');
  assert.equal(resolveLyrics(songIds[0], null, bundled), 'Texto del JSON');
  assert.equal(resolveLyrics(songIds[1], null, bundled), '');
});

test('lyrics JSON loads once through the same-origin request and fails safely', async () => {
  assert.equal(typeof loadBundledLyrics, 'function');
  const calls = [];
  const loaded = await loadBundledLyrics('./lyrics.json', songIds, async (url, options) => {
    calls.push([url, options]);
    return { ok: true, json: async () => ({ [songIds[0]]: 'Verso autorizado' }) };
  });

  assert.deepEqual(calls, [['./lyrics.json', { cache: 'no-cache' }]]);
  assert.deepEqual(asPlainObject(loaded), { [songIds[0]]: 'Verso autorizado' });
  assert.deepEqual(asPlainObject(await loadBundledLyrics('./lyrics.json', songIds, async () => { throw new Error('offline'); })), {});
  assert.deepEqual(asPlainObject(await loadBundledLyrics('./lyrics.json', songIds, async () => ({ ok: false }))), {});
});

test('app startup, static build and PWA shell include the lyrics JSON', async () => {
  const [app, html, jsonText, build, worker] = await Promise.all([
    readFile(new URL('app.js', root), 'utf8'),
    readFile(new URL('index.html', root), 'utf8'),
    readFile(new URL('lyrics.json', root), 'utf8').catch(() => ''),
    readFile(new URL('scripts/verify-build.js', root), 'utf8'),
    readFile(new URL('sw.js', root), 'utf8')
  ]);
  const payload = jsonText ? JSON.parse(jsonText) : {};

  assert.deepEqual(Object.keys(payload), songIds);
  assert.ok(Object.values(payload).every(value => value === ''));
  assert.match(app, /loadBundledLyrics/);
  assert.match(app, /await loadBundledLyrics\('\.\/lyrics\.json'/);
  assert.match(app, /resolveLyrics/);
  assert.doesNotMatch(html, /la app no publica letras/i);
  assert.match(html, /Esta canción todavía no tiene letra/);
  assert.match(build, /lyrics\.js/);
  assert.match(build, /lyrics\.json/);
  assert.match(worker, /\.\/lyrics\.js/);
  assert.match(worker, /\.\/lyrics\.json/);
  assert.match(worker, /CACHE = `\$\{CACHE_PREFIX\}v7`/);
});
