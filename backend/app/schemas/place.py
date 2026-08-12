from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.location import CoordinateInput


class Place(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str = Field(min_length=1, max_length=100)
    name: str = Field(min_length=1, max_length=100)
    address: str = Field(min_length=1, max_length=300)
    lat: float = Field(ge=-90, le=90)
    lng: float = Field(ge=-180, le=180)
    is_in_coverage: bool


class PlaceSearchResponse(BaseModel):
    items: list[Place]


class ReverseGeocodeRequest(CoordinateInput):
    pass
