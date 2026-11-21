#!/usr/bin/env python3
"""Innstilt - claim your money back from Vy for delayed and cancelled trains.

  innstilt setup                         save ticket code, name, email, bank account, commute
  innstilt check [--all] [--quiet]       record delayed/cancelled trains on your commute as evidence.
                                        Today: live data. Past days (--date): Entur's archive.
  innstilt claim --time HH:MM [--date D] [--reverse] [--from S --to S] [--no-open]
                                        verify the train via Entur and open Vy's form prefilled
  innstilt scan --since D [--until D] [--window MIN | --all-times]
                                        go through past days, pick the trips you took, claim them.
                                        Only shows trains within +-2 h of your usual travel times.

Past trains are verified with Entur's public SIRI-ET archive (siri-data-exporter.entur.no, NLOD
licence). Generating a day that nobody has exported yet needs Playwright (pip install playwright &&
playwright install chromium); already-exported days are a plain download.

  innstilt bookmarklet                  install the "👻 Innstilt: fyll ut" bookmark and use your own browser
  innstilt ticket [add|edit|remove]     your tickets and their validity (a monthly pass gets a new code
                                        every month; each claim uses the ticket valid on the trip's day)
  innstilt status [CASE paid|rejected [AMOUNT]] [--row N --case CASE]
                                        list sent claims, record what Vy paid, add missing case numbers

Nothing is submitted automatically: the form opens prefilled, you check it and press Send. To finish
the form (Vy only accepts the departure time once it's changed by hand) either click the Innstilt
bookmark in your own browser (recommended: no CAPTCHA), or let Innstilt drive its own browser window
(needs Playwright; Vy shows a CAPTCHA there).
Data stays on this machine (~/.config/innstilt, mode 600). Only station codes/times are sent to
Entur's open API; your personal details only ever go into the vy.no link you open yourself.
"""
from __future__ import annotations

import argparse
import atexit
import csv
import datetime as dt
import functools
import gzip
import io
import json
import os
import sys
import webbrowser
from pathlib import Path
from urllib.parse import urlencode
from zoneinfo import ZoneInfo

import httpx

TZ = ZoneInfo("Europe/Oslo")
UTC = dt.timezone.utc
FORM_URL = "https://www.vy.no/kundeservice/skjema/prisavslag-og-erstatning"
ENTUR_JP = "https://api.entur.io/journey-planner/v3/graphql"
ENTUR_GEO = "https://api.entur.io/geocoder/v1/autocomplete"
HEADERS = {"ET-Client-Name": "innstilt-cli"}
HOME = Path(os.environ.get("INNSTILT_HOME", Path.home() / ".config" / "innstilt"))
_OLD_HOME = Path.home() / ".config" / "vyclaim"  # the tool's working name before 2026-11-20
if "INNSTILT_HOME" not in os.environ and _OLD_HOME.exists() and not HOME.exists():
    _OLD_HOME.rename(HOME)
CONFIG, EVIDENCE, CLAIMS = HOME / "config.json", HOME / "evidence.json", HOME / "claims.jsonl"
CACHE = HOME / "cache"
DEFAULT_THRESHOLD = 30  # minutes; 60 on Oslo-Bergen and Flåm-Myrdal
DEFAULT_WINDOW = 120    # scan: minutes either side of your usual departure times
ARCHIVE_BUCKET = "https://storage.googleapis.com/query-results-siri-et-last-bucket"
ARCHIVE_APP = "https://siri-data-exporter.entur.no/"
ARCHIVE_SOURCE = ("Vy-group", "VYG")  # exporter label, file code. Vy trains since May 2024.
STUB_BYTES = 300  # an export with only the CSV header is ~216 bytes


# ---------------------------------------------------------------- storage

def _write_private(path: Path, text: str) -> None:
    HOME.mkdir(parents=True, exist_ok=True, mode=0o700)
    fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    with os.fdopen(fd, "w") as f:
        f.write(text)


def _append_private(path: Path, obj: dict) -> None:
    HOME.mkdir(parents=True, exist_ok=True, mode=0o700)
    fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_APPEND, 0o600)
    with os.fdopen(fd, "a") as f:
        f.write(json.dumps(obj, ensure_ascii=False) + "\n")


def load_evidence() -> dict:
    return json.loads(EVIDENCE.read_text()) if EVIDENCE.exists() else {}


def record_evidence(frm: dict, to: dict, j: dict) -> bool:
    """Keep the latest real-time snapshot per train; returns True if newly delayed."""
    if not j["realtime"]:
        return False
    ev = load_evidence()
    key = f"{j['service_journey']}|{j['aimed_departure'][:10]}|{to['nsr']}"
    new = key not in ev
    ev[key] = {"recorded_at": dt.datetime.now(TZ).isoformat(), "from": frm, "to": to, **j}
    _write_private(EVIDENCE, json.dumps(ev, ensure_ascii=False, indent=1))
    return new


def find_evidence(frm: dict, to: dict, planned: dt.datetime) -> dict | None:
    for e in load_evidence().values():
        if (e["from"]["nsr"], e["to"]["nsr"]) == (frm["nsr"], to["nsr"]) and \
                dt.datetime.fromisoformat(e["aimed_departure"]) == planned:
            return e
    return None


def load_config() -> dict:
    if not CONFIG.exists():
        sys.exit("No config yet - run: innstilt setup")
    cfg = json.loads(CONFIG.read_text())
    if "reference_code" in cfg and "tickets" not in cfg:  # before 2026-11-20: one code, no dates
        cfg["tickets"] = [{"code": cfg.pop("reference_code"), "valid_from": None, "valid_to": None}]
        save_config(cfg)
    cfg.setdefault("tickets", [])
    return cfg


def save_config(cfg: dict) -> None:
    _write_private(CONFIG, json.dumps(cfg, ensure_ascii=False, indent=1))


# ---------------------------------------------------------------- tickets

def parse_when(text: str) -> str | None:
    """'2026-12-03', '2026-12-03 08:12', '3.12.2026', '3.12.2026 08:12' -> ISO (Oslo time); '' -> None."""
    text = text.strip()
    if not text:
        return None
    date_part, _, time_part = text.partition(" ")
    if "." in date_part:
        d, m, y = (date_part.split(".") + [""])[:3]
        date_part = f"{int(y or dt.date.today().year):04d}-{int(m):02d}-{int(d):02d}"
    try:
        day = dt.date.fromisoformat(date_part)
        t = dt.time.fromisoformat(time_part.zfill(5)) if time_part else dt.time(0, 0)
    except ValueError:
        raise ValueError(f"'{text}' is not a date like 2026-12-03 or 3.12.2026 08:12") from None
    return dt.datetime.combine(day, t, TZ).isoformat()


def ticket_for(cfg: dict, when: dt.datetime) -> dict | None:
    """The ticket valid at `when` (latest start wins). Tickets without dates count as always valid."""
    ok = [t for t in cfg.get("tickets", [])
          if (not t.get("valid_from") or dt.datetime.fromisoformat(t["valid_from"]) <= when)
          and (not t.get("valid_to") or when < dt.datetime.fromisoformat(t["valid_to"]))]
    return max(ok, key=lambda t: t.get("valid_from") or "", default=None)


def ticket_notice(cfg: dict) -> str | None:
    """One unobtrusive line about expired / expiring / undated tickets, or None."""
    ts = cfg.get("tickets", [])
    if not ts:
        return "No ticket saved yet - add one: innstilt ticket add"
    if any(not t.get("valid_to") for t in ts):
        return "Tip: add your ticket's validity dates so each claim uses the right code: innstilt ticket edit"
    now = dt.datetime.now(TZ)
    last = max(dt.datetime.fromisoformat(t["valid_to"]) for t in ts)
    if last <= now:
        return (f"Your ticket expired on {last:%d.%m}. Past trips still work; for newer ones "
                "add the new ticket: innstilt ticket add")
    if last - now < dt.timedelta(days=3):
        return f"Your ticket expires {last:%d.%m %H:%M}. When you renew it: innstilt ticket add"
    return None


