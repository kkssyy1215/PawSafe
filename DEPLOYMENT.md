# PawSafe deployment

## Backend (Render)

Create a Blueprint from the repository root `render.yaml`. Set the secret values
requested by Render and set `ALLOWED_ORIGINS` to the final web URL.

The Docker image includes the current graph and heat-cost snapshot. The weather
endpoints query KMA/ASOS on request. Rebuilding the live heat snapshot remains a
separate scheduled pipeline job and should not run inside the web process.

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
