import { songs, filterSongs, lyricSearchUrl, geniusSearchUrl } from './songs.js';
import { createWakeLockManager } from './wake-lock.js';
import { createFullscreenController } from './fullscreen.js';
import { loadBundledLyrics, resolveLyrics } from './lyrics.js';
import { createScrollStepper } from './auto-scroll.js';

const $ = selector => document.querySelector(selector);
const storageKey = song => `letralista:lyrics:${song.id}`;
const FONT_SIZES = [22, 26, 30, 34, 38, 42, 46, 50, 54, 58, 62, 66, 70];
let currentSong = null;
let scrolling = false;
let animationFrame = null;
let lastFrame = 0;
let fontSize = getStoredFontSize();
let bundledLyrics = Object.create(null);
const scrollStepper = createScrollStepper();
const wakeLockManager = createWakeLockManager({
  isActive: () => scrolling,
  requestLock: () => navigator.wakeLock.request('screen')
});
const prompterShell = $('#prompter-shell');
const fullscreenController = createFullscreenController({
  applyActive: active => {
    prompterShell.classList.toggle('is-fullscreen', active);
    document.body.classList.toggle('prompter-focus-active', active);
    updateFullscreenButton(active);
  },
  requestNative: () => {
    const request = prompterShell.requestFullscreen || prompterShell.webkitRequestFullscreen;
    if (!request) return false;
    return Promise.resolve(request.call(prompterShell)).then(() => true);
  },
  exitNative: () => {
    const exit = document.exitFullscreen || document.webkitExitFullscreen;
    return exit ? exit.call(document) : undefined;
  },
  hasNativeElement: () => (document.fullscreenElement || document.webkitFullscreenElement) === prompterShell
});

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function getStoredFontSize() {
  try {
    const stored = Number(localStorage.getItem('letralista:font-size'));
    return FONT_SIZES.includes(stored) ? stored : 34;
  } catch {
    return 34;
  }
}

function renderSongs(list) {
  const container = $('#song-list');
  container.replaceChildren();
  for (const song of list) {
    const item = element('li', 'song-card');
    const main = element('a', 'song-main');
    main.href = `#/song/${song.id}`;
    main.setAttribute('aria-label', `Abrir ${song.title} en modo prompter`);
    const number = element('span', 'track-number', String(song.number).padStart(2, '0'));
    number.setAttribute('aria-hidden', 'true');
    const copy = element('span', 'song-copy');
    copy.append(element('strong', '', song.title), element('span', '', `${song.artist}${song.duration ? ` · ${song.duration}` : ''}`));
    const arrow = element('span', 'open-arrow', '→');
    arrow.setAttribute('aria-hidden', 'true');
    main.append(number, copy, arrow);

    const actions = element('div', 'song-actions');
    const web = element('a', '', 'Buscar letra ');
    web.href = lyricSearchUrl(song);
    web.target = '_blank';
    web.rel = 'noopener noreferrer';
    web.setAttribute('aria-label', `Buscar letra de ${song.title} en la web`);
    const external = element('span', '', '↗');
    external.setAttribute('aria-hidden', 'true');
    web.append(external);
    const genius = element('a', '', 'Genius');
    genius.href = geniusSearchUrl(song);
    genius.target = '_blank';
    genius.rel = 'noopener noreferrer';
    genius.setAttribute('aria-label', `Buscar ${song.title} en Genius`);
    actions.append(web, genius);
    item.append(main, actions);
    container.append(item);
  }
  const count = list.length;
  $('#results-status').textContent = `${count} ${count === 1 ? 'canción' : 'canciones'}`;
  $('#empty-results').hidden = count !== 0;
}

function updateSearch() {
  const query = $('#song-search').value;
  const filtered = filterSongs(songs, query);
  renderSongs(filtered);
  $('#clear-search').hidden = !query;
  const url = new URL(location.href);
  if (query) url.searchParams.set('q', query); else url.searchParams.delete('q');
  history.replaceState(null, '', `${url.pathname}${url.search}#/`);
}