def show_notice(cfg: dict) -> None:
    n = ticket_notice(cfg)
    if n:
        print(f"  (i) {n}")


def fmt_valid(t: dict) -> str:
    f = lambda v: dt.datetime.fromisoformat(v).strftime("%d.%m.%Y %H:%M") if v else "?"  # noqa: E731
    return f"{t['code']}  valid {f(t.get('valid_from'))} -> {f(t.get('valid_to'))}"


def ask_ticket(existing: dict | None = None) -> dict:
    e = existing or {}
    print("  Find these in the Vy app: the ticket's receipt shows the reference code; the ticket shows")
    print("  when it expires ('Går ut'). Monthly passes: valid from the purchase time for 30 days.")
    code = ask("  Reference code (XXX-XXX-XXX)", e.get("code"), valid_ref)
    cur = lambda k: dt.datetime.fromisoformat(e[k]).strftime("%Y-%m-%d %H:%M") if e.get(k) else None  # noqa: E731
    vf = ask("  Valid from (e.g. 2026-11-03 08:12; Enter = unknown)", cur("valid_from"), parse_when)
    vt = ask("  Valid to / 'Går ut' (e.g. 2026-12-03 08:12; Enter = unknown)", cur("valid_to"), parse_when)
    if vf and vt and vt <= vf:
        print("  ! 'valid to' is before 'valid from' - swapped them.")
        vf, vt = vt, vf
    return {"code": code, "valid_from": vf, "valid_to": vt}


# ---------------------------------------------------------------- validation

def valid_ref(code: str) -> str:
    c = code.strip().upper().replace(" ", "")
    if len(c) == 9 and "-" not in c:
        c = f"{c[:3]}-{c[3:6]}-{c[6:]}"
    if len(c) != 11 or c[3] != "-" or c[7] != "-" or not c.replace("-", "").isalnum():
        raise ValueError("reference code must look like XXX-XXX-XXX")
    return c


def valid_account(acct: str) -> str:
    """Norwegian account number: 11 digits, MOD11 check digit."""
    d = "".join(ch for ch in acct if ch.isdigit())
    if len(d) != 11:
        raise ValueError("account number must have 11 digits")
    s = sum(int(x) * w for x, w in zip(d[:10], [5, 4, 3, 2, 7, 6, 5, 4, 3, 2]))
    k = 11 - s % 11
    k = 0 if k == 11 else k
    if k == 10 or k != int(d[10]):
        raise ValueError("account number check digit is wrong - typo?")
    return d


def valid_times(text: str) -> list[str]:
    """'7:15, 08:00' -> ['07:15', '08:00']; empty -> [] (no filter)."""
    out = []
    for tok in text.replace(";", ",").replace(" ", ",").split(","):
        if tok:
            try:
                out.append(dt.time.fromisoformat(tok.zfill(5)).strftime("%H:%M"))
            except ValueError:
                raise ValueError(f"'{tok}' is not a time like 07:15") from None
    return sorted(set(out))


# ---------------------------------------------------------------- Entur

def find_station(text: str) -> dict:
    r = httpx.get(ENTUR_GEO, params={"text": text, "layers": "venue", "size": 10}, headers=HEADERS, timeout=20)
    r.raise_for_status()
    hits = [f["properties"] for f in r.json()["features"] if "railStation" in (f["properties"].get("category") or [])]
    if not hits:
        raise ValueError(f"no railway station matches '{text}'")
    return {"name": hits[0]["name"], "nsr": hits[0]["id"]}


_JOURNEYS_Q = """
query($id: String!, $t: DateTime!, $range: Int!) {
  stopPlace(id: $id) {
    estimatedCalls(startTime: $t, timeRange: $range, numberOfDepartures: 200,
                   whiteListedModes: [rail], includeCancelledTrips: true) {
      aimedDepartureTime expectedDepartureTime cancellation realtime
      destinationDisplay { frontText }
      serviceJourney {
        id
        line { publicCode }
        operator { name }
        estimatedCalls {
          quay { stopPlace { id parent { id } } }
          aimedArrivalTime expectedArrivalTime actualArrivalTime cancellation realtime
        }
      }
    }
  }
}"""


def _station_id(call: dict) -> str:
    sp = call["quay"]["stopPlace"]
    return (sp.get("parent") or {}).get("id") or sp["id"]


def journeys(frm: dict, to: dict, start: dt.datetime, range_s: int) -> list[dict]:
    """Trains from `frm` that later call at `to`, with planned vs actual arrival.
    Queried in 1h windows: big stations exceed the per-query departure cap."""
    out, seen, step = [], set(), 3600
    for off in range(0, range_s, step):
        for j in _journeys(frm, to, start + dt.timedelta(seconds=off), min(step, range_s - off)):
            if (j["service_journey"], j["aimed_departure"]) not in seen:
                seen.add((j["service_journey"], j["aimed_departure"]))
                out.append(j)
    return sorted(out, key=lambda j: j["aimed_departure"])


def _journeys(frm: dict, to: dict, start: dt.datetime, range_s: int) -> list[dict]:
    r = httpx.post(ENTUR_JP, headers=HEADERS, timeout=30, json={
        "query": _JOURNEYS_Q,
        "variables": {"id": frm["nsr"], "t": start.isoformat(), "range": range_s}})
    r.raise_for_status()
    data = r.json()
    if data.get("errors"):
        raise RuntimeError(data["errors"][0].get("message"))
    out = []
    for c in (data["data"]["stopPlace"] or {}).get("estimatedCalls", []):
        if not c["serviceJourney"]["id"].startswith("VYG:"):
            continue  # another operator (SJ, Go-Ahead, Flytoget): Vy doesn't refund those
        calls = c["serviceJourney"]["estimatedCalls"] or []
        ids = [_station_id(x) for x in calls]
        if frm["nsr"] not in ids or to["nsr"] not in ids[ids.index(frm["nsr"]) + 1:]:
            continue
        arr = calls[ids.index(to["nsr"], ids.index(frm["nsr"]) + 1)]
        aimed_dep = dt.datetime.fromisoformat(c["aimedDepartureTime"])
        aimed_arr = dt.datetime.fromisoformat(arr["aimedArrivalTime"])
        real = arr["actualArrivalTime"] or arr["expectedArrivalTime"]
        cancelled = bool(c["cancellation"] or arr["cancellation"])
        delay = None
        if real and not cancelled and arr["realtime"]:
            delay = round((dt.datetime.fromisoformat(real) - aimed_arr).total_seconds() / 60)
        out.append({
            "line": c["serviceJourney"]["line"]["publicCode"],
            "operator": (c["serviceJourney"].get("operator") or {}).get("name"),
            "service_journey": c["serviceJourney"]["id"],
            "end_station": c["destinationDisplay"]["frontText"],
            "aimed_departure": aimed_dep.isoformat(),
            "aimed_arrival": aimed_arr.isoformat(),
            "real_arrival": real,
            "arrival_is_actual": bool(arr["actualArrivalTime"]),
            "realtime": bool(arr["realtime"]),
            "cancelled": cancelled,
            "delay_min": delay,
        })
    return out


# ---------------------------------------------------------------- Entur archive (past days)
#
# Entur's exporter writes one gzip CSV per (date range, data source) to a public bucket. The
# schedule columns (aimed*/arrivalTime/departureTime) are Norwegian LOCAL time even though they
# carry a "+00:00" suffix (checked in November and August 2026); recordedAtTime is real UTC.

