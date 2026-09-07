import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('page has accessible search, result status, main landmark and viewport support', async () => {
  const html = await read('index.html');
  assert.match(html, /<html lang="es">/);
  assert.match(html, /<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">/);
  assert.match(html, /<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'">/);
  assert.match(html, /<meta name="referrer" content="no-referrer">/);
  assert.match(html, /<main[^>]+id="contenido"/);
  assert.match(html, /<label[^>]+for="song-search"/);
  assert.match(html, /id="results-status"[^>]+role="status"/);
  assert.match(html, /Saltar al contenido/);
});

test('setlist omits the promotional intro block while retaining an accessible focus target', async () => {
  const [html, sw, app] = await Promise.all([read('index.html'), read('sw.js'), read('app.js')]);
  assert.doesNotMatch(html, /Noche de concierto/i);
  assert.doesNotMatch(html, /Tu setlist, lista para cantar\./i);
  assert.doesNotMatch(html, /Encuentra una canción al instante y ábrela en modo prompter\./i);
  assert.match(html, /<section id="setlist-view" class="view" aria-label="Setlist" tabindex="-1">/);
  assert.doesNotMatch(app, /setlist-heading/);
  assert.match(app, /\$\('#setlist-view'\)\.focus/);
  assert.match(sw, /CACHE = `\$\{CACHE_PREFIX\}v6`/);
});

test('page omits the footer copy from the refreshed offline shell', async () => {
  const [html, sw] = await Promise.all([read('index.html'), read('sw.js')]);
  assert.doesNotMatch(html, /Hecha para cantar, no para complicarte\./i);
  assert.doesNotMatch(html, /Las letras que agregues permanecen en tu dispositivo\./i);
  assert.doesNotMatch(html, /<footer\b/i);
  assert.match(sw, /CACHE = `\$\{CACHE_PREFIX\}v6`/);
});

test('PWA metadata and service worker preserve a public static-only offline shell', async () => {
  const [html, manifest, sw] = await Promise.all([read('index.html'), read('manifest.webmanifest'), read('sw.js')]);
  const parsed = JSON.parse(manifest);
  assert.equal(parsed.display, 'standalone');
  assert.equal(parsed.lang, 'es');
  assert.ok(parsed.icons.some(icon => icon.sizes === '192x192'));
  assert.ok(parsed.icons.some(icon => icon.sizes === '512x512' && icon.purpose.includes('maskable')));
  assert.match(html, /rel="manifest"/);
  assert.match(html, /apple-touch-icon/);
  assert.match(sw, /request\.method !== 'GET'/);
  assert.doesNotMatch(sw, /api\//i);
});

test('CSS includes narrow mobile, reduced-motion and visible focus contracts', async () => {
  const css = await read('styles.css');
  assert.match(css, /@media \(max-width: 520px\)/);
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /h1\[tabindex="-1"\]:focus\s*\{\s*outline:\s*none/);
  assert.match(css, /min-height: 44px/);
});
