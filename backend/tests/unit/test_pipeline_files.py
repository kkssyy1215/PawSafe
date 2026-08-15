from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

import geopandas as gpd
from shapely.geometry import LineString

from app.providers.heat_cost.file_heat_cost import FileHeatCostProvider
from app.repositories.graph_repository import GraphRepository


def test_pipeline_heat_rows_are_normalized_to_contract(tmp_path: Path) -> None:
    path = tmp_path / "edge_time_features.json"
    path.write_text(
        json.dumps(
            [
                {
                    "edge_id": "E1",
                    "timestamp": "2026-08-08T15:00:00",
                    "heat_cost": 73.5,
                    "shade_ratio": 0.25,
                    "recent_direct_sun_minutes": 45,
                    "surface_code": "SWB005",
                }
            ]
        ),
        encoding="utf-8",
    )

    provider = FileHeatCostProvider(
        path,
        max_age_minutes=120,
        timezone_name="Asia/Seoul",
        data_version_override="pipeline-test",
    )
    snapshot = provider.get_snapshot(datetime(2026, 8, 8, 15, tzinfo=ZoneInfo("Asia/Seoul")))

    record = snapshot.records["E1"]
    assert snapshot.source == "pipeline_file"
    assert snapshot.data_version == "pipeline-test"
    assert record.valid_at == datetime(2026, 8, 8, 15, tzinfo=ZoneInfo("Asia/Seoul"))
    assert record.direct_sun_minutes == 45
    assert record.validation_status == "not_validated"


def test_edge_only_pipeline_geopackage_is_split_into_heat_addressable_segments(
    tmp_path: Path,
) -> None:
    path = tmp_path / "edges_static.gpkg"
    frame = gpd.GeoDataFrame(
        {
            "edge_id": ["E1"],
            "length_m": [20.0],
            "oneway": ["B"],
            "name": ["테스트 산책로"],
        },
        geometry=[LineString([(1000, 1000), (1010, 1000), (1020, 1000)])],
        crs="EPSG:5186",
    )
    frame.to_file(path, layer="edges", driver="GPKG")

    graph = GraphRepository().load(path)

    forward = [edge for edge in graph.edges.values() if not edge.is_reverse]
    assert len(graph.nodes) == 3
    assert len(forward) == 2
    assert {edge.heat_edge_id for edge in forward} == {"E1"}
    assert all(edge.distance_m == 10 for edge in forward)