@functools.lru_cache(maxsize=64)
def station_quays(nsr: str) -> frozenset[str]:
    r = httpx.post(ENTUR_JP, headers=HEADERS, timeout=20, json={
        "query": "query($id:String!){ stopPlace(id:$id){ quays{ id } } }", "variables": {"id": nsr}})
    r.raise_for_status()
    sp = r.json()["data"]["stopPlace"] or {"quays": []}
    return frozenset(q["id"] for q in sp["quays"])


def _generate_export(day: dt.date) -> None:
    """Ask Entur's exporter (a Streamlit app) to build the file for `day`. Needs Playwright."""
    try:
        from playwright.sync_api import sync_playwright
    except ImportError as e:
        raise RuntimeError("this day isn't exported yet - install Playwright to generate it: "
                           "pip install playwright && playwright install chromium") from e
    label = ARCHIVE_SOURCE[0]
    with sync_playwright() as p:
        b = p.chromium.launch()
        try:
            pg = b.new_page(viewport={"width": 1300, "height": 1800})
            pg.goto(ARCHIVE_APP, wait_until="networkidle")
            pg.locator("[data-baseweb=select]").first.click()
            pg.keyboard.type(label, delay=30)
            pg.get_by_role("option", name=label, exact=True).click()
            pg.locator("[data-testid=stDateInput] input").first.click()
            cal = pg.locator("[data-baseweb=calendar]").first
            sel = f'[aria-label*="{day:%B} {day.day}"][aria-label*="{day.year}"]'
            for _ in range(48):
                if cal.locator(sel).count():
                    break
                cal.locator('[aria-label*="Previous"]').first.click()
                pg.wait_for_timeout(250)
            cell = cal.locator(sel).first
            cell.click(); pg.wait_for_timeout(250); cell.click(); pg.keyboard.press("Escape")
            pg.get_by_role("button", name="Submit").click()
            pg.get_by_text("File successfully created").wait_for(timeout=600_000)
        finally:
            b.close()


def archive_rows(day: dt.date) -> list[dict]:
    today = dt.datetime.now(TZ).date()
    cached = CACHE / f"{ARCHIVE_SOURCE[1]}-{day}.csv.gz"
    if cached.exists():
        raw = cached.read_bytes()
    else:
        url = f"{ARCHIVE_BUCKET}/query_result_export_{day}_{day}_{ARCHIVE_SOURCE[1]}.csv.gzip"
        r = httpx.get(url, timeout=60)
        if r.status_code != 200 or len(r.content) <= STUB_BYTES:
            print(f"  (asking Entur's archive to export {day} - takes ~30 s)", file=sys.stderr)
            _generate_export(day)
            r = httpx.get(url, timeout=60)
            r.raise_for_status()
        raw = r.content
        if len(raw) > STUB_BYTES and day < today - dt.timedelta(days=1):  # recent days may still fill in
            CACHE.mkdir(parents=True, exist_ok=True)
            cached.write_bytes(raw)
    return list(csv.DictReader(io.TextIOWrapper(gzip.GzipFile(fileobj=io.BytesIO(raw)), "utf-8")))


def _local(ts: str) -> dt.datetime | None:
    return dt.datetime.fromisoformat(ts[:19]).replace(tzinfo=TZ) if ts else None


def archive_journeys(frm: dict, to: dict, day: dt.date) -> list[dict]:
    """Same shape as journeys(), built from the archive for a past day."""
    fq, tq = station_quays(frm["nsr"]), station_quays(to["nsr"])
    by_sj: dict[str, list[dict]] = {}
    for r in archive_rows(day):
        by_sj.setdefault(r["serviceJourneyId"], []).append(r)
    out = []
    for sj, calls in by_sj.items():
        calls.sort(key=lambda c: int(c["sequenceNr"]))
        f = next((c for c in calls if c["stopPointRef"] in fq and c["aimedDepartureTime"]), None)
        if not f:
            continue
        t = next((c for c in calls if c["stopPointRef"] in tq and c["aimedArrivalTime"]
                  and int(c["sequenceNr"]) > int(f["sequenceNr"])), None)
        if not t:
            continue
        extra = f["extraJourney"] == "True"  # replacement buses etc.: not a timetabled train
        cancelled = "True" in (f["journeyCancellation"], f["stopCancellation"], t["stopCancellation"])
        recorded = t["estimated"] == "False" and bool(t["arrivalTime"])
        aimed_arr, real = _local(t["aimedArrivalTime"]), _local(t["arrivalTime"])
        out.append({
            "line": f["lineRef"].rsplit(":", 1)[-1],
            "operator": f["operatorRef"],
            "service_journey": sj,
            "end_station": ("replacement" if extra and not calls[-1]["stopPointName"]
                            else calls[-1]["stopPointName"].removesuffix(" stasjon")),
            "extra": extra,
            "aimed_departure": _local(f["aimedDepartureTime"]).isoformat(),
            "aimed_arrival": aimed_arr.isoformat(),
            "real_arrival": real.isoformat() if real else None,
            "arrival_is_actual": recorded,
            "realtime": recorded or cancelled,
            "cancelled": cancelled,
            "delay_min": round((real - aimed_arr).total_seconds() / 60) if recorded and not cancelled else None,
            "source": "entur-archive",
        })
    return sorted(out, key=lambda j: j["aimed_departure"])


def next_train(js: list[dict], j: dict) -> dict | None:
    """First train on the same route after a cancelled one that actually ran."""
    later = [x for x in js if x["aimed_departure"] > j["aimed_departure"] and not x["cancelled"]]
    return later[0] if later else None


def effective_delay(j: dict, nxt: dict | None) -> int | None:
    """For a cancelled train: how late you got there on the next one."""
    if not nxt:
        return None
    arr = dt.datetime.fromisoformat(nxt["real_arrival"] or nxt["aimed_arrival"])
    return round((arr - dt.datetime.fromisoformat(j["aimed_arrival"])).total_seconds() / 60)


# ---------------------------------------------------------------- Vy form link

def vy_departure_id(j: dict) -> str:
    """Matches the form's own ids, e.g. R31-2026-11-19T15:44Z-Jaren."""
    t = dt.datetime.fromisoformat(j["aimed_departure"]).astimezone(UTC).strftime("%Y-%m-%dT%H:%MZ")
    return f"{j['line']}-{t}-{j['end_station']}"


def build_link(cfg: dict, frm: dict, to: dict, planned: dt.datetime, journey: dict | None) -> str:
    p = {
        "step": 4,
        "ticketInputType": "REFERENCE_CODE",
        "referenceCode": (ticket_for(cfg, planned) or {}).get("code", ""),
        "manualJourneyInfo.departureStation.stationName": frm["name"],
        "manualJourneyInfo.departureStation.nsrCode": frm["nsr"],
        "manualJourneyInfo.arrivalStation.stationName": to["name"],
        "manualJourneyInfo.arrivalStation.nsrCode": to["nsr"],
        "manualJourneyInfo.date": planned.strftime("%Y-%m-%d"),
        "manualJourneyInfo.time": planned.strftime("%H:%M"),
        "complaintType": "DELAY_OR_CANCELLATION",
        "arrivedAtDestination": "YES",
        "hadExpenses": "NO",
        "manualJourneyInfo.returnJourney.hasReturn": "false",
    }
    if journey:
        p["departureList"] = vy_departure_id(journey)
    p |= {
        "contactInfo.name": cfg["name"],
        "contactInfo.email": cfg["email"],
        "bankDetails.accountType": "NORWEGIAN",
        "bankDetails.norwegianAccountNumber": cfg["account"],
    }
    return f"{FORM_URL}?{urlencode(p)}"


# ---------------------------------------------------------------- helpers

def hm(iso: str | None) -> str:
    return dt.datetime.fromisoformat(iso).astimezone(TZ).strftime("%H:%M") if iso else "--:--"


