
from datetime import datetime, timezone


def test_home(client):
    response = client.get("/")

    assert response.status_code == 200
    assert response.json()["project"] == "PlantPulse"


def test_create_and_get_latest_measurement(client):
    measurement = {
        "device_id": "plantpulse_test_001",
        "measured_at": datetime.now(timezone.utc).isoformat(),
        "soil_moisture": 45.5,
        "light": 700.0,
        "air_temperature": 23.5,
        "air_humidity": 60.0
    }

    # Inseriamo una misurazione tramite API
    response = client.post("/measurements", json=measurement)

    assert response.status_code == 201

    created_measurement = response.json()

    assert created_measurement["device_id"] == "plantpulse_test_001"
    assert created_measurement["soil_moisture"] == 45.5

    # Recuperiamo l'ultima misurazione tramite API
    response = client.get("/measurements/latest")

    assert response.status_code == 200

    latest_measurement = response.json()

    assert latest_measurement["device_id"] == "plantpulse_test_001"
    assert latest_measurement["light"] == 700.0
