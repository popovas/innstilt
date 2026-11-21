<p align="center"><img src="assets/icons/ghost-180.png" width="120" alt="Innstilt ghost train"></p>

# Innstilt

**Prisavslag og erstatning når toget er forsinket eller innstilt – uten bryet med Vy sitt skjema.** Innstilt finds your delayed and
cancelled trips in Entur's open data and opens Vy's own claim form already filled in. You check it and
press *Send inn*.

**Use it: [innstilt.app](https://innstilt.app)** (works in any browser; add it to your home screen).

> *Innstilt is not affiliated with Vy.* Your ticket code, name, e-mail and bank account are stored only
> on your own device, and are used only to fill in Vy's form. None of it is sent anywhere else (optional
> anonymous statistics share only numbers of claims and kroner).

## Status

| Part | State |
|---|---|
| [`cli/`](cli/) | ✅ Works on macOS/Linux: setup, tickets with validity, scan past days, claim, status |
| [`bookmarklet/`](bookmarklet/) | ✅ "👻 Innstilt: fyll ut" finishes Vy's form in your own browser |
| `web/` | 🚧 Planned: installable web app (PWA) for phone and desktop |

## How it works

1. **Find delays.** Entur's Journey Planner gives today's live times, and Entur's SIRI-ET archive gives
   the actual arrival times and cancellations for past days, back past Vy's 3-month deadline.
2. **Pick your trips.** Only trains near your usual travel times are shown, and each one is matched to
   the ticket that was valid that day.
3. **Claim.** Vy's form opens prefilled from a link. The bookmarklet sets the departure time and picks
   the train, which Vy's form requires by hand. You review it and send it yourself.

Vy's rules (checked 2026-11-20): 50 % of the ticket price back if you arrive more than 30 min late
(60 min on Oslo–Bergen and Flåm–Myrdal). Monthly passes: 50 % of the daily value per delay, at most
50 % of the price in total. The deadline is 3 months.

## Repository

```
cli/            command-line tool (innstilt.py), installer, its README
bookmarklet/    innstilt.js -> build.py -> install.html (drag-to-bookmarks page)
assets/icons/   ghost-train icons (SVG sources + rendered PNGs)
docs/           findings.md: how Vy's form and Entur's data actually behave
tools/recon/    scripts used to investigate the form (output is git-ignored: it holds personal data)
```

Start with [`cli/README.md`](cli/README.md). Technical background is in [`docs/findings.md`](docs/findings.md).

Data: [Entur](https://developer.entur.no/) open data under the
[NLOD](https://data.norge.no/nlod) licence. Code: [BSD 3-Clause](LICENSE).
