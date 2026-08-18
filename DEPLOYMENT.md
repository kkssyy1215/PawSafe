# PawSafe deployment

## Backend (Render)

Create a Blueprint from the repository root `render.yaml`. Set the secret values
requested by Render and set `ALLOWED_ORIGINS` to the final web URL.

The Docker image includes the versioned 12-day model, 3,797-edge graph, ASOS
baseline, and precomputed shade features. Configure `ASOS_SERVICE_KEY` and
`KAKAO_REST_API_KEY` as Render secrets. Both walk modes use the internal model
graph: fast returns the distance shortest route, while cool compares it with
the Heat Cost route. In normal mode, a request retrieves the latest complete
12-hour KMA ASOS station-108 window available through D-1 and runs model inference in the web process.
Set `PAWSAFE_ASOS_INFERENCE_MODE=latest`; use `fixed` only for the reproducible
2026-08-15 16:00 demonstration.

## Web app (Vercel)

Import the repository with `pawsafe-mobile` as the Root Directory. Configure:

```text
EXPO_PUBLIC_ANALYSIS_MODE=api
EXPO_PUBLIC_PLACE_SEARCH_MODE=api
EXPO_PUBLIC_MAP_MODE=native
EXPO_PUBLIC_API_BASE_URL=https://<backend-host>
EXPO_PUBLIC_SHOW_DEMO_CONTROLS=false
```

After the first frontend deployment, update backend `ALLOWED_ORIGINS` with the
exact Vercel production URL and redeploy the backend.
