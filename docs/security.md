# Innstilt – security and privacy review

Version 0.4.0, 21 November 2026 (innstilt.app live on GitHub Pages; anonymous counter on Cloudflare Workers).

## What is where

| Data | Where it lives | Who else sees it |
|---|---|---|
| Ticket code, name, e-mail, account number | `localStorage` on the user's device (origin innstilt.app) | Vy, when the user opens the claim form: the form takes them in its web address, so they also stay in browser history |
| Regular trips, claims, case numbers | same | nobody |
| Station searches, live departures | requests to Entur (`api.entur.io`) | Entur sees which stations are asked about and the IP address, not who the user is |
| Train data, the app itself | GitHub Pages | GitHub sees IP addresses of visitors (normal web hosting) |
| Anonymous statistics (opt-in) | Cloudflare Worker + D1 | random id + per month: claims sent/paid/rejected, kroner. No names, tickets, stations, case numbers, IPs stored |
| Tips | Ko-fi, only if the user clicks | Ko-fi |

## Checked

- **Published site**: only `web/` is deployed. Repo internals (`.git`, `tools/`, `cli/`, `stats/`, `docs/`) are not reachable. No secrets in the repo or its history (personal data and e-mail addresses checked; commit author is a GitHub no-reply address).
- **Content Security Policy** (meta): `default-src 'none'`, scripts/styles only from the site itself, connections only to the site, Entur and the counter, `base-uri 'none'`, `form-action 'none'`. No third-party scripts, fonts or trackers. `referrer: no-referrer`.
- **Injection (XSS)**: all text put into the page goes through `esc()`; ids from our own data files are escaped too (hardening in 0.4.0). Tested with hostile names/stations/claims and an import file containing `<script>`/`<img onerror>`: nothing runs.
- **Untrusted input**:
  - data import file: every field type-checked, trimmed, unknown fields dropped;
  - `#/case?...` links (from the bookmarklet): validated (digits, NSR ids, date, time); a bad link changes nothing;
  - Entur responses: rendered as text.
- **Clickjacking**: GitHub Pages cannot send `X-Frame-Options`/`frame-ancestors`, so the app refuses to run inside another site's frame (0.4.0).
- **Several tabs**: every save starts from the stored data, so an older tab cannot overwrite newer claims (bug fixed in 0.4.0).
- **Bookmarklet**: builds its UI with DOM calls (no `innerHTML`), reads only the time segments, the train list and the "Saksnummer" line; never presses "Send inn"; sends nothing by itself.
- **HTTPS**: enforced by GitHub Pages; `.app` is HSTS-preloaded in browsers.
- **Counter (Worker)**: accepts reports only with an `Origin` of innstilt.app or localhost; strict validation and caps (≤ 200 claims, ≤ 20 000 kr per month, kroner only with a payout); one id's numbers are replaced, never added; `nosniff`, `no-store`.
- **Build pipeline**: GitHub Actions pinned to commit SHAs; Python packages pinned (`tools/archive/constraints.txt`); minimal permissions (read for building, Pages write only in the deploy job).
- **Mail**: `perrong@innstilt.app` is forward-only (Cloudflare Email Routing); the domain sends no mail.

## Known limits (accepted for now)

- Data on the device is not encrypted; it is protected by the device lock and the browser. Planned for the phone apps: Keychain / Keystore.
- Vy's form takes the details in its address, so they appear in browser history and are visible to whatever Vy's page itself loads.
- The counter can be fed fake numbers by someone who forges requests outside a browser; caps limit the effect, and the app labels it as user-reported.
- `localStorage` is per browser: two devices sharing statistics separately are counted twice unless data is moved with the export file.

## Recommended (owner actions)

- Cloudflare → innstilt.app DNS: `TXT _dmarc "v=DMARC1; p=reject;"` (no one can send mail as @innstilt.app).
- Cloudflare → Security → WAF → Rate limiting: e.g. 20 requests/minute per IP on `innstilt-stats.innstilt.workers.dev/report`.
- Before launch: remove the `noindex` meta tag.
