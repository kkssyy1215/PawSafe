#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if ! command -v python3.12 >/dev/null 2>&1; then
  echo "Python 3.12 is required. Install it and run make setup again." >&2
  exit 1
fi

if [[ ! -x "$ROOT_DIR/.venv/bin/python" ]]; then
  python3.12 -m venv "$ROOT_DIR/.venv"
fi
if [[ ! -x "$ROOT_DIR/backend/.venv/bin/python" ]]; then
  python3.12 -m venv "$ROOT_DIR/backend/.venv"
fi

"$ROOT_DIR/.venv/bin/python" -m pip install -r "$ROOT_DIR/requirements.txt"
"$ROOT_DIR/backend/.venv/bin/python" -m pip install -e "$ROOT_DIR/backend[dev]"

if [[ ! -d "$ROOT_DIR/pawsafe-mobile/node_modules" ]]; then
  (cd "$ROOT_DIR/pawsafe-mobile" && npm install)
fi

if [[ ! -f "$ROOT_DIR/backend/.env" ]]; then
  cp "$ROOT_DIR/backend/.env.example" "$ROOT_DIR/backend/.env"
fi
if [[ ! -f "$ROOT_DIR/pawsafe-mobile/.env" ]]; then
  cp "$ROOT_DIR/pawsafe-mobile/.env.example" "$ROOT_DIR/pawsafe-mobile/.env"
fi

echo "온:길 setup complete. The final route model needs no API key. Run:"
echo "  make backend"
echo "  make web"
