# PawSafe summer 09:00-21:00 12-day model assets (schema v5)

This directory contains the versioned runtime assets supplied by the model team.

- `data/raw/asos_hourly.csv`: 12-day historical ASOS baseline used by the trained model
- `data/processed/edges_static.gpkg`: the exact 3,797 walkable edges used to train the model
- `data/processed/shadow_cache_songpa_full_network_v3.parquet`: hourly shade cache for the full Songpa network
- `outputs/heat_cluster_model.joblib`: schema-v5 model with a fixed training scaler, PCA heat axis, and two clusters
- `config.json`: model feature and routing configuration
- `SHA256SUMS`: integrity hashes for the versioned runtime assets

At request time the backend retrieves the latest complete 12-hour KMA ASOS
observation window available through D-1 for station 108, including observed solar radiation,
rebuilds the time-dependent edge features, applies the
saved 09:00-21:00 training scale, and runs only the app's `fast` and `cool`
route profiles. The model source also defines `balanced`, but the app excludes
it by product decision. Heat Cost is relative heat exposure, not a surface-
temperature prediction or an absolute safety classification.

Set `PAWSAFE_ASOS_INFERENCE_MODE=fixed` to reproduce the model team's
2026-08-15 16:00 demonstration instead of using the latest ASOS window.
