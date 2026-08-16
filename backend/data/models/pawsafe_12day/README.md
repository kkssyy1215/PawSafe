# PawSafe 12-day model assets

This directory contains the versioned runtime assets supplied by the model team.

- `data/raw/asos_hourly.csv`: 12-day historical ASOS baseline used by the trained model
- `data/processed/edges_static.gpkg`: 3,797 walkable edges and static spatial features
- `data/processed/edge_time_features.parquet`: precomputed hourly shade features
- `outputs/heat_cluster_model.joblib`: trained clustering model bundle
- `config.json`: model feature and routing configuration
- `SHA256SUMS`: integrity hashes for the versioned runtime assets

At request time the backend retrieves current KMA AWS observations for station 108,
rebuilds the time-dependent edge features, scores Heat Cost, and runs only the
`fast` and `cool` route profiles. The result is relative heat exposure, not a
surface-temperature prediction or an absolute safety classification.