function getLyrics(song) {
  let stored = null;
  try { stored = localStorage.getItem(storageKey(song)); } catch { /* use bundled lyrics */ }
  return resolveLyrics(song.id, stored, bundledLyrics);
}

function storeLyrics(song, value) {
  const clean = value.replace(/\r\n/g, '\n').trim();
  try {
    if (clean) localStorage.setItem(storageKey(song), clean);
    else localStorage.removeItem(storageKey(song));
    return clean;
  } catch {
    return null;
  }
}

function showEditor() {
  stopScroll();
  $('#lyrics-empty').hidden = true;
  $('#prompter-shell').hidden = true;
  $('#lyrics-form').hidden = false;
  $('#lyrics-editor').value = getLyrics(currentSong);
  $('#lyrics-editor').focus();
}

function showSong(song) {
  stopScroll();
  void fullscreenController.exit();
  currentSong = song;
  document.title = `${song.title} · LetraLista`;
  $('#setlist-view').hidden = true;
  $('#prompter-view').hidden = false;
  $('#prompter-title').textContent = song.title;
  $('#prompter-artist').textContent = song.artist;
  $('#prompter-position').textContent = `${song.number} de ${songs.length}`;
  $('#web-lyrics-search').href = lyricSearchUrl(song);
  const lyrics = getLyrics(song);
  $('#lyrics-form').hidden = true;
  $('#prompter-shell').hidden = !lyrics;
  $('#lyrics-empty').hidden = Boolean(lyrics);
  $('#edit-lyrics').textContent = lyrics ? 'Editar letra' : 'Agregar letra';
  if (lyrics) {
    $('#lyrics-display').textContent = lyrics;
    applyFontSize();
    $('#prompter-scroll').scrollTop = 0;
  }
  renderAdjacent(song);
  requestAnimationFrame(() => $('#prompter-title').focus());
}

function renderAdjacent(song) {
  const index = songs.indexOf(song);
  const previous = songs[index - 1];
  const next = songs[index + 1];
  const nav = $('#adjacent-songs');
  nav.replaceChildren();
  if (previous) nav.append(adjacentLink(previous, '←', 'Anterior'));
  else nav.append(document.createElement('span'));
  if (next) nav.append(adjacentLink(next, '→', 'Siguiente'));
}

function adjacentLink(song, arrow, label) {
  const link = element('a', 'adjacent-link');
  link.href = `#/song/${song.id}`;
  const icon = element('i', '', arrow);
  icon.setAttribute('aria-hidden', 'true');
  link.append(element('span', '', label), element('strong', '', song.title), icon);
  link.setAttribute('aria-label', `${label}: ${song.title}`);
  return link;
}

function showSetlist() {
  stopScroll();
  void fullscreenController.exit();
  document.title = 'LetraLista · Setlist del concierto';
  $('#prompter-view').hidden = true;
  $('#setlist-view').hidden = false;
  currentSong = null;
  requestAnimationFrame(() => $('#setlist-view').focus());
}

