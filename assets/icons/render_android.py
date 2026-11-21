"""Render the Android app icons and launch screens from the ghost-train SVGs (Playwright/Chromium).
Run from the repo root after changing the icon:  .venv/bin/python assets/icons/render_android.py

- adaptive icon foreground (108dp canvas; launchers cut out ~66-72dp): artwork at 0.56 so the train stays
  clear of circle masks; full green background so any mask shape looks right
- legacy square + round icons for old launchers
- launch screens (splash.png, portrait/landscape, all densities): dark green with the icon in the middle
"""
from pathlib import Path

from playwright.sync_api import sync_playwright

HERE = Path(__file__).parent
RES = HERE.parents[1] / "app" / "android" / "app" / "src" / "main" / "res"
GREEN = "#0e3a30"
DENS = {"mdpi": 1, "hdpi": 1.5, "xhdpi": 2, "xxhdpi": 3, "xxxhdpi": 4}


def fullbleed(scale: float) -> str:
    src = (HERE / "icon-ghost.svg").read_text()
    tile = '<rect width="512" height="512" rx="112" fill="url(#bg)"/>'
    assert tile in src, "main icon's tile rect changed - update render_android.py"
    out = src.replace(tile, '<rect width="512" height="512" fill="url(#bg)"/>\n'
                            f'  <g transform="translate(256 256) scale({scale}) translate(-256 -256)">', 1)
    return out.replace("</svg>", "  </g>\n</svg>")


def page_html(inner: str, w: int, h: int, bg: str = "transparent") -> str:
    return (f"<html><body style='margin:0;width:{w}px;height:{h}px;background:{bg};display:flex;"
            f"align-items:center;justify-content:center;overflow:hidden'>{inner}</body></html>")


def svg_box(svg: str, size: int, radius: str = "0") -> str:
    svg = svg.replace("<svg ", f"<svg width='{size}' height='{size}' ", 1)
    return f"<div style='width:{size}px;height:{size}px;border-radius:{radius};overflow:hidden'>{svg}</div>"


def main() -> None:
    adaptive, legacy_round = fullbleed(0.56), fullbleed(0.72)
    tile = (HERE / "icon-ghost.svg").read_text()
    jobs = []  # (path, w, h, html)
    for dens, f in DENS.items():
        d = RES / f"mipmap-{dens}"
        s108, s48 = round(108 * f), round(48 * f)
        jobs += [(d / "ic_launcher_foreground.png", s108, s108, page_html(svg_box(adaptive, s108), s108, s108)),
                 (d / "ic_launcher.png", s48, s48, page_html(svg_box(tile, s48), s48, s48)),
                 (d / "ic_launcher_round.png", s48, s48, page_html(svg_box(legacy_round, s48, "50%"), s48, s48))]
    for p in sorted(RES.glob("drawable*/splash.png")):
        from struct import unpack
        w, h = unpack(">II", p.read_bytes()[16:24])           # keep each density's existing size
        icon = round(min(w, h) * 0.28)
        jobs.append((p, w, h, page_html(svg_box(tile, icon), w, h, GREEN)))
    with sync_playwright() as pw:
        b = pw.chromium.launch()
        for path, w, h, html in jobs:
            pg = b.new_page(viewport={"width": w, "height": h})
            pg.set_content(html)
            pg.screenshot(path=str(path), omit_background=True)
            pg.close()
        b.close()
    (RES / "values" / "ic_launcher_background.xml").write_text(
        '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n'
        f'    <color name="ic_launcher_background">{GREEN.upper()}</color>\n</resources>\n')
    print(f"{len(jobs)} images -> {RES}")


if __name__ == "__main__":
    main()
