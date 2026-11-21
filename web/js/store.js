/* Everything personal lives here, in this browser's localStorage, and nowhere else. */

const KEY = 'innstilt.v1';

const EMPTY = {
  welcomed: false,
  profile: { name: '', email: '', account: '', routes: [] },  /* routes: [{a, b, timesOut, timesBack}], a/b = {id, name} */
  tickets: [],   /* {code, validFrom: ms|null, validTo: ms|null} */
  claims: [],    /* {key, fromId, toId, fromName, toName, date, dep, line, depMs, case, status, amount, sentAt} */
  homeDone: false,
  testerDone: false,  /* Android test invitation dismissed */  /* "add to home screen" card dismissed for good */
  stats: { share: null, id: '', lastSent: '' },
  pendingCases: {},  /* claimKey -> case number caught by the bookmarklet before the claim was marked sent */  /* opt-in anonymous statistics; share: null = not asked yet */
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

/* Another tab (e.g. the one the bookmarklet opens with a case number) changed the data: reload it here,
   so this tab never writes back an older copy over it. */
const listeners = [];
export const onExternalChange = fn => listeners.push(fn);
addEventListener('storage', e => {
  if (e.key !== KEY) return;
  state = load();
  listeners.forEach(fn => fn());
});

/* Every change starts from what is stored right now, not from this tab's copy in memory. Otherwise a tab
   opened earlier (or running an older version of the app) would write its older copy back over changes made
   in another tab, e.g. a claim marked as sent. If storage is unavailable, the copy in memory is used. */
function stored() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? migrate({ ...structuredClone(EMPTY), ...JSON.parse(raw) }) : null;
  } catch { return null; }
}

export function update(fn) {
  state = stored() || state;
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

/* ---------- import (a file from "Download my data", possibly from another device) ----------
   The file is untrusted: every field is type-checked and trimmed, unknown fields are dropped.
   Profile, tickets and regular trips are replaced by the file's; claims are merged (same trip = kept once).
   If the file's device shared anonymous statistics, its sharing id comes along: both devices then report
   under one id, and the server replaces (never adds) an id's numbers, so nothing is counted twice.
   Settings that belong to this device (bookmark, welcome) are not imported. */

const STATION = /^NSR:StopPlace:\d+$/;
const REF = /^[A-Z0-9]{3}-[A-Z0-9]{3}-[A-Z0-9]{3}$/;
const str = (x, max = 200) => (typeof x === 'string' ? x.trim().slice(0, max) : '');
const num = x => (typeof x === 'number' && Number.isFinite(x) ? x : null);
const list = x => (Array.isArray(x) ? x : []);
const station = x => (x && STATION.test(x.id) ? { id: x.id, name: str(x.name, 100) || x.id } : null);
const hhmmList = x => list(x).filter(v => typeof v === 'string' && /^\d\d:\d\d$/.test(v)).slice(0, 24);

function cleanClaim(c) {
  if (!c || !STATION.test(c.fromId) || !STATION.test(c.toId) || num(c.depMs) === null
      || !/^\d{4}-\d\d-\d\d$/.test(c.date) || !/^\d\d:\d\d$/.test(c.dep)) return null;
  const status = ['pending', 'paid', 'rejected'].includes(c.status) ? c.status : 'pending';
  const amount = num(c.amount);
  return {
    key: claimKey(c.fromId, c.toId, c.depMs), fromId: c.fromId, toId: c.toId,
    fromName: str(c.fromName, 100) || c.fromId, toName: str(c.toName, 100) || c.toId,
    date: c.date, dep: c.dep, line: str(c.line, 12), depMs: c.depMs,
    case: str(String(c.case ?? ''), 20).replace(/\D/g, ''), status,
    amount: status === 'paid' && amount !== null && amount >= 0 && amount < 100000 ? amount : null,
    sentAt: num(c.sentAt) || Date.now(), ...(c.earlier === true ? { earlier: true } : {}),
  };
}

/** Returns {claims, tickets, routes, sharing, dropId}: counts, whether sharing came along, and this device's
    old sharing id to delete on the server (or null). Throws Error('bad') for a file that isn't ours. */
export function importJson(text) {
  let d;
  try { d = JSON.parse(text); } catch { throw new Error('bad'); }
  if (!d || typeof d !== 'object' || !d.profile || typeof d.profile !== 'object' || !Array.isArray(d.claims)) {
    throw new Error('bad');
  }
  const src = migrate({ ...structuredClone(EMPTY), profile: { ...d.profile } });  /* old home/work files too */
  const p = src.profile;
  const routes = list(p.routes).map(r => ({
    a: station(r?.a), b: station(r?.b), timesOut: hhmmList(r?.timesOut), timesBack: hhmmList(r?.timesBack),
  })).filter(r => r.a && r.b && r.a.id !== r.b.id).slice(0, 20);
  const tickets = list(d.tickets).map(t => ({
    code: str(t?.code, 11).toUpperCase(), validFrom: num(t?.validFrom), validTo: num(t?.validTo),
  })).filter(t => REF.test(t.code)).slice(0, 60);
  const incoming = list(d.claims).map(cleanClaim).filter(Boolean).slice(0, 5000);
  const have = new Set(state.claims.map(c => c.key));
  const added = incoming.filter(c => !have.has(c.key) && have.add(c.key));
  state.profile = { name: str(p.name), email: str(p.email, 254), account: str(p.account, 20).replace(/\D/g, ''), routes };
  state.tickets = tickets.sort((a, b) => (a.validFrom || 0) - (b.validFrom || 0));
  state.claims.push(...added);
  state.welcomed = true;
  const sid = d.stats?.share === true && /^[0-9a-f]{32}$/.test(d.stats.id) ? d.stats.id : null;
  let dropId = null;
  if (sid) {
    if (state.stats?.share && state.stats.id && state.stats.id !== sid) dropId = state.stats.id;
    state.stats = { share: true, id: sid, lastSent: '' };
  }
  save();
  return { claims: added.length, tickets: tickets.length, routes: routes.length, sharing: Boolean(sid), dropId };
}
