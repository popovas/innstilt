# Icons

The ghost train: an "Innstilt" (cancelled) train that is half-asleep. Its palette (indigo, lavender,
magenta) is deliberately unlike Vy's greens, so the tool never looks like an official Vy app.

| File | Use |
|---|---|
| `icon-ghost.svg` | **Source.** Full detail, rounded tile |
| `icon-ghost-small.svg` | Source for 32/64 px: no text, chunky shapes, "!" badge |
| `icon-ghost-maskable.svg`, `icon-ghost-apple.svg` | Generated from `icon-ghost.svg` by `render.py`. Do not edit |
| `ghost-32.png`, `ghost-64.png` | favicon |
| `ghost-180.png` | `apple-touch-icon` |
| `ghost-192.png`, `ghost-512.png` | web manifest, `"purpose": "any"` |
| `ghost-maskable-192.png`, `ghost-maskable-512.png` | web manifest, `"purpose": "maskable"` |

Regenerate the PNGs after editing an SVG: `.venv/bin/python assets/icons/render.py`. `original/` holds the first version.
