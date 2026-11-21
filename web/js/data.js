/* Public data only: Entur's station search, today's trains from Entur's live Journey Planner, and the
   per-day train files built from Entur's archive. */

const GEOCODER = 'https://api.entur.io/geocoder/v1/autocomplete';
const HEADERS = { 'ET-Client-Name': 'innstilt-web' };
const DATA = 'data/vyg';
const JP = 'https://api.entur.io/journey-planner/v3/graphql';
const LIVE_Q = `query($id: String!, $t: DateTime!, $range: Int!) {
  stopPlace(id: $id) {
    estimatedCalls(startTime: $t, timeRange: $range, numberOfDepartures: 200,
                   whiteListedModes: [rail], includeCancelledTrips: true) {
      aimedDepartureTime cancellation realtime
      serviceJourney {
        id line { publicCode }
        estimatedCalls {
          quay { stopPlace { id name parent { id name } } }
          aimedArrivalTime expectedArrivalTime actualArrivalTime cancellation realtime
        }
      }
    }
  }
}`;

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

/* Live departures from a station between two instants, fetched in 1-hour pieces (big stations hit the
   200-departure cap otherwise). Each piece is reused for a minute, so re-rendering doesn't refetch. */
const live = new Map();
const HOUR = 3600000, FIVE_MIN = 300000;

export async function liveCalls(stationId, startMs, endMs) {
  const pieces = [];
  for (let t = Math.floor(startMs / FIVE_MIN) * FIVE_MIN; t < endMs; t += HOUR) pieces.push(livePiece(stationId, t));
  const seen = new Map();
  for (const c of (await Promise.all(pieces)).flat()) seen.set(`${c.serviceJourney.id}|${c.aimedDepartureTime}`, c);
  return [...seen.values()];
}

function livePiece(id, t) {
  const key = `${id}|${t}`;
  const hit = live.get(key);
  if (hit && Date.now() - hit.at < 60000) return hit.p;
  const p = fetch(JP, {
    method: 'POST',
    headers: { ...HEADERS, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: LIVE_Q, variables: { id, t: new Date(t).toISOString(), range: HOUR / 1000 } }),
  }).then(r => {
    if (!r.ok) throw new Error(`live ${r.status}`);
    return r.json();
  }).then(d => {
    if (d.errors) throw new Error(d.errors[0]?.message || 'live error');
    return d.data?.stopPlace?.estimatedCalls || [];
  });
  live.set(key, { at: Date.now(), p });
  p.catch(() => live.delete(key));
  return p;
}

let statsPromise = null;
/** Monthly per-line statistics built nightly (tools/archive/build_web_data.py), or null. */
export function loadStats() {
  statsPromise ??= fetch(`${DATA}/stats.json`, { cache: 'no-cache' })
    .then(r => (r.ok ? r.json() : null)).catch(() => null);
  return statsPromise;
}
