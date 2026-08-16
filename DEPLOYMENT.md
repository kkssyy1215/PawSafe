# PawSafe deployment

## Backend (Render)

Create a Blueprint from the repository root `render.yaml`. Set the secret values
requested by Render and set `ALLOWED_ORIGINS` to the final web URL.

The Docker image includes the versioned 12-day model, 3,797-edge graph, ASOS
baseline, and precomputed shade features. Configure `KMA_AWS_AUTH_KEY` and
`KAKAO_REST_API_KEY` as Render secrets. A cool request retrieves the latest KMA
AWS station-108 observation and runs model inference in the web process; a fast
request uses Kakao only. `KMA_SERVICE_KEY` and `ASOS_SERVICE_KEY` are optional
unless the separate weather inspection endpoints are required.

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
