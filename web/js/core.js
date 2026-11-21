/* Pure logic shared by the app: validation, tickets, journeys, eligibility, Vy claim link.
   Ported from cli/innstilt.py. Times are Oslo local time unless named *Utc. */

export const FORM_URL = 'https://www.vy.no/kundeservice/skjema/prisavslag-og-erstatning';
export const DEFAULT_THRESHOLD = 30;   /* minutes; 60 on Oslo-Bergen and Flåm-Myrdal */
export const DEFAULT_WINDOW = 120;     /* minutes either side of usual travel times */
export const CLAIM_DEADLINE_DAYS = 90;

/* ---------- validation ---------- */

export function validRef(text) {
  let c = (text || '').trim().toUpperCase().replace(/\s+/g, '');
  if (c.length === 9 && !c.includes('-')) c = `${c.slice(0, 3)}-${c.slice(3, 6)}-${c.slice(6)}`;
  return /^[A-Z0-9]{3}-[A-Z0-9]{3}-[A-Z0-9]{3}$/.test(c) ? c : null;
}

/** As-you-type look of a reference code: capitals, a dash after every 3 characters, at most 9 characters. */
export function formatRef(text) {
  const c = (text || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 9);
  return c.match(/.{1,3}/g)?.join('-') ?? '';
}

/** As-you-type mask for digit fields split into fixed-size parts, e.g. dates [2,2,4] '/' and times [2,2] ':'.
    `firstMax[k]`: the largest first digit part k can have and still take a second one (day 3, month 1, hour 2);
    a bigger first digit gets a leading zero (4 -> 04). Separators the user types close a part (3/ -> 03/).
    A separator is shown as soon as the part before it is complete. */
function mask(text, sizes, sep, firstMax = []) {
  const parts = sizes.map(() => '');
  let i = 0;
  for (const ch of text || '') {
    if (i >= sizes.length) break;
    if (/\d/.test(ch)) {
      parts[i] = parts[i] === '' && firstMax[i] && ch > firstMax[i] ? `0${ch}` : parts[i] + ch;
      if (parts[i].length === sizes[i]) i += 1;
    } else if (parts[i] !== '' && i < sizes.length - 1) {
      parts[i] = parts[i].padStart(sizes[i], '0');
      i += 1;
    }
  }
  let out = parts[0];
  for (let k = 1; k < sizes.length && parts[k - 1].length === sizes[k - 1]; k += 1) out += sep + parts[k];
  return out;
}

/** dd/mm/yyyy while typing. */
export const formatDateInput = text => mask(text, [2, 2, 4], '/', ['3', '1']);
/** hh:mm while typing. */
export const formatTimeInput = text => mask(text, [2, 2], ':', ['2']);

/** Norwegian account number: 11 digits with a MOD11 check digit. Returns digits or null. */
export function validAccount(text) {
  const d = (text || '').replace(/\D/g, '');
  if (d.length !== 11) return null;
  const w = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  const s = w.reduce((acc, wi, i) => acc + wi * Number(d[i]), 0);
  let k = 11 - (s % 11);
  if (k === 11) k = 0;
  return k !== 10 && k === Number(d[10]) ? d : null;
}

export function validEmail(text) {
  const e = (text || '').trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) ? e : null;
}

export function parseTimes(text) {
  const out = new Set();
  for (const tok of (text || '').split(/[\s,;]+/).filter(Boolean).map(x => x.replace(/[:.]$/, ''))) {
    const m = tok.match(/^(\d{1,2})(?:[:.]?(\d{2}))?$/);  /* 7:15, 0715, 715, or a bare hour: 9 */
    const mi = m?.[2] ?? '00';
    if (!m || Number(m[1]) > 23 || Number(mi) > 59) return null;
    out.add(`${m[1].padStart(2, '0')}:${mi}`);
  }
  return [...out].sort();
}

/* ---------- dates in Oslo time ---------- */

/** Minutes the Europe/Oslo clock is ahead of UTC at instant `ms`. */
function osloOffsetMin(ms) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Oslo', hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  }).formatToParts(new Date(ms)).map(p => [p.type, p.value]));
  const wallAsUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute);
  return Math.round((wallAsUtc - Math.floor(ms / 60000) * 60000) / 60000);
}

