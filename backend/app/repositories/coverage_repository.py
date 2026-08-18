from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path

from shapely.geometry import MultiPolygon, Point, Polygon, mapping, shape

from app.core.errors import InvalidDataFileError
from app.schemas.capability import CoverageResponse
from app.schemas.geojson import PolygonGeometry


@dataclass(frozen=True)
class CoverageData:
    response: CoverageResponse
    polygon: Polygon


class CoverageRepository:
    def load(self, path: Path) -> CoverageData:
        if not path.is_file():
            raise InvalidDataFileError("coverage")
        try:
            if path.suffix.lower() == ".gpkg":
                return self._load_geopackage(path)
            payload = json.loads(path.read_text(encoding="utf-8"))
            if payload.get("type") == "Feature":
                properties = payload.get("properties", {})
                geometry_payload = payload["geometry"]
            else:
                properties = payload
                geometry_payload = payload["geometry"]
            geometry = PolygonGeometry.model_validate(geometry_payload)
            polygon = shape(geometry.model_dump())
            if not isinstance(polygon, Polygon) or polygon.is_empty or not polygon.is_valid:
                raise ValueError("invalid coverage polygon")
            response = CoverageResponse(
                coverage_id=str(properties["coverage_id"]),
                name=str(properties["name"]),
                geometry=geometry,
            )
            return CoverageData(response=response, polygon=polygon)
        except Exception as exc:
            raise InvalidDataFileError("coverage") from exc

    @staticmethod
    def _load_geopackage(path: Path) -> CoverageData:
        """Read a private pipeline boundary without copying it into the app."""
        import geopandas as gpd

        layers = gpd.list_layers(path)
        if layers.empty:
            raise InvalidDataFileError("coverage")
        frame = gpd.read_file(path, layer=str(layers.iloc[0]["name"])).to_crs(epsg=4326)
        geometry = frame.geometry.union_all()
        if isinstance(geometry, MultiPolygon):
            polygons = list(geometry.geoms)
            geometry = max(polygons, key=lambda polygon: polygon.area)
        if not isinstance(geometry, Polygon) or geometry.is_empty or not geometry.is_valid:
            raise InvalidDataFileError("coverage")
        polygon_geometry = PolygonGeometry.model_validate(mapping(geometry))
        return CoverageData(
            response=CoverageResponse(
                coverage_id=f"{path.stem}-private",
                name=f"{path.stem} private coverage",
                geometry=polygon_geometry,
            ),
            polygon=geometry,
        )

    @staticmethod
    def contains(coverage: CoverageData, *, lat: float, lng: float) -> bool:
        point = Point(lng, lat)
        return bool(coverage.polygon.covers(point))
