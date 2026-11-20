"""Phase 0 recon: map Vy's claim form (reference-code path) without submitting anything.

Logs every API request the page makes, dumps visible form fields at each step,
and tries a dummy reference code to discover the ticket-lookup endpoint.
Never clicks a final "Send inn" button.
"""
import json
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

URL = "https://www.vy.no/kundeservice/skjema/prisavslag-og-erstatning"
OUT = Path(__file__).parent / "out"
OUT.mkdir(exist_ok=True)
DUMMY_CODE = sys.argv[1] if len(sys.argv) > 1 else "ABC-DEF-GHJ"

api_log = []


def on_response(resp):
    req = resp.request
    if req.resource_type not in ("xhr", "fetch"):
        return
    entry = {"method": req.method, "url": req.url, "status": resp.status, "post": req.post_data}
    try:
        body = resp.text()
        entry["body"] = body[:3000]
    except Exception as e:  # noqa: BLE001
        entry["body"] = f"<unreadable: {e}>"
    api_log.append(entry)


FIELDS_JS = """
() => [...document.querySelectorAll('main input, main select, main textarea, main button, main [role=radio], main [role=combobox]')]
  .filter(e => e.offsetParent !== null || e.type === 'radio' || e.type === 'checkbox')
  .map(e => {
    const id = e.id; const lab = id ? document.querySelector(`label[for="${CSS.escape(id)}"]`) : null;
    return {tag: e.tagName.toLowerCase(), type: e.type || e.getAttribute('role'), name: e.name, id,
            label: (lab?.innerText || e.getAttribute('aria-label') || e.innerText || e.placeholder || '').trim().slice(0,120),
            required: e.required || e.getAttribute('aria-required') === 'true',
            options: e.tagName === 'SELECT' ? [...e.options].map(o => o.text) : undefined};
  })
"""


def dump(page, step):
    fields = page.evaluate(FIELDS_JS)
    (OUT / f"{step}_fields.json").write_text(json.dumps(fields, ensure_ascii=False, indent=1))
    (OUT / f"{step}_text.txt").write_text(page.inner_text("main"))
    page.screenshot(path=str(OUT / f"{step}.png"), full_page=True)
    print(f"\n=== {step}: {len(fields)} fields ===")
    for f in fields:
        print(" ", {k: v for k, v in f.items() if v not in (None, "", False)})


with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(locale="nb-NO", viewport={"width": 1200, "height": 1000})
    page.on("response", on_response)
    page.goto(URL, wait_until="networkidle")
    for txt in ("Godta alle", "Godta", "Aksepter alle", "OK"):  # cookie banner
        try:
            page.get_by_role("button", name=txt, exact=True).click(timeout=1500)
            break
        except Exception:  # noqa: BLE001
            pass
    dump(page, "1_start")

    page.get_by_text("Jeg har referansekode").first.click()
    page.wait_for_timeout(1500)
    dump(page, "2_refcode")

    # fill the first visible text input with the dummy code and try to advance (lookup only)
    inp = page.locator("main input[type=text], main input:not([type])").first
    inp.fill(DUMMY_CODE)
    for name in ("Hent billett", "Neste", "Gå videre", "Fortsett", "Søk"):
        btn = page.get_by_role("button", name=name)
        if btn.count():
            print(f"\nclicking '{name}'")
            btn.first.click()
            break
    page.wait_for_timeout(3000)
    dump(page, "3_after_lookup")
    browser.close()

(OUT / "api_log.json").write_text(json.dumps(api_log, ensure_ascii=False, indent=1))
print(f"\n=== {len(api_log)} API calls ===")
for e in api_log:
    print(e["status"], e["method"], e["url"][:160], ("POST " + e["post"][:200]) if e["post"] else "")
