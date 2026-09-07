export function normalizeLyricsPayload(payload, validIds) {
  const normalized = Object.create(null);
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return normalized;

  for (const id of validIds) {
    const value = payload[id];
    if (typeof value !== 'string') continue;
    const clean = value.replace(/\r\n?/g, '\n').trim();
    if (clean) normalized[id] = clean;
  }
  return normalized;
}

export async function loadBundledLyrics(url, validIds, request = globalThis.fetch) {
  try {
    const response = await request(url, { cache: 'no-cache' });
    if (!response?.ok) return Object.create(null);
    return normalizeLyricsPayload(await response.json(), validIds);
  } catch {
    return Object.create(null);
  }
}

export function resolveLyrics(songId, storedValue, bundledLyrics) {
  if (typeof storedValue === 'string') return storedValue;
  const bundled = bundledLyrics?.[songId];
  return typeof bundled === 'string' ? bundled : '';
}