def describe(j: dict) -> str:
    if j["cancelled"]:
        status = "CANCELLED"
    elif j["delay_min"] is None:
        status = "no recorded arrival"
    else:
        status = f"{j['delay_min']:+d} min" + ("" if j["arrival_is_actual"] else " (estimate)")
    return (f"{j['line']:>5} {hm(j['aimed_departure'])} -> {j['end_station']:<14} "
            f"arr {hm(j['aimed_arrival'])} / {hm(j['real_arrival'])}  {status}")


def eligible(j: dict, threshold: int) -> bool:
    if j.get("extra"):
        return False
    return j["cancelled"] or (j["delay_min"] or 0) > threshold


def notify(msg: str) -> None:
    """Desktop notification (macOS); silently skipped elsewhere."""
    if sys.platform == "darwin":
        import subprocess
        subprocess.run(["osascript", "-e", "on run argv\ndisplay notification (item 1 of argv) "
                        "with title \"Vy delay - you can claim\"\nend run", msg], check=False)


def confirm(prompt: str) -> bool:
    try:
        return input(prompt).strip().lower() == "y"
    except EOFError:
        return False


def route(cfg: dict, args) -> tuple[dict, dict]:
    frm = find_station(args.frm) if args.frm else cfg["home"]
    to = find_station(args.to) if args.to else cfg["work"]
    if args.reverse:
        frm, to = to, frm
    return frm, to


def ask(prompt: str, current: str | None = None, check=lambda x: x) -> str:
    while True:
        v = input(f"{prompt}{f' [{current}]' if current else ''}: ").strip() or (current or "")
        try:
            return check(v)
        except ValueError as e:
            print(f"  ! {e}")


# ---------------------------------------------------------------- commands

def cmd_setup(_args) -> None:
    cfg = load_config() if CONFIG.exists() else {"tickets": []}
    print("Innstilt stores this only on this computer, readable only by you:", CONFIG)
    print("It is used only to fill in Vy's claim form. Nothing is sent anywhere else.")
    print("Innstilt is not affiliated with Vy.\n")
    if not cfg["tickets"]:
        print("Your ticket:")
        cfg["tickets"].append(ask_ticket())
    else:
        print("Tickets: " + "; ".join(fmt_valid(t) for t in cfg["tickets"]))
        if confirm("Add a new ticket (e.g. this month's pass)? [y/N] "):
            cfg["tickets"].append(ask_ticket())
    cfg["name"] = ask("Full name", cfg.get("name"))
    cfg["email"] = ask("E-mail (Vy sends the case number here)", cfg.get("email"))
    cfg["account"] = ask("Norwegian bank account for payouts (11 digits)", cfg.get("account"), valid_account)
    for key, label in (("home", "Home station"), ("work", "Work station")):
        cur = cfg.get(key, {}).get("name")
        cfg[key] = ask(label, cur, lambda v: find_station(v))
        print(f"  -> {cfg[key]['name']} ({cfg[key]['nsr']})")
    print("Usual departure times let 'scan' hide trains you'd never take (+-2 h around them).")
    for key, frm, to in (("times_out", "home", "work"), ("times_back", "work", "home")):
        cur = ", ".join(cfg.get(key, [])) or None
        cfg[key] = ask(f"  Usual departure(s) {cfg[frm]['name']} -> {cfg[to]['name']} "
                       f"(e.g. 07:15, 08:15; Enter = any time)", cur, valid_times)
    cfg.setdefault("threshold_min", DEFAULT_THRESHOLD)
    save_config(cfg)
    print("Saved.")
    if cfg.get("browser") != "bookmarklet" and confirm(
            "\nInstall the '👻 Innstilt: fyll ut' bookmark now (recommended)? [y/N] "):
        cmd_bookmarklet(None)


def cmd_ticket(args) -> None:
    cfg = load_config()
    ts = cfg["tickets"]
    find = lambda code: next((t for t in ts if t["code"] == valid_ref(code)), None)  # noqa: E731
    if args.action == "add":
        t = ask_ticket({"code": args.code} if args.code else None)
        ts[:] = [x for x in ts if x["code"] != t["code"]] + [t]
    elif args.action in ("edit", "remove"):
        if not args.code and len(ts) == 1:
            args.code = ts[0]["code"]
        t = find(args.code) if args.code else None
        if not t:
            sys.exit("Which ticket? innstilt ticket " + args.action + " XXX-XXX-XXX")
        if args.action == "edit":
            ts[ts.index(t)] = ask_ticket(t)
        else:
            ts.remove(t)
    save_config(cfg)
    print("Your tickets:" if ts else "No tickets saved.")
    now = dt.datetime.now(TZ)
    for t in sorted(ts, key=lambda t: t.get("valid_from") or ""):
        active = " <- valid now" if ticket_for({"tickets": [t]}, now) else ""
        print(f"  {fmt_valid(t)}{active}")
    show_notice(cfg)


def _claims_summary() -> list[dict]:
    """One row per submitted claim, with the latest outcome recorded for its case."""
    if not CLAIMS.exists():
        return []
    rows, outcomes, cases = [], {}, {}
    for line in CLAIMS.read_text().splitlines():
        c = json.loads(line)
        if c.get("status") == "submitted":
            rows.append(c)
        elif c.get("status") == "outcome":
            outcomes[c["case"]] = c
        elif c.get("status") == "case":  # case number attached later (innstilt status --row N --case C)
            cases[(c["from"], c["to"], c["planned"])] = c["case"]
    for r in rows:
        r["case"] = cases.get((r["from"], r["to"], r["planned"])) or r.get("case")
    for r in rows:
        o = outcomes.pop(r.get("case") or "", None)
        r["outcome"], r["amount"] = (o["outcome"], o.get("amount")) if o else ("pending", None)
    for case, o in outcomes.items():  # recorded from Vy's e-mails for claims sent before case logging
        rows.append({"planned": None, "from": "", "to": "", "from_name": "(trip not in log)", "to_name": "",
                     "case": case, "outcome": o["outcome"], "amount": o.get("amount")})
    return rows


def _sorted_rows() -> list[dict]:
    return sorted(_claims_summary(), key=lambda r: r["planned"] or "")


def cmd_status(args) -> None:
    cfg = load_config()
    if args.row is not None:  # attach a case number and/or an outcome to a numbered row
        rows = _sorted_rows()
        if not 1 <= args.row <= len(rows):
            sys.exit(f"No row {args.row} - run 'innstilt status' to see the numbers.")
        r = rows[args.row - 1]
        if args.set_case:
            if not r.get("planned"):
                sys.exit("That row is a case without a trip; it already has its number.")
            _append_private(CLAIMS, {"at": dt.datetime.now(TZ).isoformat(), "status": "case", "from": r["from"],
                                     "to": r["to"], "planned": r["planned"], "case": args.set_case})
            r["case"] = args.set_case
            print(f"Row {args.row}: case number {args.set_case}.")
        if args.case:  # with --row, the positionals are OUTCOME [AMOUNT]
            args.outcome, args.amount, args.case = args.case, args.outcome, r.get("case")
            if not args.case:
                sys.exit("That row has no case number yet - add it: innstilt status --row N --case NUMBER")
    if args.case:
        if args.outcome not in ("paid", "rejected", "pending"):
            sys.exit("Usage: innstilt status CASE paid|rejected|pending [AMOUNT]")
        known = {r.get("case") for r in _claims_summary()}
        if args.case not in known:
            print(f"  (case {args.case} isn't in the log - recording it anyway)")
        _append_private(CLAIMS, {"at": dt.datetime.now(TZ).isoformat(), "status": "outcome", "case": args.case,
                                 "outcome": args.outcome,
                                 "amount": float(args.amount.replace(",", ".")) if args.amount else None})
        print(f"Recorded: case {args.case} {args.outcome}" + (f" {args.amount} kr" if args.amount else "") + ".")
    names = {cfg[k]["nsr"]: cfg[k]["name"] for k in ("home", "work") if k in cfg}
    rows = _claims_summary()
    if not rows:
        print("No claims marked as sent yet.")
        return
    rows = _sorted_rows()
    print(f"\n{'#':>2}  {'When':<11} {'Trip':<28} {'Case':>8}  Result")
    for n, r in enumerate(rows, 1):
        when = dt.datetime.fromisoformat(r["planned"]).strftime("%d.%m %H:%M") if r["planned"] else "  ?  "
        a = (r.get("from_name") or names.get(r["from"], r["from"])).removesuffix(" stasjon")
        b = (r.get("to_name") or names.get(r["to"], r["to"])).removesuffix(" stasjon")
        res = r["outcome"] + (f" {r['amount']:g} kr" if r["amount"] is not None else "")
        trip = f"{a} -> {b}" if b else a
        print(f"{n:>2}  {when:<11} {trip:<28} {r.get('case') or '-':>8}  {res}")
    paid = [r for r in rows if r["outcome"] == "paid"]
    total = sum(r["amount"] or 0 for r in paid)
    print(f"\n{len(rows)} sent, {len(paid)} paid ({total:g} kr), "
          f"{sum(r['outcome'] == 'rejected' for r in rows)} rejected, "
          f"{sum(r['outcome'] == 'pending' for r in rows)} pending.")
    if any(not r.get("case") for r in rows):
        print("Rows without a case number: find it in Vy's confirmation e-mail, then\n"
              "  innstilt status --row N --case NUMBER          (optionally add: paid 21)")
    print("Record a result: innstilt status CASE paid AMOUNT   (or: rejected)")


