"""Debug a prefilled claim link in a visible browser. Never submits.

Usage:  .venv/bin/python tools/recon/debug_link.py            (uses your most recently opened claim)

Prints: the departureList id our link asked for, the departure options Vy's page actually offers
(from the page's own trainData/search call), which option ended up selected, and any fields Vy
flags as invalid. Close the window when done.
"""
import json
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "cli"))
import innstilt as v  # noqa: E402

cfg = v.load_config()
last = [json.loads(line) for line in v.CLAIMS.read_text().splitlines()
        if '"form_opened"' in line][-1]
frm = {"name": last["from_name"], "nsr": last["from"]}
to = {"name": last["to_name"], "nsr": last["to"]}
planned = v.dt.datetime.fromisoformat(last["planned"])
link = v.build_link(cfg, frm, to, planned, last["journey"])
asked = v.vy_departure_id(last["journey"]) if last["journey"] else None
print(f"Claim: {frm['name']} -> {to['name']} {planned:%Y-%m-%d %H:%M}")
print(f"Our departureList id: {asked}")

with sync_playwright() as p:
    b = p.chromium.launch(headless=False)
    pg = b.new_page(locale="nb-NO")

    def on_resp(r):
        if "trainData/search" in r.url:
            print(f"\nVy's own departure search: {r.url.split('?')[1]}")
            try:
                for d in r.json():
                    print(f"   option id={d['id']!r}  dep={d['departureTime']}"
                          f"{'   <-- MATCH' if d['id'] == asked else ''}")
            except Exception as e:  # noqa: BLE001
                print("   (unreadable)", e)

    pg.on("response", on_resp)
    pg.goto(link, wait_until="networkidle")
    pg.wait_for_timeout(3000)
    state = pg.evaluate("""() => ({
        time: [...document.querySelectorAll('input')].filter(e => /time|tid/i.test(e.name + e.id))
               .map(e => [e.name || e.id, e.value]),
        departures: [...document.querySelectorAll('input[name=departureList]')]
               .map(e => [e.value, e.checked]),
    })""")
    print("\nTime inputs on the page:", state["time"])
    print("Departure radios (value, checked):", state["departures"])
    print("\nNow press 'Send inn' in the window if you like (it only submits if Vy accepts it),")
    print("or just close the window. Invalid fields will be listed when you close it.")
    seen = None
    try:
        while not pg.is_closed():
            bad = pg.evaluate("""() => [...document.querySelectorAll('[aria-invalid=true]')]
                .map(e => (e.name || e.id) + ' = ' + JSON.stringify(e.value))""")
            if bad and bad != seen:
                print("Invalid fields:", bad)
                seen = bad
            pg.wait_for_timeout(2000)
    except Exception:  # noqa: BLE001  (window closed)
        pass
