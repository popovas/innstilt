/* Opt-in anonymous statistics (see stats/worker.js) and public line statistics (data/vyg/stats.json).

   Only if the user says yes, and only this is sent: a random id made on this device, and per month the
   number of claims sent / paid / rejected and the kroner received. Never names, tickets, accounts,
   e-mail, stations or trips. Saying no later deletes what was sent. */

/* The Worker's address. Empty = the feature is off and nothing is ever sent or fetched.
   When set, its origin must also be added to connect-src in index.html's Content-Security-Policy. */
export const STATS_URL = '';

export const enabled = () => Boolean(STATS_URL);

export function newId() {
  const b = crypto.getRandomValues(new Uint8Array(16));
  return [...b].map(x => x.toString(16).padStart(2, '0')).join('');
}

/** The exact report for these claims: {id, months: {YYYY-MM: {sent, paid, rejected, kr}}}. */
export function report(id, claims) {
  const months = {};
  for (const c of claims) {
    const m = (months[c.date.slice(0, 7)] ??= { sent: 0, paid: 0, rejected: 0, kr: 0 });
    m.sent += 1;
    if (c.status === 'paid') { m.paid += 1; m.kr += c.amount || 0; }
    if (c.status === 'rejected') m.rejected += 1;
  }
  return { id, months };
}

export async function send(body) {
  const r = await fetch(`${STATS_URL}/report`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    credentials: 'omit', referrerPolicy: 'no-referrer',
  });
  if (!r.ok) throw new Error(`stats ${r.status}`);
}

let totalPromise = null;
/** {kr, paid, sent, rejected, people} or null; fetched once per page load. */
export function fetchTotal() {
  if (!enabled()) return Promise.resolve(null);
  totalPromise ??= fetch(`${STATS_URL}/total`, { credentials: 'omit', referrerPolicy: 'no-referrer' })
    .then(r => (r.ok ? r.json() : null)).catch(() => null);
  return totalPromise;
}
