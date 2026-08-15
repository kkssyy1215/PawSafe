ROOT_DIR := $(abspath .)
BACKEND_PYTHON := $(ROOT_DIR)/backend/.venv/bin/python
PIPELINE_PYTHON := $(ROOT_DIR)/.venv/bin/python

.PHONY: setup backend web web-mock test build-web update-weather update-weather-watch

setup:
	./scripts/setup.sh

backend:
	cd backend && .venv/bin/python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

web:
	cd pawsafe-mobile && npm run web

web-mock:
	cd pawsafe-mobile && npm run start:test

test:
	./scripts/test-all.sh

build-web:
	cd pawsafe-mobile && npx expo export --platform web

update-weather:
	$(PIPELINE_PYTHON) update_live_heat.py --api-url http://127.0.0.1:8000/v1/weather/current --asos-api-url http://127.0.0.1:8000/v1/weather/asos/reference

update-weather-watch:
	$(PIPELINE_PYTHON) update_live_heat.py --watch --api-url http://127.0.0.1:8000/v1/weather/current --asos-api-url http://127.0.0.1:8000/v1/weather/asos/reference
