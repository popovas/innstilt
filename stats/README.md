# Innstilt statistics (opt-in money counter)

A tiny Cloudflare Worker + D1 database that collects **anonymous, opt-in** totals from the app and serves the
sum for the "Innstilt users have got X kr back" counter.

What a report contains: a random id made on the device, and per month the number of claims sent / paid /
rejected and the kroner received. No names, tickets, account numbers, e-mail, stations, lines or trips.
Turning sharing off in the app deletes that id's rows. The Worker stores no IP addresses (Cloudflare itself
sees them, as any web host does).

## Setup (Cloudflare dashboard, no tools needed)

1. Create a free account at <https://dash.cloudflare.com>.
2. **Storage & Databases → D1 → Create** a database named `innstilt-stats`. Open its **Console**, paste
   `schema.sql`, run it.
3. **Workers & Pages → Create → Worker**, name it `innstilt-stats`, deploy the hello-world, then
   **Edit code**: replace everything with `worker.js`, deploy.
4. In the Worker: **Settings → Bindings → Add → D1 database**, variable name `DB`, database `innstilt-stats`.
5. Optional but recommended: **Security → WAF → Rate limiting rules**: e.g. at most 20 requests per minute
   per IP to `/report`.
6. Note the Worker's address (`https://innstilt-stats.<your-subdomain>.workers.dev`) and check
   `<address>/total` shows `{"kr":0,...}`.

Then, in the app:
- `web/js/stats.js`: set `STATS_URL` to that address.
- `web/index.html`: add the same address to `connect-src` in the Content-Security-Policy.
- If the app moves to a new domain, add it to `ORIGINS` in `worker.js` and redeploy.

## Testing without Cloudflare
The Worker's logic is plain JavaScript; it was tested in a browser with a stand-in database
(reports replace earlier ones, opt-out deletes, implausible or malformed reports are refused,
other websites can't post).

## Limits
Numbers are self-reported. Reports are capped to plausible values (≤200 claims and ≤20 000 kr per month,
kroner only with a payout), and the app labels the counter as based on what users share.