def cmd_bookmarklet(_args) -> None:
    page = Path(__file__).resolve().parent.parent / "bookmarklet" / "install.html"
    if not page.exists():
        sys.exit(f"Missing {page} - run: .venv/bin/python bookmarklet/build.py")
    cfg = load_config()
    cfg["browser"] = "bookmarklet"
    save_config(cfg)
    webbrowser.open(page.as_uri())
    print("Opened the install page - drag '👻 Innstilt: fyll ut' to your bookmarks bar.\n"
          "From now on claim/scan open Vy's form in your normal browser; click the bookmark there.\n"
          "(Use --assistant on claim/scan to get Innstilt's own browser window instead.)")


def cmd_check(args) -> None:
    cfg = load_config()
    if not args.quiet:
        show_notice(cfg)
    day = dt.date.fromisoformat(args.date) if args.date else dt.datetime.now(TZ).date()
    start = dt.datetime.combine(day, dt.time(4, 0), TZ)
    now = dt.datetime.now(TZ)
    pairs = [(cfg["home"], cfg["work"]), (cfg["work"], cfg["home"])]
    if args.frm or args.to:
        pairs = [route(cfg, args)]
    found = new = 0
    past = day < now.date()
    for frm, to in pairs:
        if past:
            js = archive_journeys(frm, to, day)
        else:
            js = [j for j in journeys(frm, to, start, 22 * 3600)
                  if dt.datetime.fromisoformat(j["aimed_departure"]) <= now]
        if not args.quiet:
            print(f"\n{frm['name']} -> {to['name']}  ({day}, {len(js)} trains, "
                  f"{sum(j['realtime'] for j in js)} with recorded data"
                  f"{', Entur archive' if past else ', live'})")
        for j in js:
            if eligible(j, cfg["threshold_min"]):
                found += 1
                is_new = record_evidence(frm, to, j)
                new += is_new
                if args.quiet and is_new:
                    msg = f"{frm['name']} -> {to['name']}: " + describe(j).strip()
                    print("DELAY " + msg)
                    if args.notify:
                        notify(msg)
            if not args.quiet and (eligible(j, cfg["threshold_min"]) or args.all):
                print("  " + describe(j))
                if j["cancelled"]:
                    nxt = next_train(js, j)
                    if nxt:
                        print(f"        next train {nxt['line']} {hm(nxt['aimed_departure'])}: arrived "
                              f"{effective_delay(j, nxt):+d} min vs your planned arrival"
                              f"{'' if nxt['arrival_is_actual'] else ' (scheduled - no recorded time)'}")
    if not args.quiet:
        print(f"\n{found} train(s) over {cfg['threshold_min']} min late or cancelled. "
              f"Evidence: {EVIDENCE}")
        if found:
            print("Claim one with:  innstilt claim --time HH:MM [--date YYYY-MM-DD] [--reverse]")


def cmd_claim(args) -> None:
    cfg = load_config()
    show_notice(cfg)
    frm, to = route(cfg, args)
    day = dt.date.fromisoformat(args.date) if args.date else dt.datetime.now(TZ).date()
    planned = dt.datetime.combine(day, dt.time.fromisoformat(args.time), TZ)
    if (dt.datetime.now(TZ) - planned).days > 90:
        print("! Over 3 months ago - Vy's deadline has probably passed.")

    match, cands = find_evidence(frm, to, planned), []
    if not match:
        try:
            if day < dt.datetime.now(TZ).date():
                cands = archive_journeys(frm, to, day)
            else:
                cands = journeys(frm, to, planned - dt.timedelta(minutes=1), 5 * 60)
            match = next((j for j in cands if dt.datetime.fromisoformat(j["aimed_departure"]) == planned), None)
        except (httpx.HTTPError, RuntimeError) as e:
            print(f"! Entur lookup failed ({e}); continuing without verification.")
    print(f"\n{frm['name']} -> {to['name']}, planned departure {planned:%Y-%m-%d %H:%M}")
    if match:
        print("  " + describe(match))
        nxt = next_train(cands, match) if match["cancelled"] and cands else None
        if nxt:
            print(f"  Next train {nxt['line']} {hm(nxt['aimed_departure'])} got you there "
                  f"{effective_delay(match, nxt):+d} min late"
                  f"{'' if nxt['arrival_is_actual'] else ' by the timetable (no recorded time)'}."
                  " Vy's 50 % refund is based on how late you arrived.")
        if match["realtime"] and not eligible(match, cfg["threshold_min"]):
            print(f"! Entur shows this train under the {cfg['threshold_min']} min limit at {to['name']}.")
            if not confirm("  File anyway? [y/N] "):
                return
        record_evidence(frm, to, match)
        if not match["realtime"]:
            print("  No live data recorded for this train - Vy will check it manually.")
    else:
        print("  No train found at that time in Entur's data - check the time. "
              "You'll pick the departure in the form.")

    assistant = make_assistant(args, cfg)
    try:
        assisted, case = open_claim(cfg, frm, to, planned, match, print_only=args.no_open, assistant=assistant)
        if assisted and not case:
            print("  No confirmation seen - not marked as sent.")
    finally:
        if assistant:
            assistant.close()


