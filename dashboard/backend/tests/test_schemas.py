
from datetime import datetime, timezone

import pytest
from pydantic import ValidationError

from app.schemas import (
    MeasurementCreate,
    DeviceSettingsUpdate,
    DeviceCommandCreate,
)


# -----------------------------------------
# MEASUREMENTS
# -----------------------------------------

def test_valid_measurement():
    measurement = MeasurementCreate(
        device_id="plantpulse_001",
        measured_at=datetime.now(timezone.utc),
        soil_moisture=45,
        light=600,
        air_temperature=22,
        air_humidity=55,
    )

    assert measurement.soil_moisture == 45
    assert measurement.device_id == "plantpulse_001"


@pytest.mark.parametrize("value", [-1, 101])
def test_invalid_soil_moisture(value):
    with pytest.raises(ValidationError):
        MeasurementCreate(
            device_id="plantpulse_001",
            measured_at=datetime.now(timezone.utc),
            soil_moisture=value,
            light=600,
            air_temperature=22,
            air_humidity=55,
        )


# -----------------------------------------
# DEVICE SETTINGS
# -----------------------------------------

def valid_settings():
    return {
        "measurement_interval_seconds": 5,
        "soil_moisture_min": 20,
        "soil_moisture_max": 80,
        "light_min": 100,
        "light_max": 1000,
        "air_temperature_min": 10,
        "air_temperature_max": 35,
        "air_humidity_min": 30,
        "air_humidity_max": 80,
    }


def test_valid_device_settings():
    settings = DeviceSettingsUpdate(**valid_settings())

    assert settings.measurement_interval_seconds == 5


def test_invalid_device_settings():
    settings = valid_settings()

    settings["soil_moisture_min"] = 90
    settings["soil_moisture_max"] = 80

    with pytest.raises(ValidationError):
        DeviceSettingsUpdate(**settings)


# -----------------------------------------
# DEVICE COMMANDS
# -----------------------------------------

def test_valid_command():
    command = DeviceCommandCreate(
        command_type="set_measurement_interval",
        payload={"seconds": 10},
    )

    assert command.payload["seconds"] == 10


def test_invalid_command_interval():
    with pytest.raises(ValidationError):
        DeviceCommandCreate(
            command_type="set_measurement_interval",
            payload={"seconds": 5000},
        )


def test_invalid_command_payload():
    with pytest.raises(ValidationError):
        DeviceCommandCreate(
            command_type="set_light",
            payload={"wrong_key": 500},
        )
