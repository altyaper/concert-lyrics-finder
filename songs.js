export const songs = Object.freeze([
  { title: 'A Través del Vaso', artist: 'Carín León', duration: '3:03' },
  { title: 'Me la Aventé', artist: 'Carín León', duration: '2:36' },
  { title: 'Ojos Cerrados', artist: 'Banda MS & Carín León', duration: '3:01' },
  { title: 'Como Lo Hice Yo', artist: 'Matisse & Carín León', duration: '2:58' },
  { title: 'ALCH SI', artist: 'Carín León & Grupo Frontera', duration: '2:34' },
  { title: 'Decreté', artist: 'Carín León', duration: '2:35' },
  { title: 'Ahí Estabas Tú', artist: 'Carín León', duration: '1:53' },
  { title: 'She Hurts Like Tequila', artist: 'Cody Johnson & Carín León', duration: '3:23' },
  { title: 'Secuelas de Amor', artist: 'Carín León', duration: '2:35' },
  { title: 'Love to Be Loved', artist: 'The Warning & Carín León', duration: '2:50' },
  { title: 'Ruca', artist: 'Carín León', duration: null }
].map((song, index) => ({ ...song, id: `${index + 1}-${slug(song.title)}`, number: index + 1 })));

function slug(value) {
  return normalize(value).replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export function normalize(value) {
  return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/\s+/g, ' ');
}

export function filterSongs(list, query) {
  const needle = normalize(query);
  if (!needle) return list;
  return list.filter(song => normalize(`${song.title} ${song.artist}`).includes(needle));
}

function searchText(song) {
  return `${song.title} ${song.artist} letra`;
}

export function lyricSearchUrl(song) {
  const params = new URLSearchParams({ q: searchText(song) });
  return `https://www.google.com/search?${params}`;
}

export function geniusSearchUrl(song) {
  const params = new URLSearchParams({ q: `${song.title} ${song.artist}` });
  return `https://genius.com/search?${params}`;
}