class FormAssistant:
    """A visible browser window that YOU submit from. It opens the prefilled link, retypes the
    departure time and selects the train (Vy's form shows the time from the link but only accepts
    it once typed - seen 2026-11-20), then waits while you check the form and press 'Send inn'.
    It never presses 'Send inn' itself. It reads the case number from the confirmation page."""

    def __init__(self):
        from playwright.sync_api import sync_playwright
        self._pw = sync_playwright().start()
        # A persistent profile (like a normal browser) keeps Vy's cookies between runs, so a
        # solved CAPTCHA can carry over to the next claims instead of starting fresh every time.
        profile = HOME / "browser-profile"
        profile.mkdir(parents=True, exist_ok=True, mode=0o700)
        self._ctx = self._pw.chromium.launch_persistent_context(
            str(profile), headless=bool(os.environ.get("INNSTILT_HEADLESS")), locale="nb-NO", viewport=None)
        self._browser = self._ctx
        self.page = None

    def close(self):
        for f in (self._browser.close, self._pw.stop):
            try:
                f()
            except Exception:  # noqa: BLE001
                pass

    def _page(self):
        if self.page is None or self.page.is_closed():
            # a persistent context opens with one blank tab - reuse it
            blank = [p for p in self._ctx.pages if not p.is_closed() and p.url in ("about:blank", "")]
            self.page = blank[0] if blank else self._ctx.new_page()
            self.lookups = []  # HTTP statuses of Vy's ticket lookups (GET /api/form/order)
            self.page.on("response", lambda r: "/api/form/order" in r.url and self.lookups.append(r.status))
        return self.page

    _FIND_TIME_JS = """() => {
        const own = e => [...e.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join('').trim();
        const labs = [...document.querySelectorAll('main *')].filter(e => /^Avgangstid/i.test(own(e))
                       || /^Avgangstid/i.test((e.getAttribute('aria-label') || '')));
        for (const lab of labs) {
            let field = null;
            if (lab.htmlFor) field = document.getElementById(lab.htmlFor);
            if (!field && lab.id) field = document.querySelector(`[aria-labelledby~="${CSS.escape(lab.id)}"]`);
            let n = field || lab;
            while (n && !n.querySelector('[role=spinbutton], input:not([type=radio]):not([type=hidden])')
                   && n.getAttribute('role') !== 'spinbutton' && n.tagName !== 'INPUT') n = n.parentElement;
            if (!n) continue;
            const segs = n.getAttribute('role') === 'spinbutton' ? [n] : [...n.querySelectorAll('[role=spinbutton]')];
            if (segs.length >= 2) {
                segs.at(-2).setAttribute('data-innstilt', 'h'); segs.at(-1).setAttribute('data-innstilt', 'm');
                return 2;
            }
            const inp = n.tagName === 'INPUT' ? n
                : [...n.querySelectorAll('input:not([type=radio]):not([type=hidden])')].at(-1);
            if (inp) { inp.setAttribute('data-innstilt', 't'); return 1; }
        }
        return 0;
    }"""

    def _set_time(self, pg, planned: dt.datetime) -> None:
        try:
            pg.get_by_text("Avgangstid").first.wait_for(timeout=15_000)
        except Exception:  # noqa: BLE001
            pass
        found = pg.evaluate("""() => {
            const h = document.querySelector('[role=spinbutton][aria-label="Velg time"]');
            const m = document.querySelector('[role=spinbutton][aria-label="Velg minutt"]');
            if (!h || !m) return 0;
            h.setAttribute('data-innstilt', 'h'); m.setAttribute('data-innstilt', 'm');
            return 2;
        }""") or pg.evaluate(self._FIND_TIME_JS)
        if found == 2:
            # Typing "14" over an hour segment that already shows 14 isn't a change to the form,
            # so the field stays unvalidated and the train list never loads. Clear, then type.
            for seg, val in (("h", f"{planned:%H}"), ("m", f"{planned:%M}")):
                pg.click(f"[data-innstilt={seg}]")
                pg.keyboard.press("Backspace"); pg.keyboard.press("Backspace")
                pg.wait_for_timeout(150)
                pg.click(f"[data-innstilt={seg}]")
                pg.keyboard.type(val, delay=60)
        elif found == 1:
            el = pg.locator("[data-innstilt=t]")
            el.click(); el.press("ControlOrMeta+a"); pg.keyboard.type(f"{planned:%H:%M}")
        else:
            self._dump(pg)
            raise RuntimeError(f"time field not found - saved the form's structure to {HOME / 'debug-form.html'}")
        pg.keyboard.press("Tab")

    def _dump(self, pg) -> None:
        """Save the form's HTML (local only, mode 600) so the field structure can be inspected."""
        try:
            html = pg.evaluate("""() => {
                const own = e => [...e.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join('');
                const lab = [...document.querySelectorAll('main *')].find(e => /Avgangstid/i.test(own(e)));
                let n = lab; for (let i = 0; n && i < 6; i++) n = n.parentElement;
                return (n || document.querySelector('main') || document.body).outerHTML;
            }""")
            _write_private(HOME / "debug-form.html", html)
        except Exception:  # noqa: BLE001
            pass

    _TICKET_STATE_JS = """() => {
        // The time segments only render after a successful ticket lookup. The referenceCode error
        // element contains "Beklager, vi fant ingen reise..." from the start even when the lookup
        // succeeds (trace 2026-11-20), so it only counts if visible and no time field appeared.
        const hasTime = !!document.querySelector('[role=spinbutton][aria-label="Velg time"], [role=spinbutton]');
        if (hasTime) return 'ok';
        const err = document.getElementById('REFUND_OR_COMPENSATION-form-referenceCode-error');
        const visible = err && err.getClientRects().length && getComputedStyle(err).visibility !== 'hidden';
        return visible && err.innerText.trim() ? 'error:' + err.innerText.trim() : 'loading';
    }"""

    def _wait_for_ticket(self, pg, link: str) -> None:
        """Vy looks the ticket up (GET /api/form/order) when the page opens, behind its CAPTCHA; that
        first lookup often fails (405) and the form says 'Beklager, vi fant ingen reise med denne koden'.
        The user then presses 'Hent billetten' (solving the CAPTCHA if asked). We watch Vy's own
        lookup responses: once one succeeds, the CAPTCHA pass is fresh, so we reload our link and the
        automatic lookup works, with every field from the link back in place."""
        import time
        start, last, asked = time.monotonic(), None, 0
        while time.monotonic() - start < 300:
            state = pg.evaluate(self._TICKET_STATE_JS)
            if state != last:
                self._trace(pg, f"ticket state: {state[:80]} lookups={self.lookups[-3:]}")
                last = state
            if state == "ok":
                pg.wait_for_timeout(800)  # let the journey section settle after the ticket arrives
                if pg.evaluate(self._TICKET_STATE_JS) == "ok":
                    return
            if state.startswith("error:") and asked < 3 and time.monotonic() - start > 10:
                asked += 1
                print("  Vy couldn't fetch your ticket (usually its CAPTCHA). In the window: press\n"
                      "  'Hent billetten' and solve the CAPTCHA if asked. I'll then reload the form with\n"
                      "  everything filled in.")
                seen = len(self.lookups)
                while time.monotonic() - start < 300:
                    pg.wait_for_timeout(500)
                    if 200 in self.lookups[seen:]:
                        break
                self._trace(pg, f"manual lookup done, lookups={self.lookups[-3:]}")
                pg.wait_for_timeout(1500)
                if pg.evaluate(self._TICKET_STATE_JS) != "ok":  # manual lookup reset the form
                    pg.goto(link, wait_until="domcontentloaded")
                    self._trace(pg, "reloaded link after manual lookup")
                last = None
                continue
            pg.wait_for_timeout(700)
        raise RuntimeError("ticket never loaded")

    def _still_filled(self, pg) -> bool:
        """Our markers vanish if the form re-rendered after we filled it."""
        return pg.evaluate("""() => {
            if (/Saksnummer/.test(document.body.innerText)) return true;  // already sent
            const dep = document.querySelector('[data-innstilt=dep]');
            const t = document.querySelector('[data-innstilt=h], [data-innstilt=t]');
            return !!(dep && dep.checked && t);
        }""")

    def _pick_departure(self, pg, planned: dt.datetime, match: dict | None) -> str:
        pg.wait_for_selector("input[name=departureList]", state="attached", timeout=15_000)
        pg.wait_for_timeout(500)
        want = vy_departure_id(match) if match else ""
        label = pg.evaluate("""([want, hhmm, line]) => {
            const opts = [...document.querySelectorAll('input[name=departureList]')].map(e => {
                const l = (e.id && document.querySelector(`label[for="${CSS.escape(e.id)}"]`)) || e.closest('label');
                return {e, text: (l ? l.innerText : '').replace(/\\s+/g, ' ').trim()};
            });
            const hit = opts.find(o => o.e.value === want)
                     || opts.find(o => o.text.startsWith(hhmm) && (!line || o.text.includes(line)))
                     || opts.find(o => o.text.startsWith(hhmm));
            if (!hit) return null;
            hit.e.setAttribute('data-innstilt', 'dep');
            return hit.text;
        }""", [want, f"{planned:%H:%M}", match["line"] if match else ""])
        if not label:
            raise RuntimeError(f"no {planned:%H:%M} train in Vy's list")
        pg.locator("[data-innstilt=dep]").check(force=True)
        return label

    _SNAPSHOT_JS = """() => {
        const own = e => [...e.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join('').trim();
        const lab = [...document.querySelectorAll('main *')].find(e => /^Avgangstid/i.test(own(e)));
        let n = lab; for (let i = 0; n && i < 4; i++) n = n.parentElement;
        const deps = [...document.querySelectorAll('input[name=departureList]')]
            .map(e => e.value + (e.checked ? ' [x]' : ''));
        const errs = [...document.querySelectorAll('[aria-invalid=true], [role=alert]')]
            .map(e => (e.name || e.id || e.getAttribute('role')) + ': ' + (e.innerText || e.value || '').slice(0, 80));
        const active = document.activeElement;
        return {timeHtml: n ? n.outerHTML.replace(/\\s+/g, ' ').slice(0, 4000) : null, deps, errs,
                url: location.search.match(/manualJourneyInfo\\.time=[^&]*/)?.[0],
                focus: active ? active.outerHTML.slice(0, 200) : null};
    }"""

    def _trace(self, pg, stage: str) -> None:
        """INNSTILT_DEBUG=1: record the time field at each stage to ~/.config/innstilt/debug-trace.txt."""
        if not os.environ.get("INNSTILT_DEBUG"):
            return
        try:
            snap = pg.evaluate(self._SNAPSHOT_JS)
        except Exception as e:  # noqa: BLE001
            snap = {"error": str(e)}
        HOME.mkdir(parents=True, exist_ok=True, mode=0o700)
        fd = os.open(HOME / "debug-trace.txt", os.O_WRONLY | os.O_CREAT | os.O_APPEND, 0o600)
        with os.fdopen(fd, "a") as f:
            f.write(f"\n===== {dt.datetime.now():%H:%M:%S.%f} {stage}\n")
            for k, v in snap.items():
                f.write(f"{k}: {v}\n")

    def claim(self, link: str, planned: dt.datetime, match: dict | None, timeout_s: int = 1200) -> str | None:
        try:
            return self._claim(link, planned, match, timeout_s)
        except Exception as e:  # noqa: BLE001
            if "closed" in str(e).lower():
                print("  Window closed - skipped.")
                self.page = None
                return None
            raise

    def _claim(self, link: str, planned: dt.datetime, match: dict | None, timeout_s: int) -> str | None:
        import re
        import time
        pg = self._page()
        pg.bring_to_front()
        # not "networkidle": Vy's chat widget and WAF telemetry keep the network busy
        pg.goto(link, wait_until="domcontentloaded")
        self._trace(pg, "page loaded")
        try:
            self._wait_for_ticket(pg, link)
            self._trace(pg, "ticket loaded")
            for attempt in range(3):
                self._set_time(pg, planned)
                self._trace(pg, f"time typed (attempt {attempt + 1})")
                picked = self._pick_departure(pg, planned, match)
                self._trace(pg, f"train picked: {picked}")
                pg.wait_for_timeout(1500)
                self._trace(pg, "1.5 s later")
                if self._still_filled(pg):
                    break
                print("  (the form redrew itself - filling the time again)")
            else:
                raise RuntimeError("the form keeps resetting the time")
            print(f"  Form filled (train: {picked}). Check it in the window and press 'Send inn'.")
        except Exception as e:  # noqa: BLE001
            if "closed" in str(e).lower():
                raise
            self._trace(pg, f"FAILED: {e}")
            print(f"  ! Couldn't finish the form automatically ({str(e).splitlines()[0]}).\n"
                  f"    Retype the time {planned:%H:%M} and pick the train yourself, then press 'Send inn'.")
        print("    (To skip this one: close the tab.)")
        start = time.monotonic()
        traced = 0
        while time.monotonic() - start < timeout_s:
            try:
                if pg.is_closed():
                    return None
                m = re.search(r"Saksnummer:?\s*(\d+)", pg.inner_text("body", timeout=5000))
                if m:
                    return m.group(1)
                if traced < 6 and time.monotonic() - start > 5 * (traced + 1):
                    traced += 1
                    self._trace(pg, f"waiting for you, +{5 * traced} s")
                pg.wait_for_timeout(1000)
            except Exception:  # noqa: BLE001  (navigation in progress / window closed)
                if pg.is_closed():
                    return None
                time.sleep(0.5)
        return None


