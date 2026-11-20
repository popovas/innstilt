"""Phase 0 recon, part 2: YOU drive a visible browser; this script just watches.

Usage:  .venv/bin/python tools/recon/recon_guided.py XXX-XXX-XXX

- Opens Vy's claim form, picks "Jeg har referansekode" and prefills your code.
- You solve the CAPTCHA and click through the steps yourself.
- Each time the step changes, it saves the visible fields + screenshot to tools/recon/out/guided/.
- It logs Vy's own API calls (api/form/...) to tools/recon/out/guided/api_log.json.
- It NEVER clicks anything after the prefill. Submitting is your choice; closing the
  window before "Send inn" is fine and still gives us the field map.
Note: screenshots/logs will contain your ticket details - never commit or share tools/recon/out (it is git-ignored).
"""
import json
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

from common import FIELDS_JS, URL

OUT = Path(__file__).parent / "out" / "guided"
OUT.mkdir(parents=True, exist_ok=True)
code = sys.argv[1]
api_log, seen = [], set()


def on_response(resp):
    req = resp.request
    if "vy.no/api/" not in req.url or "metabase" in req.url:
        return
    try:
        body = resp.text()[:5000]
    except Exception:  # noqa: BLE001
        body = None
    api_log.append({"method": req.method, "url": req.url, "status": resp.status,
                    "post": req.post_data, "body": body})
    (OUT / "api_log.json").write_text(json.dumps(api_log, ensure_ascii=False, indent=1))
    print(f"[api] {resp.status} {req.method} {req.url}")


def snapshot(page):
    key = page.url.split("?", 1)[-1]
    try:
        fields = page.evaluate(FIELDS_JS)
    except Exception:  # noqa: BLE001
        return
    sig = (key, len(fields))
    if sig in seen:
        return
    seen.add(sig)
    n = len(seen)
    (OUT / f"{n:02d}_fields.json").write_text(json.dumps({"url": page.url, "fields": fields}, ensure_ascii=False, indent=1))
    (OUT / f"{n:02d}_text.txt").write_text(page.inner_text("main"))
    page.screenshot(path=str(OUT / f"{n:02d}.png"), full_page=True)
    print(f"[snap {n}] {page.url}  ({len(fields)} fields)")


with sync_playwright() as p:
    browser = p.chromium.launch(headless=False)
    page = browser.new_page(locale="nb-NO")
    page.on("response", on_response)
    page.goto(URL, wait_until="networkidle")
    page.get_by_text("Jeg har referansekode").first.click()
    page.locator("input[name=referenceCode]").fill(code)
    print("Prefilled. Click 'Hent billetten', solve the CAPTCHA, and walk through the steps.")
    print("Close the browser window when done (submitting is optional).")
    try:
        while not page.is_closed():
            snapshot(page)
            page.wait_for_timeout(1500)
    except Exception:  # noqa: BLE001  window closed
        pass
print(f"Saved {len(seen)} snapshots and {len(api_log)} API calls to {OUT}")
