from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Query

from app.api.dependencies import get_place_service
from app.core.errors import AppError
from app.schemas.error import STANDARD_ERROR_RESPONSES
from app.schemas.location import CoordinateInput
from app.schemas.place import Place, PlaceSearchResponse, ReverseGeocodeRequest
from app.services.place_service import PlaceService

router = APIRouter(prefix="/places", tags=["places"])


@router.get(
    "/search",
    response_model=PlaceSearchResponse,
    responses=STANDARD_ERROR_RESPONSES,
)
async def search_places(
    q: Annotated[str, Query(min_length=1, max_length=100)],
    service: Annotated[PlaceService, Depends(get_place_service)],
    lat: Annotated[float | None, Query(ge=-90, le=90)] = None,
    lng: Annotated[float | None, Query(ge=-180, le=180)] = None,
) -> PlaceSearchResponse:
    if (lat is None) != (lng is None):
        missing_field = "lng" if lng is None else "lat"
        raise AppError(
            "VALIDATION_ERROR",
            "검색 위치의 위도와 경도를 함께 입력해 주세요.",
            status_code=422,
            details={"fields": [{"field": missing_field, "type": "missing"}]},
        )
    origin = CoordinateInput(lat=lat, lng=lng) if lat is not None and lng is not None else None
    return PlaceSearchResponse(items=await service.search(q.strip(), origin=origin))


@router.post(
    "/reverse-geocode",
    response_model=Place,
    responses=STANDARD_ERROR_RESPONSES,
)
async def reverse_geocode(
    payload: ReverseGeocodeRequest,
    service: Annotated[PlaceService, Depends(get_place_service)],
) -> Place:
    return await service.reverse_geocode(payload.lat, payload.lng)
