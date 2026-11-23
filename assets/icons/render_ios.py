"""iPhone app icon (1024x1024, full square, no transparency: iOS rounds the corners itself) and the splash screen
(2732x2732, the ghost train in the middle of the app's dark green), from the same SVG as the other icons.
    .venv/bin/python assets/icons/render_ios.py"""
import subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
ICON = ROOT / "app/ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png"
SPLASH = ROOT / "app/ios/App/App/Assets.xcassets/Splash.imageset"
src = (ROOT / "assets/icons/icon-ghost.svg").read_text()
tile = '<rect width="512" height="512" rx="112" fill="url(#bg)"/>'
fullbleed = src.replace(tile, '<rect width="512" height="512" fill="url(#bg)"/>\n'
                        '  <g transform="translate(256 256) scale(0.86) translate(-256 -256)">', 1).replace("</svg>", "</g></svg>")


def shoot(html: str, size: int, out: Path) -> None:
    """Screenshots as JPEG first, then converts to PNG with macOS's sips: the result has no alpha channel."""
    tmp = out.with_suffix(".jpg")
    with sync_playwright() as p:
        b = p.chromium.launch()
        pg = b.new_page(viewport={"width": size, "height": size})
        pg.set_content(f"<body style='margin:0;background:#0e3a30'>{html}</body>")
        pg.screenshot(path=str(tmp), type="jpeg", quality=95)
        b.close()
    subprocess.run(["sips", "-s", "format", "png", str(tmp), "--out", str(out)], check=True, capture_output=True)
    tmp.unlink()


shoot(fullbleed.replace("<svg ", "<svg width=1024 height=1024 ", 1), 1024, ICON)
logo = src.replace("<svg ", "<svg width=640 height=640 ", 1)
for name in ["splash-2732x2732.png", "splash-2732x2732-1.png", "splash-2732x2732-2.png"]:
    shoot(f"<div style='width:2732px;height:2732px;display:flex;align-items:center;justify-content:center'>{logo}</div>", 2732, SPLASH / name)
print("iOS icon and splash written")
