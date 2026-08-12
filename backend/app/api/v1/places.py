from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Query

from app.api.dependencies import get_place_service
from app.schemas.error import STANDARD_ERROR_RESPONSES
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
) -> PlaceSearchResponse:
    return PlaceSearchResponse(items=await service.search(q.strip()))


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
