
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, model_validator

from typing import Any, Literal

class MeasurementCreate(BaseModel):
    device_id: str = Field(min_length=1, max_length=64)
    measured_at: datetime

    soil_moisture: float = Field(ge=0, le=100)
    light: float = Field(ge=0)
    air_temperature: float
    air_humidity: float = Field(ge=0, le=100)


class MeasurementResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    device_id: str
    measured_at: datetime

    soil_moisture: float
    light: float
    air_temperature: float
    air_humidity: float


class DeviceSettingsUpdate(BaseModel):
    measurement_interval_seconds: int = Field(ge=1, le=3600)

    soil_moisture_min: float = Field(ge=0, le=100)
    soil_moisture_max: float = Field(ge=0, le=100)

    light_min: float = Field(ge=0)
    light_max: float = Field(ge=0)

    air_temperature_min: float
    air_temperature_max: float

    air_humidity_min: float = Field(ge=0, le=100)
    air_humidity_max: float = Field(ge=0, le=100)

    @model_validator(mode="after")
    def validate_thresholds(self):
        if self.soil_moisture_min >= self.soil_moisture_max:
            raise ValueError("La soglia minima del terreno deve essere inferiore alla massima")

        if self.light_min >= self.light_max:
            raise ValueError("La soglia minima della luce deve essere inferiore alla massima")

        if self.air_temperature_min >= self.air_temperature_max:
            raise ValueError("La temperatura minima deve essere inferiore alla massima")

        if self.air_humidity_min >= self.air_humidity_max:
            raise ValueError("L'umidità minima deve essere inferiore alla massima")

        return self


class DeviceSettingsResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    device_id: str
    measurement_interval_seconds: int

    soil_moisture_min: float
    soil_moisture_max: float

    light_min: float
    light_max: float

    air_temperature_min: float
    air_temperature_max: float

    air_humidity_min: float
    air_humidity_max: float

    updated_at: datetime



class DeviceStatusResponse(BaseModel):
    device_id: str
    is_online: bool
    last_seen: datetime | None
    seconds_since_last_measurement: float | None
    measurement_interval_seconds: int
    total_measurements: int


class DeviceCommandCreate(BaseModel):
    command_type: Literal[
        "set_measurement_interval",
        "set_soil_moisture",
        "set_light",
        "set_air_temperature",
        "set_air_humidity"
    ]

    payload: dict[str, Any]

    @model_validator(mode="after")
    def validate_payload(self):

        expected_keys = {
            "set_measurement_interval": "seconds",
            "set_soil_moisture": "value",
            "set_light": "value",
            "set_air_temperature": "value",
            "set_air_humidity": "value"
        }

        expected_key = expected_keys[self.command_type]

        if set(self.payload.keys()) != {expected_key}:
            raise ValueError(
                f"Il payload deve contenere solamente '{expected_key}'"
            )

        value = self.payload[expected_key]

        if isinstance(value, bool) or not isinstance(value, (int, float)):
            raise ValueError("Il valore deve essere numerico")

        if self.command_type == "set_measurement_interval":
            if not isinstance(value, int) or not 1 <= value <= 3600:
                raise ValueError("L'intervallo deve essere un intero tra 1 e 3600 secondi")

        elif self.command_type in ("set_soil_moisture", "set_air_humidity"):
            if not 0 <= value <= 100:
                raise ValueError("Il valore deve essere compreso tra 0 e 100")

        elif self.command_type == "set_light":
            if value < 0:
                raise ValueError("La luminosità non può essere negativa")

        return self


class DeviceCommandResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    device_id: str
    command_type: str
    payload: dict[str, Any]
    status: str
    created_at: datetime
    executed_at: datetime | None
    error_message: str | None


class DeviceCommandAcknowledge(BaseModel):
    status: Literal["executed", "failed"]
    error_message: str | None = None
