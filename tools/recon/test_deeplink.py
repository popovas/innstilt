"""Check whether a fully parameterised URL restores the form state (no submit).
Result (2026-11-20): it does, but Vy's WAF blocks headless browsers - see docs/findings.md."""
import json, sys
from pathlib import Path
from playwright.sync_api import sync_playwright
sys.path.insert(0, str(Path(__file__).parent))
url = json.load(open(Path(__file__).parent / "out/guided/14_fields.json"))["url"]
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(locale="nb-NO")
    pg.on("response", lambda r: "/api/form" in r.url and print("[api]", r.status, r.url[:110]))
    pg.goto(url, wait_until="networkidle"); pg.wait_for_timeout(3000)
    vals = pg.evaluate("""() => [...document.querySelectorAll('main input')].filter(e=>e.name).map(e =>
        [e.name, e.type==='radio'||e.type==='checkbox' ? (e.checked? 'CHECKED:'+e.value : null) : e.value]).filter(x=>x[1])""")
    for v in vals: print(v)
    pg.screenshot(path=str(Path(__file__).parent / "out/deeplink.png"), full_page=True)
    b.close()