def make_assistant(args, cfg: dict | None = None) -> "FormAssistant | None":
    if getattr(args, "plain", False) or getattr(args, "no_open", False):
        return None
    if (cfg or {}).get("browser") == "bookmarklet" and not getattr(args, "assistant", False):
        return None
    try:
        return FormAssistant()
    except Exception as e:  # noqa: BLE001  (Playwright missing / no display)
        print(f"(Using your normal browser - form assistant unavailable: {e.__class__.__name__}. "
              "Install Playwright for one-click claims.)")
        return None


def mark_submitted(frm: dict, to: dict, planned: dt.datetime, case: str | None) -> None:
    _append_private(CLAIMS, {"opened_at": dt.datetime.now(TZ).isoformat(), "from": frm["nsr"], "to": to["nsr"],
                             "from_name": frm.get("name"), "to_name": to.get("name"),
                             "planned": planned.isoformat(), "status": "submitted", "case": case})


def open_claim(cfg, frm, to, planned, match, print_only=False, assistant=None) -> tuple[bool, str | None]:
    """Open the prefilled form. Returns (assisted, case number if the confirmation page was seen)."""
    if not ticket_for(cfg, planned):
        print(f"  ! None of your tickets covers {planned:%d.%m.%Y %H:%M} - skipped. "
              "Add that ticket: innstilt ticket add")
        return False, None
    link = build_link(cfg, frm, to, planned, match)
    _append_private(CLAIMS, {"opened_at": dt.datetime.now(TZ).isoformat(), "from": frm["nsr"], "to": to["nsr"],
                             "from_name": frm["name"], "to_name": to["name"],
                             "planned": planned.isoformat(), "journey": match, "status": "form_opened"})
    if assistant:
        case = assistant.claim(link, planned, match)
        if case:
            mark_submitted(frm, to, planned, case)
            print(f"  Sent - Vy case {case}.")
        return True, case
    train = f"{match['line']} {hm(match['aimed_departure'])}" if match else f"the {planned:%H:%M} train"
    if print_only:
        print("\n" + link)
        return False, None
    webbrowser.open(link)
    if cfg.get("browser") == "bookmarklet":
        print(f"  Opened Vy's form. Click the '👻 Innstilt: fyll ut' bookmark (sets {planned:%H:%M}, picks {train}),\n"
              "  check the form and press 'Send inn'.")
    else:
        print(f"  Opened Vy's form. Retype the departure time {planned:%H:%M}, select {train} in the list,\n"
              "  check the form and press 'Send inn'.  (Tip: 'innstilt bookmarklet' does this for you.)")
    case = ask_case()
    if case is not None:
        mark_submitted(frm, to, planned, case or None)
        print("  Marked as sent" + (f" - Vy case {case}." if case else "."))
    return False, case


