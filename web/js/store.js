/* Everything personal lives here, in this browser's localStorage, and nowhere else. */

const KEY = 'innstilt.v1';

const EMPTY = {
  welcomed: false,
  profile: { name: '', email: '', account: '', home: null, work: null, timesOut: [], timesBack: [] },
  tickets: [],   /* {code, validFrom: ms|null, validTo: ms|null} */
  claims: [],    /* {key, fromId, toId, fromName, toName, date, dep, line, depMs, case, status, amount, sentAt} */
};

let state = load();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...structuredClone(EMPTY), ...JSON.parse(raw) };
  } catch { /* blocked or corrupt: start empty */ }
  return structuredClone(EMPTY);
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
  return Boolean(p.name && p.email && p.account && p.home && p.work && state.tickets.length);
}
