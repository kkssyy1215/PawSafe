#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "== 온:길 mobile tests =="
(
  cd "$ROOT_DIR/pawsafe-mobile"
  npm test
  npm run typecheck
  npm run lint
)

echo "== 온:길 backend tests =="
(
  cd "$ROOT_DIR/backend"
  if [[ ! -x .venv/bin/python ]]; then
    echo "backend/.venv is missing. Run: python3.12 -m venv .venv && .venv/bin/python -m pip install -e '.[dev]'" >&2
    exit 1
  fi
  .venv/bin/python -m pytest -q
  .venv/bin/ruff check app tests
  .venv/bin/ruff format --check app tests
  .venv/bin/mypy app
)

echo "All 온:길 application tests passed."

echo "== 온:길 research pipeline tests =="
(
  cd "$ROOT_DIR"
  if [[ ! -x .venv/bin/python ]]; then
    echo ".venv is missing. Run: python3.12 -m venv .venv && .venv/bin/python -m pip install -r requirements.txt" >&2
    exit 1
  fi
  .venv/bin/python -m pytest -q tests
)

echo "All 온:길 tests passed."
