import test from 'node:test';
import assert from 'node:assert/strict';
import { songs, filterSongs, lyricSearchUrl, geniusSearchUrl } from '../songs.js';

test('contains all 11 visible screenshot songs in setlist order', () => {
  assert.equal(songs.length, 11);
  assert.deepEqual(songs.map(({ title }) => title), [
    'A Través del Vaso', 'Me la Aventé', 'Ojos Cerrados', 'Como Lo Hice Yo',
    'ALCH SI', 'Decreté', 'Ahí Estabas Tú', 'She Hurts Like Tequila',
    'Secuelas de Amor', 'Love to Be Loved', 'Ruca'
  ]);
});

test('search ignores case, accents, artist punctuation and whitespace', () => {
  assert.deepEqual(filterSongs(songs, '  CARIN  ').map(s => s.title).length, 11);
  assert.deepEqual(filterSongs(songs, 'decrete').map(s => s.title), ['Decreté']);
  assert.deepEqual(filterSongs(songs, 'grupo frontera').map(s => s.title), ['ALCH SI']);
  assert.deepEqual(filterSongs(songs, 'the warning').map(s => s.title), ['Love to Be Loved']);
});

test('lyric actions are prefilled HTTPS searches and never embed lyrics', () => {
  for (const song of songs) {
    const google = new URL(lyricSearchUrl(song));
    const genius = new URL(geniusSearchUrl(song));
    assert.equal(google.protocol, 'https:');
    assert.equal(google.hostname, 'www.google.com');
    assert.match(google.searchParams.get('q'), /letra|lyrics/i);
    assert.equal(genius.hostname, 'genius.com');
    assert.match(decodeURIComponent(genius.searchParams.get('q')), new RegExp(song.title, 'i'));
    assert.equal('lyrics' in song, false);
  }
});
