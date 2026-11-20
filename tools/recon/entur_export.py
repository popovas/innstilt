"""(Superseded by archive_rows() in cli/innstilt.py.) Generate a day's SIRI-ET 'last recorded' export via Entur's public exporter and return the CSV URL.
Usage: entur_export.py YYYY-MM-DD [source-label]"""
import sys
from playwright.sync_api import sync_playwright

def export_url(day: str, source: str = "Bane NOR") -> str:
    with sync_playwright() as p:
        b = p.chromium.launch(); pg = b.new_page(viewport={"width": 1300, "height": 1800})
        pg.goto("https://siri-data-exporter.entur.no/", wait_until="networkidle"); pg.wait_for_timeout(4000)
        pg.locator("[data-baseweb=select]").first.click(); pg.keyboard.type(source, delay=30); pg.wait_for_timeout(500)
        print("options:", pg.locator("li[role=option]").all_inner_texts(), file=sys.stderr)
        pg.get_by_role("option", name=source, exact=True).click()
        import datetime as dt
        target = dt.date.fromisoformat(day)
        pg.locator("[data-testid=stDateInput] input").first.click(); pg.wait_for_timeout(500)
        cal = pg.locator("[data-baseweb=calendar]").first
        for _ in range(36):  # step back month by month until the target month shows
            cell = cal.locator(f'[aria-label*="{target:%B} {target.day}"][aria-label*="{target.year}"]')
            if cell.count():
                break
            cal.locator('[aria-label="Previous month."], button[aria-label*="Previous"]').first.click(); pg.wait_for_timeout(300)
        cell.first.click(); pg.wait_for_timeout(300); cell.first.click(); pg.keyboard.press("Escape")
        pg.wait_for_timeout(1500)
        print(pg.get_by_text("Selected date range").inner_text(), file=sys.stderr)
        pg.get_by_role("button", name="Submit").click()
        pg.get_by_text("File successfully created").wait_for(timeout=600000)
        href = pg.locator("a[data-testid^=stBaseLinkButton]").last.get_attribute("href")
        b.close(); return href

if __name__ == "__main__":
    print(export_url(sys.argv[1], *(sys.argv[2:3] or [])))
