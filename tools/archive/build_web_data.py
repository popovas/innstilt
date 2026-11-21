"""Turn Entur's SIRI-ET archive (Vy-group trains) into compact per-day JSON files for the web app.

Browsers can't read Entur's archive bucket (no CORS), so this republishes it. Locally it writes to
web/data/; later a nightly job runs the same script. Public timetable data only, no personal data.

  .venv/bin/python tools/archive/build_web_data.py                 # last 90 days that are available
  .venv/bin/python tools/archive/build_web_data.py --since 2026-11-03 --until 2026-11-20
  .venv/bin/python tools/archive/build_web_data.py --prune-before 2026-08-22   (nightly job)

Output: web/data/vyg/YYYY-MM-DD.json, index.json, and stats.json (per month and line: departures,
cancelled, >30 min late; for "the most cancelled line of the month"). Day file format:
  {"date": "2026-11-12", "stops": {"<idx>": ["NSR:StopPlace:59872", "Oslo S"], ...},
   "journeys": [{"id": ..., "line": "R31", "dest": "Hakadal", "extra": false, "cancelled": false,
                 "calls": [[stopIdx, aimedArr "HH:MM"|null, aimedDep "HH:MM"|null,
                            actualArr "HH:MM:SS"|null, stopCancelled 0|1], ...]}, ...]}
Times are Oslo local time. stopIdx refers to station-level ids (the ones Vy's form and the app use).
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
import sys
from pathlib import Path

import httpx

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "cli"))
import innstilt  # noqa: E402  (archive download/export + Entur constants)

OUT = ROOT / "web" / "data" / "vyg"
QUAY_MAP = Path(__file__).parent / "quay_stations.json"   # public NSR data, cached between runs


def station_for_quays(quays: set[str]) -> dict[str, list[str]]:
    """Quay id -> [station-level stop place id, name], via Entur Journey Planner (batched, cached)."""
    known = json.loads(QUAY_MAP.read_text()) if QUAY_MAP.exists() else {}
    todo = sorted(q for q in quays if q not in known)
    for i in range(0, len(todo), 80):
        batch = todo[i:i + 80]
        query = "{" + " ".join(
            f'q{n}: quay(id: "{q}") {{ id stopPlace {{ id name parent {{ id name }} }} }}'
            for n, q in enumerate(batch)) + "}"
        r = httpx.post(innstilt.ENTUR_JP, json={"query": query}, headers=innstilt.HEADERS, timeout=60)
        r.raise_for_status()
        for n, q in enumerate(batch):
            hit = (r.json().get("data") or {}).get(f"q{n}")
            sp = (hit or {}).get("stopPlace")
            if sp:
                top = sp.get("parent") or sp
                known[q] = [top["id"], top["name"]]
            else:
                known[q] = None  # quay no longer in the stop register
        print(f"  mapped {min(i + 80, len(todo))}/{len(todo)} new quays", file=sys.stderr)
    QUAY_MAP.write_text(json.dumps(known, ensure_ascii=False, indent=0, sort_keys=True))
    return known


def hhmm(ts: str, seconds: bool = False) -> str | None:
    return ts[11:19 if seconds else 16] if ts else None  # archive times are already Oslo local


def build_day(day: dt.date) -> dict | None:
    rows = innstilt.archive_rows(day)
    rows = [r for r in rows if r["vehicleMode"] == "rail" or r["extraJourney"] == "True"]
    if not rows:
        return None
    qmap = station_for_quays({r["stopPointRef"] for r in rows})
    stops: dict[str, int] = {}
    names: dict[int, list[str]] = {}
    by_sj: dict[str, list[dict]] = {}
    for r in rows:
        by_sj.setdefault(r["serviceJourneyId"], []).append(r)
    journeys = []
    for sj, calls in by_sj.items():
        calls.sort(key=lambda c: int(c["sequenceNr"]))
        out_calls = []
        for c in calls:
            st = qmap.get(c["stopPointRef"])
            if not st:
                continue
            if st[0] not in stops:
                stops[st[0]] = len(stops)
                names[stops[st[0]]] = st
            recorded = c["estimated"] == "False"
            out_calls.append([stops[st[0]], hhmm(c["aimedArrivalTime"]), hhmm(c["aimedDepartureTime"]),
                              hhmm(c["arrivalTime"], seconds=True) if recorded else None,
                              1 if c["stopCancellation"] == "True" else 0])
        if len(out_calls) < 2:
            continue
        first, last = calls[0], calls[-1]
        journeys.append({
            "id": sj,
            "line": first["lineRef"].rsplit(":", 1)[-1],
            "dest": (last["stopPointName"] or "").removesuffix(" stasjon"),
            "extra": first["extraJourney"] == "True",
            "cancelled": first["journeyCancellation"] == "True",
            "calls": out_calls,
        })
    journeys.sort(key=lambda j: next((c[2] or c[1] or "") for c in j["calls"]))
    return {"date": day.isoformat(), "source": "Entur SIRI-ET archive (Vy-group), NLOD",
            "stops": {str(i): names[i] for i in sorted(names)}, "journeys": journeys}


def _min(hhmm: str) -> int:
    return int(hhmm[:2]) * 60 + int(hhmm[3:5])


def write_stats() -> None:
    """Per month and line, from the day files: departures, cancelled (all stops), partly cancelled (some
    stops), and more than 30 min late at the last stop. Replacement buses are left out. Public data only."""
    months: dict[str, dict] = {}
    for f in sorted(OUT.glob("????-??-??.json")):
        day = json.loads(f.read_text())
        m = months.setdefault(day["date"][:7], {"days": 0, "first": day["date"], "last": day["date"], "lines": {}})
        m["days"] += 1
        m["last"] = day["date"]
        for j in day["journeys"]:
            if j["extra"]:
                continue
            ln = m["lines"].setdefault(j["line"], {"trips": 0, "cancelled": 0, "partly": 0, "late": 0, "dests": {}})
            ln["trips"] += 1
            ln["dests"][j["dest"]] = ln["dests"].get(j["dest"], 0) + 1
            stops_cancelled = [c[4] for c in j["calls"]]
            if j["cancelled"] or all(stops_cancelled):  # the archive marks a cancelled train stop by stop
                ln["cancelled"] += 1
                continue
            if any(stops_cancelled):  # ran only part of the way
                ln["partly"] += 1
            last = j["calls"][-1]
            if last[1] and last[3] and not last[4]:
                delay = (_min(last[3]) - _min(last[1])) % 1440  # wraps past midnight
                if 30 < delay < 720:
                    ln["late"] += 1
    for m in months.values():
        for ln in m["lines"].values():
            top = sorted(ln.pop("dests").items(), key=lambda kv: -kv[1])
            ln["ends"] = [name for name, _ in top[:2] if name]
    (OUT / "stats.json").write_text(json.dumps(
        {"updated": dt.datetime.now(innstilt.TZ).isoformat(), "source": "Entur SIRI-ET archive (Vy-group), NLOD",
         "months": months}, ensure_ascii=False, separators=(",", ":")))
    print(f"stats: {len(months)} months")


def main() -> None:
    ap = argparse.ArgumentParser()
    today = dt.datetime.now(innstilt.TZ).date()
    ap.add_argument("--since", default=str(today - dt.timedelta(days=90)))
    ap.add_argument("--until", default=str(today - dt.timedelta(days=1)))
    ap.add_argument("--force", action="store_true", help="rebuild days that already exist")
    ap.add_argument("--prune-before", help="delete day files older than this date (YYYY-MM-DD)")
    args = ap.parse_args()
    OUT.mkdir(parents=True, exist_ok=True)
    day, until = dt.date.fromisoformat(args.since), dt.date.fromisoformat(args.until)
    while day <= until:
        target = OUT / f"{day}.json"
        if target.exists() and not args.force:
            day += dt.timedelta(days=1)
            continue
        try:
            data = build_day(day)
        except Exception as e:  # noqa: BLE001  (one bad day shouldn't stop the run)
            print(f"{day}: FAILED {e}", file=sys.stderr)
            data = None
        if data:
            target.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")))
            print(f"{day}: {len(data['journeys'])} journeys, {target.stat().st_size // 1024} KB")
        day += dt.timedelta(days=1)
    if args.prune_before:
        for old in OUT.glob("????-??-??.json"):
            if old.stem < args.prune_before:
                old.unlink()
                print(f"{old.stem}: pruned (older than {args.prune_before})")
    days = sorted(p.stem for p in OUT.glob("????-??-??.json"))
    (OUT / "index.json").write_text(json.dumps({"days": days, "updated": dt.datetime.now(innstilt.TZ).isoformat()}))
    print(f"index: {len(days)} days")
    write_stats()


if __name__ == "__main__":
    main()
