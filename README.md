# PawSafe

PawSafe is a hackathon MVP that compares a normal walking route with a route that minimizes **relative heat exposure**. The repository is split into two independently runnable projects:

- `pawsafe-mobile/`: React Native, TypeScript, Expo, and Expo Router app
- `backend/`: FastAPI application backend and deterministic demo providers

The demo does not contain a trained heat model, verified surface-temperature data, or an absolute safety classification. All bundled results are clearly identified as deterministic MVP example data until the data-analysis team supplies versioned edge-by-time Heat Cost exports.

An IoT observation workbook was received for the Jamsil area (eight environmental settings, depth observations, and dated time windows). The original workbook is intentionally kept outside this public repository because it contains source metadata identifying its creator and its redistribution terms are not established. The project records the schema and handoff requirements in `backend/docs/DATA_TEAM_HANDOFF.md`; no new field measurement is required for the MVP data handoff, but edge/time mapping and validation are still required before production claims.

See each project README for setup, physical-device networking, testing, and the production-data handoff.

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
docker compose up --build
```

When using a physical phone with the API provider, set `EXPO_PUBLIC_API_BASE_URL` to an HTTPS development URL or to the development computer's LAN address. `localhost` on the phone points to the phone itself.
