"""Screenshots of the app with made-up demo data, for the introduction slides (web/img/tutorial/) and the
Google Play listing (with --play). Re-run after changing the app:

  .venv/bin/python tools/screenshots.py            # tutorial images, Norwegian and English
  .venv/bin/python tools/screenshots.py --play     # also full phone screenshots for Google Play (build/play/)

Uses the local train data in web/data and a fixed date; nothing is sent anywhere (Entur's live data and the
counter are replaced by empty answers)."""
import argparse
import datetime as dt
import functools
import http.server
import json
import threading
import time
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
WEB, OUT = ROOT / "web", ROOT / "web" / "img" / "tutorial"
NOW = dt.datetime(2026, 11, 20, 9, 0)   # first archive day shown: 19 Nov, an ordinary day with cancellations
OSLO, GJOVIK = {"id": "NSR:StopPlace:59872", "name": "Oslo S"}, {"id": "NSR:StopPlace:302", "name": "Gjøvik stasjon"}


def ms(y, m, d, h=0, mi=0):
    return int(dt.datetime(y, m, d, h, mi, tzinfo=dt.timezone(dt.timedelta(hours=1))).timestamp() * 1000)


def claim(date, dep, frm, to, line, status, amount, case):
    h, m = map(int, dep.split(":")); y, mo, d = map(int, date.split("-"))
    dms = ms(y, mo, d, h, m)
    return {"key": f"{frm['id']}|{to['id']}|{dms}", "fromId": frm["id"], "toId": to["id"], "fromName": frm["name"], "toName": to["name"],
            "date": date, "dep": dep, "line": line, "depMs": dms, "case": case, "status": status, "amount": amount, "sentAt": dms}


DEMO = {"welcomed": True, "bookmarkDone": True, "homeDone": True, "testerDone": True,
        "profile": {"name": "Ola Nordmann", "email": "ola@example.com", "account": "12345678903",
                    "routes": [{"a": GJOVIK, "b": OSLO, "timesOut": ["06:30"], "timesBack": ["16:00"]}]},
        "tickets": [{"kind": "vy", "code": "ABC-DEF-GHI", "validFrom": ms(2026, 11, 3, 8, 12), "validTo": ms(2026, 12, 3, 8, 12)},
                    {"kind": "vy", "code": "JKL-MNO-PQR", "validFrom": ms(2026, 10, 3, 8, 12), "validTo": ms(2026, 11, 3, 8, 12)}],
        "claims": [claim("2026-11-18", "16:09", OSLO, GJOVIK, "RE30", "pending", None, "100004"),   # made-up case numbers
                   claim("2026-11-12", "06:28", GJOVIK, OSLO, "RE30", "paid", 52, "100003"),
                   claim("2026-11-05", "16:09", OSLO, GJOVIK, "RE30", "paid", 52, "100002"),
                   claim("2026-10-29", "06:28", GJOVIK, OSLO, "RE30", "rejected", None, "100001")],
        "stats": {"share": False, "id": "", "lastSent": ""}}


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--play", action="store_true")
    args = ap.parse_args()
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", 8840), functools.partial(Quiet, directory=str(WEB)))
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    OUT.mkdir(parents=True, exist_ok=True)
    try:
        with sync_playwright() as p:
            b = p.chromium.launch()
            for lang in ("no", "en"):
                ctx = b.new_context(viewport={"width": 400, "height": 860}, device_scale_factor=2, has_touch=True, is_mobile=True,
                                    locale="nb-NO" if lang == "no" else "en-GB", color_scheme="light")
                ctx.route("https://api.entur.io/journey-planner/**", lambda r: r.fulfill(status=200, content_type="application/json",
                          body='{"data":{"stopPlace":{"estimatedCalls":[]}}}'))
                ctx.route("**/*.workers.dev/**", lambda r: r.abort())
                pg = ctx.new_page()
                pg.clock.set_fixed_time(NOW)
                pg.goto("http://127.0.0.1:8840/")
                pg.evaluate("([s, l]) => { localStorage.setItem('innstilt.v1', JSON.stringify(s)); localStorage.setItem('innstilt.lang', l); }", [DEMO, lang])

                def shot(name, sel, height, above=10):
                    # header hidden (it is sticky and would cover the crop); start just above the element
                    pg.evaluate("() => { const h = document.querySelector('header'); if (h) h.style.display = 'none'; }")
                    top = pg.evaluate("s => document.querySelector(s).getBoundingClientRect().top + scrollY", sel)
                    pg.evaluate("y => scrollTo(0, y)", max(0, top - above)); time.sleep(0.2)
                    pg.screenshot(path=str(OUT / f"{name}-{lang}.png"), clip={"x": 0, "y": 0, "width": 400, "height": height})
                    pg.evaluate("() => { const h = document.querySelector('header'); if (h) h.style.display = ''; scrollTo(0, 0); }")

                # 1: ticket and details (first-time setup, empty form with the demo name)
                pg.evaluate("() => { const s = JSON.parse(localStorage.getItem('innstilt.v1')); s.tickets = []; localStorage.setItem('innstilt.v1', JSON.stringify(s)); }")
                pg.goto("http://127.0.0.1:8840/#/trips"); pg.reload(); pg.wait_for_selector("#setup")
                shot("setup", "#setup", 520)
                pg.evaluate("s => localStorage.setItem('innstilt.v1', JSON.stringify(s))", DEMO)
                # 2: trips
                pg.goto("http://127.0.0.1:8840/#/trips"); pg.reload()
                pg.wait_for_selector("#trips .trip")
                for _ in range(40):
                    if "…" not in pg.inner_text("#progress"):
                        break
                    time.sleep(0.3)
                shot("trips", "#trips", 500)
                # 4: claims
                pg.goto("http://127.0.0.1:8840/#/claims"); pg.wait_for_selector(".claim")
                shot("claims", "#main h1", 420)
                # 5: settings (tickets and regular trips)
                pg.goto("http://127.0.0.1:8840/#/settings"); pg.wait_for_selector("#tickets .tickets")
                shot("settings", "#setup", 330)
                shot("routes", "#routes", 360, above=56)
                if args.play:
                    play = ROOT / "build" / "play"; play.mkdir(parents=True, exist_ok=True)
                    for route in ("trips", "claims", "settings"):
                        pg.goto(f"http://127.0.0.1:8840/#/{route}"); time.sleep(1.5)
                        pg.screenshot(path=str(play / f"{route}-{lang}.png"))
                ctx.close()
            b.close()
    finally:
        srv.shutdown()
    print("screenshots ->", OUT)


if __name__ == "__main__":
    main()
