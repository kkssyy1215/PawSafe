from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, field_validator

GeoJsonCoordinate = tuple[float, float]


def _validate_coordinate(coordinate: GeoJsonCoordinate) -> GeoJsonCoordinate:
    lng, lat = coordinate
    if not -180 <= lng <= 180 or not -90 <= lat <= 90:
        raise ValueError("GeoJSON coordinates must use [lng, lat] within WGS84 bounds")
    return coordinate


class LineStringGeometry(BaseModel):
    model_config = ConfigDict(extra="forbid")

    type: Literal["LineString"] = "LineString"
    coordinates: list[GeoJsonCoordinate]

    @field_validator("coordinates")
    @classmethod
    def validate_coordinates(cls, value: list[GeoJsonCoordinate]) -> list[GeoJsonCoordinate]:
        return [_validate_coordinate(coordinate) for coordinate in value]


class PolygonGeometry(BaseModel):
    model_config = ConfigDict(extra="forbid")

    type: Literal["Polygon"] = "Polygon"
    coordinates: list[list[GeoJsonCoordinate]]

    @field_validator("coordinates")
    @classmethod
    def validate_coordinates(
        cls, value: list[list[GeoJsonCoordinate]]
    ) -> list[list[GeoJsonCoordinate]]:
        return [[_validate_coordinate(coordinate) for coordinate in ring] for ring in value]
