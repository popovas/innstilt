"""Google Play graphics from the ghost-train icon: the 512x512 store icon (full square; Play rounds the corners)
and the 1024x500 feature graphic, Norwegian and English.  .venv/bin/python assets/icons/render_play.py"""
from pathlib import Path

from playwright.sync_api import sync_playwright

HERE = Path(__file__).parent
OUT = HERE.parents[1] / "docs" / "play"
TAG = {"no": ("Innstilt", "Erstatning når toget er innstilt", "eller over 30 min forsinket – uten bryet med skjemaet."),
       "en": ("Innstilt", "Compensation when your train is cancelled", "or over 30 min late – without the hassle of the form.")}


def fullbleed(scale: float) -> str:
    src = (HERE / "icon-ghost.svg").read_text()
    tile = '<rect width="512" height="512" rx="112" fill="url(#bg)"/>'
    out = src.replace(tile, '<rect width="512" height="512" fill="url(#bg)"/>\n'
                            f'  <g transform="translate(256 256) scale({scale}) translate(-256 -256)">', 1)
    return out.replace("</svg>", "  </g>\n</svg>")


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    icon = fullbleed(0.86)
    tile = (HERE / "icon-ghost.svg").read_text().replace("<svg ", "<svg width='360' height='360' ", 1)
    with sync_playwright() as p:
        b = p.chromium.launch()
        pg = b.new_page(viewport={"width": 512, "height": 512})
        pg.set_content(f"<body style='margin:0'>{icon.replace('<svg ', '<svg width=512 height=512 ', 1)}</body>")
        pg.screenshot(path=str(OUT / "icon-512.png"))
        for lang, (name, line1, line2) in TAG.items():
            pg = b.new_page(viewport={"width": 1024, "height": 500})
            pg.set_content(f"""<body style="margin:0;width:1024px;height:500px;display:flex;align-items:center;gap:48px;padding:0 70px;box-sizing:border-box;
                background:linear-gradient(135deg,#1c5a4a,#0e3a30);font-family:system-ui,-apple-system,sans-serif;color:#fff">
              <div style="flex:none;filter:drop-shadow(0 18px 30px rgba(0,0,0,.35))">{tile}</div>
              <div><div style="font-size:84px;font-weight:800;letter-spacing:-1px">{name}</div>
                <div style="font-size:38px;font-weight:800;color:#f5c400;margin-top:10px;line-height:1.15">{line1}</div>
                <div style="font-size:26px;color:#cfeadb;margin-top:12px;line-height:1.3">{line2}</div></div></body>""")
            pg.screenshot(path=str(OUT / f"feature-graphic-{lang}.png"))
        b.close()
    print("Play graphics ->", OUT)


if __name__ == "__main__":
    main()
