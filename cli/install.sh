#!/bin/sh
# Innstilt installer for macOS / Linux. Run from the project folder:  sh cli/install.sh
set -e
cd "$(dirname "$0")/.."
command -v python3 >/dev/null || { echo "Python 3 is needed: https://www.python.org/downloads/"; exit 1; }
echo "==> Creating .venv and installing Innstilt"
python3 -m venv .venv
.venv/bin/pip install -q --upgrade pip
.venv/bin/pip install -q -e cli
echo "==> Installing the browser Innstilt uses to fetch Entur's archive (~100 MB, once)"
.venv/bin/playwright install chromium >/dev/null
[ -f bookmarklet/install.html ] || .venv/bin/python bookmarklet/build.py
BIN="$HOME/.local/bin"
mkdir -p "$BIN"
ln -sf "$(pwd)/.venv/bin/innstilt" "$BIN/innstilt"
case ":$PATH:" in
  *":$BIN:"*) ;;
  *) echo "export PATH=\"\$HOME/.local/bin:\$PATH\"" >> "$HOME/.zshrc"
     echo "    (added ~/.local/bin to your PATH in ~/.zshrc - open a new terminal window afterwards)" ;;
esac
echo "==> Done. Starting setup:"
.venv/bin/innstilt setup
