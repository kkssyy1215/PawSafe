from pathlib import Path

import geopandas as gpd
import pandas as pd
from shapely.geometry import Point

from src.pawsafe.routing import route_all_modes
from src.pawsafe.utils import load_config


cfg = load_config("config.json")

# 가장 큰 연결망 안에서 fast/cool이 충분히 다른 길을 택하는 약 1km 테스트 지점.
# QGIS 표시 순서와 반대로: 경도, 위도
start = (127.1405973, 37.4811743)
end = (127.1410705, 37.4772949)

target_time = pd.Timestamp("2026-08-08 15:00:00")

edges = gpd.read_file(
    "data/processed/edges_static.gpkg",
    layer="edges",
)

heat = gpd.read_file(
    "outputs/edge_heat_continuous_20260808_1500.geojson"
)

# 경로 함수가 사용하는 컬럼명으로 변경
edge_time = heat[
    [
        "edge_id",
        "timestamp",
        "heat_cost_continuous",
    ]
].copy()

edge_time["timestamp"] = pd.to_datetime(
    edge_time["timestamp"]
)

edge_time = edge_time.rename(
    columns={
        "heat_cost_continuous": "heat_cost"
    }
)

result = route_all_modes(
    edges=edges,
    edge_time=edge_time,
    start_lonlat=start,
    end_lonlat=end,
    timestamp=target_time,
    cfg=cfg,
    output_dir=Path("outputs"),
)

test_points = gpd.GeoDataFrame(
    [
        {"role": "start", "label": "테스트 출발점", "geometry": Point(start)},
        {"role": "end", "label": "테스트 도착점", "geometry": Point(end)},
    ],
    crs="EPSG:4326",
)
test_points.to_file(
    "outputs/test_route_points.geojson",
    driver="GeoJSON",
)

print("경로 생성 완료")

for mode, values in result["routes"].items():
    print()
    print("모드:", mode)
    print(
        "거리:",
        round(values["distance_m"], 1),
        "m",
    )
    print(
        "평균 Heat Cost:",
        f'{values["mean_heat_cost"] * 100:.1f}/100',
    )
    print(
        "통과 Edge 수:",
        len(values["edge_ids"]),
    )

print("테스트 지점: outputs/test_route_points.geojson")
