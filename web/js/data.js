/* Public data only: Entur's station search, and the per-day train files built from Entur's archive. */

const GEOCODER = 'https://api.entur.io/geocoder/v1/autocomplete';
const HEADERS = { 'ET-Client-Name': 'innstilt-web' };
const DATA = 'data/vyg';

export async function searchStations(text) {
  if (!text || text.trim().length < 2) return [];
  const u = new URL(GEOCODER);
  u.search = new URLSearchParams({ text, layers: 'venue', size: '20', lang: 'no' });
  const r = await fetch(u, { headers: HEADERS });
  if (!r.ok) throw new Error(`station search ${r.status}`);
  const { features } = await r.json();
  return features
    .map(f => f.properties)
    .filter(p => (p.category || []).includes('railStation'))
    .slice(0, 8)
    .map(p => ({ id: p.id, name: p.name }));
}

let indexPromise = null;
export function loadIndex() {
  indexPromise ??= fetch(`${DATA}/index.json`, { cache: 'no-cache' })
    .then(r => (r.ok ? r.json() : { days: [] }))
    .catch(() => ({ days: [] }));
  return indexPromise;
}

const days = new Map();
export function loadDay(date) {
  if (!days.has(date)) {
    days.set(date, fetch(`${DATA}/${date}.json`).then(r => {
      if (!r.ok) throw new Error(`${date}: ${r.status}`);
      return r.json();
    }));
  }
  return days.get(date);
}
