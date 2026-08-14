from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field, field_validator


class CoordinateInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    lat: float = Field(ge=-90, le=90)
    lng: float = Field(ge=-180, le=180)


class LocationInput(CoordinateInput):
    id: str = Field(min_length=1, max_length=100)
    name: str = Field(min_length=1, max_length=100)
    address: str = Field(min_length=1, max_length=300)

    @field_validator("id", "name", "address")
    @classmethod
    def reject_blank_strings(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("must not be blank")
        return stripped
