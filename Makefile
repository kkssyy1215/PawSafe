ROOT_DIR := $(abspath .)
BACKEND_PYTHON := $(ROOT_DIR)/backend/.venv/bin/python
.PHONY: setup backend web test build-web

setup:
	./scripts/setup.sh

backend:
	cd backend && .venv/bin/python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

web:
	cd pawsafe-mobile && npm run web

test:
	./scripts/test-all.sh

build-web:
	cd pawsafe-mobile && npx expo export --platform web
