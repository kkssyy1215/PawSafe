# PawSafe

PawSafe is a hackathon MVP that compares a normal walking route with a route that minimizes **relative heat exposure**. The repository is split into two independently runnable projects:

- `pawsafe-mobile/`: React Native, TypeScript, Expo, and Expo Router app
- `backend/`: FastAPI application backend, Kakao shortest-walk routing, and deterministic Heat Cost demo provider
- `src/pawsafe/`: Python data-analysis pipeline for private edge, weather, shade, and pavement inputs

The demo does not contain a trained heat model, verified surface-temperature data, or an absolute safety classification. All bundled results are clearly identified as deterministic MVP example data until the data-analysis team supplies versioned edge-by-time Heat Cost exports.

An IoT observation workbook was received for the Jamsil area. The original workbook is intentionally kept outside this public repository, and no sample, cleaned, summarized, or derived dataset is created from it. For the MVP handoff, no repeated field measurement is required; production use still requires internal mapping and validation.

See each project README for setup, physical-device networking, testing, and the production-data handoff.

## Data-analysis pipeline handoff

The model implementation is included as source code only. It covers coordinate
normalization, pavement matching, building/tree shade estimation, relative Heat
Cost features, clustering, and Fast/Cool graph routing. Private source files are
not included. Put approved local inputs under `data/raw/` (which is ignored by
Git), then follow the scripts in `scripts/` and the notes in
[`docs/DATA_PIPELINE_HANDOFF.md`](docs/DATA_PIPELINE_HANDOFF.md).

Generated files under `data/processed/` and `outputs/`, model weights, GeoPackages,
Parquet files, and workbook files are intentionally ignored and must not be
committed. The optional IoT workbook validation is kept outside this public
repository; no sample, cleaned, summarized, or derived workbook data is stored
here.

로컬 파일 기반 전체 테스트는 [TESTING.md](TESTING.md)의 `./scripts/test-all.sh`로 실행할 수 있습니다.

## Quick start

```bash
cd pawsafe-mobile
npm install
cp .env.example .env
npm start
```

```bash
cd backend
cp .env.example .env
# Set KAKAO_REST_API_KEY in backend/.env; keep it out of the mobile app.
docker compose up --build
```

The mobile `.env.example` uses fixed coordinate places/current-location
fixtures and the FastAPI API only for route analysis. The backend `.env.example`
uses `ANALYSIS_PROVIDER=kakao_walk`; the Kakao REST key is server-side only.

When using a physical phone with the API provider, set `EXPO_PUBLIC_API_BASE_URL` to an HTTPS development URL or to the development computer's LAN address. `localhost` on the phone points to the phone itself.
