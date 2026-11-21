/* Innstilt's anonymous statistics: a Cloudflare Worker with a D1 database (binding "DB", see schema.sql).

   POST /report  {"id": "<32 hex>", "months": {"2026-11": {"sent": 3, "paid": 2, "rejected": 0, "kr": 42}}}
                 Replaces everything stored for that id; {"months": {}} deletes it (opting out).
   GET  /total   {"kr": 12345, "paid": 600, "sent": 640, "rejected": 12, "people": 85}

   The id is a random number the app makes on the device; it is not linked to a person, ticket or account.
   No names, tickets, trips or IP addresses are stored here. Numbers are self-reported, so they are capped
   to plausible values; the app says the counter is based on what users share. */

const ID = /^[0-9a-f]{32}$/;
const MONTH = /^20\d\d-(0[1-9]|1[0-2])$/;
const MAX = { months: 36, claims: 200, kr: 20000, body: 8000 };  /* per id; per month for claims/kr */
const ORIGINS = [/^https:\/\/popovas\.github\.io$/, /^https:\/\/innstilt\.app$/, /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/];

class BadRequest extends Error { status = 400; }

export default {
  async fetch(req, env) {
    const origin = req.headers.get('Origin') || '';
    const okOrigin = ORIGINS.some(re => re.test(origin));
    const cors = okOrigin ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' } : {};
    const path = new URL(req.url).pathname;
    try {
      if (req.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: { ...cors, 'Access-Control-Allow-Methods': 'GET, POST',
          'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '86400' } });
      }
      if (path === '/total' && req.method === 'GET') return json(await total(env), cors, 'public, max-age=300');
      if (path === '/report' && req.method === 'POST') {
        if (!okOrigin) return json({ error: 'origin not allowed' }, cors, 'no-store', 403);
        return json(await report(env, await req.text()), cors);
      }
      return json({ error: 'not found' }, cors, 'no-store', 404);
    } catch (e) {
      return json({ error: e.status ? e.message : 'server error' }, cors, 'no-store', e.status || 500);
    }
  },
};

function json(obj, cors, cache = 'no-store', status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { ...cors, 'Content-Type': 'application/json',
    'Cache-Control': cache, 'X-Content-Type-Options': 'nosniff' } });
}

async function total(env) {
  const r = await env.DB.prepare(`SELECT COALESCE(SUM(kr), 0) AS kr, COALESCE(SUM(paid), 0) AS paid,
      COALESCE(SUM(sent), 0) AS sent, COALESCE(SUM(rejected), 0) AS rejected, COUNT(DISTINCT install) AS people
      FROM reports`).first();
  return { kr: Math.floor(r.kr), paid: r.paid, sent: r.sent, rejected: r.rejected, people: r.people };
}

/** Validates a report; returns [[month, sent, paid, rejected, kr], ...] or throws BadRequest. */
function parseReport(text) {
  if (text.length > MAX.body) throw new BadRequest('too large');
  let body;
  try { body = JSON.parse(text); } catch { throw new BadRequest('not JSON'); }
  if (!body || typeof body !== 'object' || !ID.test(body.id)) throw new BadRequest('bad id');
  const months = body.months;
  if (!months || typeof months !== 'object' || Array.isArray(months)) throw new BadRequest('bad months');
  const entries = Object.entries(months);
  if (entries.length > MAX.months) throw new BadRequest('too many months');
  const rows = entries.map(([m, v]) => {
    if (!MONTH.test(m) || !v || typeof v !== 'object') throw new BadRequest('bad month');
    const num = k => {
      const x = v[k] ?? 0;
      if (typeof x !== 'number' || !Number.isFinite(x) || x < 0) throw new BadRequest(`bad ${k}`);
      return x;
    };
    const sent = Math.floor(num('sent')), paid = Math.floor(num('paid')), rejected = Math.floor(num('rejected'));
    const kr = Math.round(num('kr') * 100) / 100;
    if (sent > MAX.claims || paid + rejected > sent || kr > MAX.kr || (kr > 0 && paid === 0)) {
      throw new BadRequest('implausible numbers');
    }
    return [m, sent, paid, rejected, kr];
  });
  return { id: body.id, rows };
}

async function report(env, text) {
  const { id, rows } = parseReport(text);
  const now = Date.now();
  await env.DB.batch([
    env.DB.prepare('DELETE FROM reports WHERE install = ?').bind(id),
    ...rows.map(r => env.DB.prepare(
      'INSERT INTO reports (install, month, sent, paid, rejected, kr, updated) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .bind(id, ...r, now)),
  ]);
  return { ok: true, months: rows.length };
}