/** 'YYYY-MM-DD' + 'HH:MM' Oslo local -> epoch ms (handles summer/winter time). */
export function osloToMs(date, time) {
  const [y, mo, d] = date.split('-').map(Number);
  const [h, mi] = (time || '00:00').split(':').map(Number);
  const wall = Date.UTC(y, mo - 1, d, h, mi);
  const first = wall - osloOffsetMin(wall) * 60000;
  const second = wall - osloOffsetMin(first) * 60000;  /* corrects guesses near a DST switch */
  return second;
}

/** 'dd/mm/yyyy' (also d.m.yyyy, d-m-yyyy) + 'hh:mm' -> epoch ms (Oslo time); '' -> null; bad -> NaN. */
export function parseEuDateTime(dateText, timeText) {
  const d = (dateText || '').trim();
  if (!d) return null;
  const m = d.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  const tm = (timeText || '00:00').trim().match(/^(\d{1,2})(?:[:.]?(\d{2}))?[:.]?$/);  /* 07:15, 0715, 9, 09: */
  if (!m || !tm) return NaN;
  const [day, mon, year, h, mi] = [+m[1], +m[2], +m[3], +tm[1], +(tm[2] ?? 0)];
  const check = new Date(Date.UTC(year, mon - 1, day));
  if (check.getUTCDate() !== day || check.getUTCMonth() !== mon - 1 || h > 23 || mi > 59) return NaN;
  const iso = `${year}-${String(mon).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  return osloToMs(iso, `${String(h).padStart(2, '0')}:${String(mi).padStart(2, '0')}`);
}

/** epoch ms -> ['dd/mm/yyyy', 'hh:mm'] in Oslo time. */
export function formatEu(ms) {
  if (!ms) return ['', ''];
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Oslo', hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
    .formatToParts(new Date(ms)).map(x => [x.type, x.value]));
  return [`${p.day}/${p.month}/${p.year}`, `${p.hour}:${p.minute}`];
}

export function todayOslo(ms = Date.now()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Oslo' }).format(new Date(ms));
}

export function addDays(date, n) {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

/** Days left to claim a trip on `date` (Vy: within 3 months, counted here as CLAIM_DEADLINE_DAYS). */
export function daysLeft(date, today = todayOslo()) {
  const day = d => Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10)) / 86400000;
  return CLAIM_DEADLINE_DAYS - (day(today) - day(date));
}

export const DEADLINE_WARN_DAYS = 14;

const minutes = hhmm => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));

/* ---------- tickets ---------- */

/** All tickets valid at `ms`, latest start first. Tickets without dates count as always valid. */
export function ticketsFor(tickets, ms) {
  const ok = (tickets || []).filter(t =>
    (!t.validFrom || t.validFrom <= ms) && (!t.validTo || ms < t.validTo));
  return ok.sort((a, b) => (b.validFrom || 0) - (a.validFrom || 0));
}

/** The ticket valid at `ms` (latest start wins), or null. */
export function ticketFor(tickets, ms) {
  return ticketsFor(tickets, ms)[0] || null;
}

/** {kind, date} for an unobtrusive notice, or null. kinds: none | undated | expired | expiring */
export function ticketNotice(tickets, now = Date.now()) {
  if (!tickets || !tickets.length) return { kind: 'none' };
  if (tickets.some(t => !t.validTo)) return { kind: 'undated' };
  const last = Math.max(...tickets.map(t => t.validTo));
  if (last <= now) return { kind: 'expired', date: last };
  if (last - now < 3 * 86400000) return { kind: 'expiring', date: last };
  return null;
}

/* ---------- journeys from a day file (tools/archive/build_web_data.py) ---------- */

/** Trains from station `fromId` that later call at `toId`, with planned vs actual arrival. */
export function journeysForRoute(day, fromId, toId) {
  const idx = {};
  for (const [i, [id]] of Object.entries(day.stops)) idx[id] = Number(i);
  const fi = idx[fromId], ti = idx[toId];
  if (fi === undefined || ti === undefined) return [];
  const out = [];
  for (const j of day.journeys) {
    const a = j.calls.findIndex(c => c[0] === fi && c[2]);
    if (a < 0) continue;
    const b = j.calls.findIndex((c, k) => k > a && c[0] === ti && c[1]);
    if (b < 0) continue;
    const f = j.calls[a], t = j.calls[b];
    /* notRun: planned, but Entur's data shows no trace of it running (standstill or data gap) */
    const cancelled = j.cancelled || f[4] === 1 || t[4] === 1 || Boolean(j.notRun);
    const aimedArrMs = osloToMs(day.date, t[1]) + (t[1] < f[2] ? 86400000 : 0);
    let realArrMs = null;
    if (t[3]) {
      realArrMs = osloToMs(day.date, t[3].slice(0, 5)) + Number(t[3].slice(6, 8) || 0) * 1000;
      if (realArrMs < aimedArrMs - 12 * 3600000) realArrMs += 86400000;  /* after midnight */
    }
    out.push({
      id: j.id, line: j.line, dest: j.dest, extra: j.extra, date: day.date, notRun: Boolean(j.notRun),
      dep: f[2], arr: t[1],
      depMs: osloToMs(day.date, f[2]), aimedArrMs, realArrMs,
      recorded: realArrMs !== null, cancelled,
      delayMin: realArrMs !== null && !cancelled ? Math.round((realArrMs - aimedArrMs) / 60000) : null,
    });
  }
  return out.sort((x, y) => x.depMs - y.depMs);
}

/* ---------- today's trains from Entur's live Journey Planner (web/js/data.js liveCalls) ---------- */

const stationOf = call => call.quay?.stopPlace?.parent?.id || call.quay?.stopPlace?.id;

/** One live departure from `fromId` -> the same shape as journeysForRoute, or null if it doesn't reach `toId`
    or isn't Vy's (live data has every operator; the archive files hold only the Vy group, ids "VYG:...").
    delayMin is set only once the train has actually arrived; while it runs, expectedMin holds the forecast. */
export function liveJourney(c, fromId, toId) {
  if (!c.serviceJourney?.id?.startsWith('VYG:')) return null;  /* Vy's trains only (not SJ, Go-Ahead, Flytoget) */
  const calls = c.serviceJourney?.estimatedCalls || [];
  const ids = calls.map(stationOf);
  const a = ids.indexOf(fromId);
  const b = a < 0 ? -1 : ids.indexOf(toId, a + 1);
  if (b < 0) return null;
  const f = calls[a], t = calls[b];
  const depMs = Date.parse(c.aimedDepartureTime), aimedArrMs = Date.parse(t.aimedArrivalTime);
  const cancelled = Boolean(c.cancellation || f.cancellation || t.cancellation);
  const realArrMs = t.actualArrivalTime ? Date.parse(t.actualArrivalTime) : null;
  const expMs = realArrMs === null && t.realtime && t.expectedArrivalTime ? Date.parse(t.expectedArrivalTime) : null;
  const last = calls[calls.length - 1].quay?.stopPlace || {};
  /* at the departure station: when it actually left, or is expected to; and the platform */
  const depActualMs = c.actualDepartureTime ? Date.parse(c.actualDepartureTime) : null;
  const depExpectedMs = c.realtime && c.expectedDepartureTime ? Date.parse(c.expectedDepartureTime) : null;
  return {
    platform: c.quay?.publicCode || '', depActualMs, depExpectedMs, realtime: Boolean(c.realtime),
    depDelayMin: depActualMs !== null ? Math.round((depActualMs - depMs) / 60000)
      : depExpectedMs !== null ? Math.round((depExpectedMs - depMs) / 60000) : null,
    id: c.serviceJourney.id, line: c.serviceJourney.line?.publicCode || '', live: true, extra: false,
    dest: (last.parent?.name || last.name || '').replace(/ stasjon$/, ''),
    date: todayOslo(depMs), dep: formatEu(depMs)[1], arr: formatEu(aimedArrMs)[1],
    depMs, aimedArrMs, realArrMs, recorded: realArrMs !== null, cancelled,
    delayMin: realArrMs !== null && !cancelled ? Math.round((realArrMs - aimedArrMs) / 60000) : null,
    expectedMin: expMs !== null && !cancelled ? Math.round((expMs - aimedArrMs) / 60000) : null,
  };
}

export function eligible(j, threshold = DEFAULT_THRESHOLD) {
  if (j.extra) return false;
  return j.cancelled || (j.delayMin || 0) > threshold;
}

/** Eligible and claimable now: a cancelled train can be claimed once its departure time has passed. */
export function claimable(j, now = Date.now(), threshold = DEFAULT_THRESHOLD) {
  return eligible(j, threshold) && j.depMs <= now;
}

export function nextTrain(js, j) {
  return js.find(x => x.depMs > j.depMs && !x.cancelled) || null;
}

/** For a cancelled train: how late you'd have arrived on the next one (minutes), or null. */
export function effectiveDelay(j, next) {
  if (!next) return null;
  return Math.round(((next.realArrMs ?? next.aimedArrMs) - j.aimedArrMs) / 60000);
}

export function nearUsual(j, times, window = DEFAULT_WINDOW) {
  if (!times || !times.length) return true;
  const m = minutes(j.dep);
  return times.some(t => Math.abs(m - minutes(t)) <= window);
}

/* ---------- Vy's claim form link ---------- */

/** Matches the form's own ids, e.g. R31-2026-11-19T15:44Z-Jaren (planned departure in UTC). */
export function vyDepartureId(j) {
  const iso = new Date(j.depMs).toISOString();
  return `${j.line}-${iso.slice(0, 16)}Z-${j.dest}`;
}

/** A ticket bought outside Vy (Ruter app, Entur, ...): Vy's form takes it on its "manual" path, with a
    picture of the ticket instead of a reference code. */
export const isOtherTicket = tk => tk?.kind === 'other';
/** Stable id for a ticket (Vy reference code, or the other ticket's number and start). */
export const ticketId = tk => (isOtherTicket(tk) ? `other:${tk.number || ''}:${tk.validFrom || ''}` : tk.code);

export function claimLink(profile, ticket, from, to, j) {
  const p = new URLSearchParams({
    step: '4',
    ...(isOtherTicket(ticket) ? { ticketInputType: 'MANUAL' } : { ticketInputType: 'REFERENCE_CODE', referenceCode: ticket.code }),
    'manualJourneyInfo.departureStation.stationName': from.name,
    'manualJourneyInfo.departureStation.nsrCode': from.id,
    'manualJourneyInfo.arrivalStation.stationName': to.name,
    'manualJourneyInfo.arrivalStation.nsrCode': to.id,
    'manualJourneyInfo.date': j.date,
    'manualJourneyInfo.time': j.dep,
    complaintType: 'DELAY_OR_CANCELLATION',
    arrivedAtDestination: 'YES',
    hadExpenses: 'NO',
    'manualJourneyInfo.returnJourney.hasReturn': 'false',
    departureList: vyDepartureId(j),
    'contactInfo.name': profile.name,
    'contactInfo.email': profile.email,
    'bankDetails.accountType': 'NORWEGIAN',
    'bankDetails.norwegianAccountNumber': profile.account,
  });
  return `${FORM_URL}?${p}`;
}

/* ---------- "most cancelled line of the month" (data/vyg/stats.json) ---------- */

/** The `n` lines with the highest share of planned stops that were cancelled (a fully cancelled train counts
    all its stops, a train cut short only the ones it skipped), among lines with at least `minTrips`
    departures, in the current month, or last month while this one has under a week of data.
    {month, current, first, last, lines: [{line, ends, trips, cancelled, partly, pct}]} or null. */
export function worstLines(stats, today = todayOslo(), n = 3, minTrips = 100) {
  if (!stats?.months) return null;
  const cur = today.slice(0, 7);
  const prev = addDays(`${cur}-01`, -1).slice(0, 7);
  const month = (stats.months[cur]?.days >= 7 || !stats.months[prev]) ? cur : prev;
  const m = stats.months[month];
  const lines = Object.entries(m?.lines || {})
    .filter(([, v]) => v.trips >= minTrips && v.stopsCancelled > 0)
    .map(([line, v]) => ({ line, ...v, pct: (100 * v.stopsCancelled) / v.stops }))
    .sort((a, b) => b.pct - a.pct || b.stopsCancelled - a.stopsCancelled)
    .slice(0, n);
  return lines.length ? { month, current: month === cur, first: m.first, last: m.last, lines } : null;
}