def ask_case() -> str | None:
    """After sending in the user's browser: case number, '' if sent without one, None if not sent."""
    try:
        a = input("  Case number from Vy's confirmation (Enter = sent, no number; n = not sent): ").strip()
    except EOFError:
        return None
    if a.lower() in ("n", "no", "nei"):
        return None
    digits = "".join(ch for ch in a if ch.isdigit())
    return digits


def claimed() -> set[tuple[str, str, str]]:
    """(from nsr, to nsr, planned iso) of trips marked as sent."""
    out = set()
    if CLAIMS.exists():
        for line in CLAIMS.read_text().splitlines():
            c = json.loads(line)
            if c.get("status") == "submitted":
                out.add((c["from"], c["to"], c["planned"]))
    return out


def cmd_scan(args) -> None:
    cfg = load_config()
    show_notice(cfg)
    today = dt.datetime.now(TZ).date()
    since = dt.date.fromisoformat(args.since)
    until = dt.date.fromisoformat(args.until) if args.until else today - dt.timedelta(days=1)
    if since < today - dt.timedelta(days=90):
        print("! Vy's deadline is 3 months - older trips will likely be rejected.")
    pairs = [(cfg["home"], cfg["work"]), (cfg["work"], cfg["home"])]
    if args.frm or args.to:
        pairs = [route(cfg, args)]
    done, sent = claimed(), 0

    def usual(frm: dict, to: dict) -> list[str]:
        if args.all_times:
            return []
        if (frm["nsr"], to["nsr"]) == (cfg["home"]["nsr"], cfg["work"]["nsr"]):
            return cfg.get("times_out", [])
        if (frm["nsr"], to["nsr"]) == (cfg["work"]["nsr"], cfg["home"]["nsr"]):
            return cfg.get("times_back", [])
        return []

    def near(j: dict, times: list[str]) -> bool:
        if not times:
            return True
        t = dt.datetime.fromisoformat(j["aimed_departure"]).astimezone(TZ)
        mins = t.hour * 60 + t.minute
        return any(abs(mins - (int(x[:2]) * 60 + int(x[3:]))) <= args.window for x in times)

    for frm, to in pairs:
        ts = usual(frm, to)
        print(f"{frm['name']} -> {to['name']}: "
              + (f"trains within +-{args.window} min of {', '.join(ts)}" if ts else "all times"))
    if not any(cfg.get(k) for k in ("times_out", "times_back")) and not args.all_times:
        print("(tip: run 'innstilt setup' to add your usual travel times and hide the rest)")
    print("\nFor each day: type the numbers of trips you were on (e.g. 1 3), Enter for none, q to stop.\n")
    assistant, tried = None, False
    uncovered: set[dt.date] = set()
    day = since
    while day <= until:
        cands = []
        for frm, to in pairs:
            js = archive_journeys(frm, to, day)
            for j in js:
                key = (frm["nsr"], to["nsr"], dt.datetime.fromisoformat(j["aimed_departure"]).isoformat())
                if eligible(j, cfg["threshold_min"]) and key not in done and near(j, usual(frm, to)):
                    if not ticket_for(cfg, dt.datetime.fromisoformat(j["aimed_departure"])):
                        uncovered.add(day)
                        continue
                    cands.append((frm, to, j, next_train(js, j) if j["cancelled"] else None))
        if cands:
            print(f"{day:%a %d %b}")
            for i, (frm, to, j, nxt) in enumerate(cands, 1):
                extra = ""
                if nxt:
                    d = effective_delay(j, nxt)
                    extra = f"   next: {nxt['line']} {hm(nxt['aimed_departure'])} -> you'd arrive {d:+d} min"
                print(f"  {i:>2}. {frm['name'].removesuffix(' stasjon')} -> {to['name'].removesuffix(' stasjon')}"
                      f"  {describe(j).strip()}{extra}")
            try:
                pick = input("  Which did you take? ").strip().lower()
            except EOFError:
                pick = "q"
            if pick == "q":
                break
            for tok in pick.replace(",", " ").split():
                if not tok.isdigit() or not 1 <= int(tok) <= len(cands):
                    print(f"  ! ignoring '{tok}'")
                    continue
                frm, to, j, _ = cands[int(tok) - 1]
                planned = dt.datetime.fromisoformat(j["aimed_departure"])
                record_evidence(frm, to, j)
                if not tried:  # start the browser window on the first pick only
                    assistant, tried = make_assistant(args, cfg), True
                    if assistant:
                        atexit.register(assistant.close)
                assisted, case = open_claim(cfg, frm, to, planned, j, assistant=assistant)
                if case is not None:
                    sent += 1
                elif assisted:
                    print("  Skipped (no confirmation seen).")
            print()
        day += dt.timedelta(days=1)
    if assistant:
        assistant.close()
    if uncovered:
        print(f"Skipped delays on {len(uncovered)} day(s) no saved ticket covers "
              f"({', '.join(f'{d:%d.%m}' for d in sorted(uncovered))}). Add that ticket: innstilt ticket add")
    print(f"Done - {sent} claim(s) marked as sent. Log: {CLAIMS}")


def main(argv=None) -> None:
    ap = argparse.ArgumentParser(prog="innstilt", description=__doc__.split("\n")[0])
    sub = ap.add_subparsers(dest="cmd", required=True)
    sub.add_parser("setup").set_defaults(fn=cmd_setup)
    sub.add_parser("bookmarklet", help="install the bookmark and use your own browser").set_defaults(fn=cmd_bookmarklet)
    tp = sub.add_parser("ticket", help="list / add / edit / remove tickets")
    tp.add_argument("action", nargs="?", default="list", choices=["list", "add", "edit", "remove"])
    tp.add_argument("code", nargs="?")
    tp.set_defaults(fn=cmd_ticket)
    st = sub.add_parser("status", help="sent claims and what Vy paid")
    st.add_argument("case", nargs="?")
    st.add_argument("outcome", nargs="?")
    st.add_argument("amount", nargs="?")
    st.add_argument("--row", type=int, help="row number from the list")
    st.add_argument("--case", dest="set_case", help="with --row: the case number from Vy's e-mail")
    st.set_defaults(fn=cmd_status)
    for name, fn in (("check", cmd_check), ("claim", cmd_claim), ("scan", cmd_scan)):
        sp = sub.add_parser(name)
        sp.set_defaults(fn=fn)
        sp.add_argument("--date", help="YYYY-MM-DD (default today)")
        sp.add_argument("--from", dest="frm", help="station (default: home)")
        sp.add_argument("--to", help="station (default: work)")
        sp.add_argument("--reverse", action="store_true", help="swap from/to (work -> home)")
    sub.choices["check"].add_argument("--all", action="store_true", help="show on-time trains too")
    sub.choices["check"].add_argument("--notify", action="store_true", help="desktop notification for new delays")
    sub.choices["check"].add_argument("--quiet", action="store_true", help="only print newly found delays (for timers)")
    sub.choices["claim"].add_argument("--time", required=True, help="planned departure HH:MM")
    sub.choices["scan"].add_argument("--since", required=True, help="first day YYYY-MM-DD (e.g. ticket start)")
    sub.choices["scan"].add_argument("--until", help="last day (default yesterday)")
    sub.choices["scan"].add_argument("--window", type=int, default=DEFAULT_WINDOW,
                                     help=f"minutes either side of your usual times (default {DEFAULT_WINDOW})")
    sub.choices["scan"].add_argument("--all-times", action="store_true", help="ignore usual times")
    for name in ("claim", "scan"):
        sub.choices[name].add_argument("--plain", action="store_true",
                                       help="open forms in your normal browser instead of the assistant window")
        sub.choices[name].add_argument("--assistant", action="store_true",
                                       help="use Innstilt's own browser window even in bookmarklet mode")
    sub.choices["claim"].add_argument("--no-open", action="store_true", help="print the link instead")
    args = ap.parse_args(argv)
    args.fn(args)


if __name__ == "__main__":
    main()
