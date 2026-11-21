/* Everything personal lives here, in this browser's localStorage, and nowhere else. */

const KEY = 'innstilt.v1';

const EMPTY = {
  welcomed: false,
  profile: { name: '', email: '', account: '', routes: [] },  /* routes: [{a, b, timesOut, timesBack}], a/b = {id, name} */
  tickets: [],   /* {code, validFrom: ms|null, validTo: ms|null} */
  claims: [],    /* {key, fromId, toId, fromName, toName, date, dep, line, depMs, case, status, amount, sentAt} */
  stats: { share: null, id: '', lastSent: '' },  /* opt-in anonymous statistics; share: null = not asked yet */
};

let state = load();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return migrate({ ...structuredClone(EMPTY), ...JSON.parse(raw) });
  } catch { /* blocked or corrupt: start empty */ }
  return structuredClone(EMPTY);
}

/** Older saves had one home/work pair; it becomes the first route. */
function migrate(s) {
  const p = s.profile = { ...structuredClone(EMPTY.profile), ...s.profile };
  if (!Array.isArray(p.routes) || (!p.routes.length && p.home && p.work)) {
    p.routes = p.home && p.work ? [{ a: p.home, b: p.work, timesOut: p.timesOut || [], timesBack: p.timesBack || [] }] : [];
  }
  for (const k of ['home', 'work', 'timesOut', 'timesBack']) delete p[k];
  return s;
}

function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); return true; } catch { return false; }
}

export const get = () => state;

export function update(fn) {
  fn(state);
  return save();
}

export function exportJson() {
  return JSON.stringify(state, null, 2);
}

export function wipe() {
  state = structuredClone(EMPTY);
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}

export const claimKey = (fromId, toId, depMs) => `${fromId}|${toId}|${depMs}`;

export function isReady() {
  const p = state.profile;
  return Boolean(p.name && p.email && p.account && p.routes.length && state.tickets.length);
}