function route() {
  const match = location.hash.match(/^#\/song\/(.+)$/);
  if (!match) return showSetlist();
  const song = songs.find(item => item.id === match[1]);
  if (song) showSong(song); else location.hash = '#/';
}

function applyFontSize() {
  $('#lyrics-display').dataset.fontSize = String(fontSize);
  try { localStorage.setItem('letralista:font-size', String(fontSize)); } catch { /* display still works */ }
}

function updatePlayButton() {
  const icon = element('span', '', scrolling ? 'Ⅱ' : '▶');
  icon.setAttribute('aria-hidden', 'true');
  const button = $('#prompter-play');
  button.replaceChildren(icon, element('span', '', scrolling ? 'Pausar' : 'Iniciar'));
  button.setAttribute('aria-pressed', String(scrolling));
}

function updateFullscreenButton(active = fullscreenController.isActive()) {
  const button = $('#prompter-fullscreen');
  button.setAttribute('aria-pressed', String(active));
  button.setAttribute('aria-label', active ? 'Salir de pantalla completa' : 'Ver en pantalla completa');
}

function scrollFrame(time) {
  if (!scrolling) return;
  if (!lastFrame) lastFrame = time;
  const speed = Number($('#scroll-speed').value);
  const surface = $('#prompter-scroll');
  scrollStepper.advance(surface, speed * (time - lastFrame) / 1000);
  lastFrame = time;
  if (surface.scrollTop + surface.clientHeight >= surface.scrollHeight - 2) return stopScroll();
  animationFrame = requestAnimationFrame(scrollFrame);
}

function startScroll() {
  scrolling = true; lastFrame = 0; scrollStepper.reset(); updatePlayButton();
  if ('wakeLock' in navigator) void wakeLockManager.acquire();
  animationFrame = requestAnimationFrame(scrollFrame);
}

function stopScroll() {
  scrolling = false; lastFrame = 0; scrollStepper.reset();
  if (animationFrame) cancelAnimationFrame(animationFrame);
  animationFrame = null; updatePlayButton(); void wakeLockManager.release();
}

$('#song-search').addEventListener('input', updateSearch);
$('#clear-search').addEventListener('click', () => { $('#song-search').value = ''; updateSearch(); $('#song-search').focus(); });
$('#reset-search').addEventListener('click', () => { $('#song-search').value = ''; updateSearch(); $('#song-search').focus(); });
$('#edit-lyrics').addEventListener('click', showEditor);
$('#lyrics-form').addEventListener('submit', event => {
  event.preventDefault();
  const lyrics = storeLyrics(currentSong, $('#lyrics-editor').value);
  if (lyrics === null) { $('#lyrics-editor').setCustomValidity('El navegador no permitió guardar la letra. Revisa la configuración de almacenamiento e inténtalo de nuevo.'); $('#lyrics-editor').reportValidity(); return; }
  if (!lyrics) { $('#lyrics-editor').setCustomValidity('Pega una letra antes de guardar.'); $('#lyrics-editor').reportValidity(); return; }
  $('#lyrics-editor').setCustomValidity('');
  showSong(currentSong);
});
$('#lyrics-editor').addEventListener('input', event => event.currentTarget.setCustomValidity(''));
$('#cancel-edit').addEventListener('click', () => showSong(currentSong));
$('#font-decrease').addEventListener('click', () => { fontSize = Math.max(22, fontSize - 4); applyFontSize(); });
$('#font-increase').addEventListener('click', () => { fontSize = Math.min(70, fontSize + 4); applyFontSize(); });
$('#scroll-speed').addEventListener('input', event => { $('#speed-value').value = event.currentTarget.value; });
$('#prompter-play').addEventListener('click', () => scrolling ? stopScroll() : startScroll());
$('#prompter-reset').addEventListener('click', () => { stopScroll(); $('#prompter-scroll').scrollTo({ top: 0, behavior: 'smooth' }); });
$('#prompter-fullscreen').addEventListener('click', () => void fullscreenController.toggle());
document.addEventListener('fullscreenchange', () => fullscreenController.handleNativeChange());
document.addEventListener('webkitfullscreenchange', () => fullscreenController.handleNativeChange());
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && scrolling && 'wakeLock' in navigator) void wakeLockManager.acquire();
});
window.addEventListener('hashchange', route);

async function initialize() {
  bundledLyrics = await loadBundledLyrics('./lyrics.json', songs.map(song => song.id));
  const initialQuery = new URL(location.href).searchParams.get('q') || '';
  $('#song-search').value = initialQuery;
  renderSongs(filterSongs(songs, initialQuery));
  $('#clear-search').hidden = !initialQuery;
  route();
}

void initialize();

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}
