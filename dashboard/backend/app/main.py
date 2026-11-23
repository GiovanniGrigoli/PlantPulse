from datetime import datetime, timezone

from fastapi import FastAPI, Depends, status, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.orm import Session

from .database import get_db

from .models import Measurement, DeviceSettings, DeviceCommand

from .schemas import (
    MeasurementCreate,
    MeasurementResponse,
    DeviceSettingsUpdate,
    DeviceSettingsResponse,
    DeviceStatusResponse,
    DeviceCommandCreate,
    DeviceCommandResponse,
    DeviceCommandAcknowledge
)


import logging
import time

from .logging_config import configure_logging

configure_logging()

logger = logging.getLogger("plantpulse")

app = FastAPI(
    title="PlantPulse API",
    description="Backend del sistema PlantPulse",
    version="0.1.0"
)

from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def log_requests(request, call_next):
    start_time = time.perf_counter()

    try:
        response = await call_next(request)

        duration_ms = round(
            (time.perf_counter() - start_time) * 1000,
            2
        )

        logger.info(
            "HTTP request completed",
            extra={
                "method": request.method,
                "path": request.url.path,
                "status_code": response.status_code,
                "duration_ms": duration_ms
            }
        )

        return response

    except Exception:
        duration_ms = round(
            (time.perf_counter() - start_time) * 1000,
            2
        )

        logger.exception(
            "HTTP request failed",
            extra={
                "method": request.method,
                "path": request.url.path,
                "duration_ms": duration_ms
            }
        )

        raise


# ==================================================
# 1. Endpoint principale
# ==================================================

@app.get("/")
def home():
    return {
        "project": "PlantPulse",
        "status": "online",
        "message": "PlantPulse API is running"
    }


# ==================================================
# 2. Ricezione e salvataggio di una misurazione
# ==================================================

@app.post(
    "/measurements",
    response_model=MeasurementResponse,
    status_code=status.HTTP_201_CREATED
)
def create_measurement(
    measurement: MeasurementCreate,
    db: Session = Depends(get_db)
):

    new_measurement = Measurement(
        **measurement.model_dump()
    )

    db.add(new_measurement)
    db.commit()
    db.refresh(new_measurement)

    return new_measurement


# ==================================================
# 3. Recupero dell'ultima misurazione
# ==================================================

@app.get(
    "/measurements/latest",
    response_model=MeasurementResponse
)
def get_latest_measurement(
    db: Session = Depends(get_db)
):

    statement = (
        select(Measurement)
        .order_by(
            Measurement.measured_at.desc(),
            Measurement.id.desc()
        )
        .limit(1)
    )

    latest = db.scalar(statement)

    if latest is None:
        raise HTTPException(
            status_code=404,
            detail="Nessuna misurazione disponibile"
        )

    return latest



# Recupero dello storico delle misurazioni
@app.get(
    "/measurements/history",
    response_model=list[MeasurementResponse]
)
def get_measurement_history(
    limit: int = Query(default=50, ge=1, le=500),
    db: Session = Depends(get_db)
):

    # Recuperiamo le misurazioni più recenti
    statement = (
        select(Measurement)
        .order_by(
            Measurement.measured_at.desc(),
            Measurement.id.desc()
        )
        .limit(limit)
    )

    measurements = db.scalars(statement).all()

    return measurements



# Recupero delle impostazioni del dispositivo
@app.get(
    "/settings",
    response_model=DeviceSettingsResponse
)
def get_device_settings(
    device_id: str = Query(
        default="plantpulse_001",
        min_length=1,
        max_length=64
    ),
    db: Session = Depends(get_db)
):

    statement = select(DeviceSettings).where(
        DeviceSettings.device_id == device_id
    )

    settings = db.scalar(statement)

    if settings is None:
        raise HTTPException(
            status_code=404,
            detail="Impostazioni del dispositivo non trovate"
        )

    return settings


# Modifica delle impostazioni del dispositivo
@app.put(
    "/settings",
    response_model=DeviceSettingsResponse
)
def update_device_settings(
    new_settings: DeviceSettingsUpdate,
    device_id: str = Query(
        default="plantpulse_001",
        min_length=1,
        max_length=64
    ),
    db: Session = Depends(get_db)
):

    statement = select(DeviceSettings).where(
        DeviceSettings.device_id == device_id
    )

    settings = db.scalar(statement)

    if settings is None:
        raise HTTPException(
            status_code=404,
            detail="Impostazioni del dispositivo non trovate"
        )

    # Aggiorniamo i valori della configurazione
    for field, value in new_settings.model_dump().items():
        setattr(settings, field, value)

    # Registriamo la data dell'ultima modifica
    settings.updated_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(settings)

    return settings



# Monitoraggio dello stato del dispositivo
@app.get(
    "/devices/{device_id}/status",
    response_model=DeviceStatusResponse
)
def get_device_status(
    device_id: str,
    db: Session = Depends(get_db)
):

    # Recuperiamo le impostazioni del dispositivo
    settings_statement = select(DeviceSettings).where(
        DeviceSettings.device_id == device_id
    )

    settings = db.scalar(settings_statement)

    if settings is None:
        raise HTTPException(
            status_code=404,
            detail="Dispositivo non trovato"
        )

    # Recuperiamo l'ultima misurazione
    latest_statement = (
        select(Measurement)
        .where(Measurement.device_id == device_id)
        .order_by(
            Measurement.measured_at.desc(),
            Measurement.id.desc()
        )
        .limit(1)
    )

    latest = db.scalar(latest_statement)

    # Contiamo tutte le misurazioni del dispositivo
    count_statement = (
        select(func.count())
        .select_from(Measurement)
        .where(Measurement.device_id == device_id)
    )

    total = db.scalar(count_statement)

    # Se non esistono misurazioni, il dispositivo è offline
    if latest is None:
        return DeviceStatusResponse(
            device_id=device_id,
            is_online=False,
            last_seen=None,
            seconds_since_last_measurement=None,
            measurement_interval_seconds=settings.measurement_interval_seconds,
            total_measurements=total
        )

    # Calcoliamo quanto tempo è trascorso dall'ultima misurazione
    now = datetime.now(timezone.utc)

    elapsed = max(
        0.0,
        (now - latest.measured_at).total_seconds()
    )

    # Consideriamo il dispositivo online se ha comunicato
    # entro tre volte il suo intervallo di misurazione
    timeout = settings.measurement_interval_seconds * 3

    is_online = elapsed <= timeout

    return DeviceStatusResponse(
        device_id=device_id,
        is_online=is_online,
        last_seen=latest.measured_at,
        seconds_since_last_measurement=round(elapsed, 2),
        measurement_interval_seconds=settings.measurement_interval_seconds,
        total_measurements=total
    )


# Creazione di un nuovo comando
@app.post(
    "/devices/{device_id}/commands",
    response_model=DeviceCommandResponse,
    status_code=status.HTTP_201_CREATED
)
def create_device_command(
    device_id: str,
    command: DeviceCommandCreate,
    db: Session = Depends(get_db)
):

    # Verifichiamo che il dispositivo esista
    settings_statement = select(DeviceSettings).where(
        DeviceSettings.device_id == device_id
    )

    settings = db.scalar(settings_statement)

    if settings is None:
        raise HTTPException(
            status_code=404,
            detail="Dispositivo non trovato"
        )

    # Creiamo il comando
    new_command = DeviceCommand(
        device_id=device_id,
        command_type=command.command_type,
        payload=command.payload,
        status="pending"
    )

    db.add(new_command)
    db.commit()
    db.refresh(new_command)

    return new_command


# Recupero dei comandi in attesa
@app.get(
    "/devices/{device_id}/commands/pending",
    response_model=list[DeviceCommandResponse]
)
def get_pending_commands(
    device_id: str,
    db: Session = Depends(get_db)
):

    # Verifichiamo che il dispositivo esista
    settings_statement = select(DeviceSettings).where(
        DeviceSettings.device_id == device_id
    )

    settings = db.scalar(settings_statement)

    if settings is None:
        raise HTTPException(
            status_code=404,
            detail="Dispositivo non trovato"
        )

    # Recuperiamo i comandi non ancora eseguiti
    statement = (
        select(DeviceCommand)
        .where(
            DeviceCommand.device_id == device_id,
            DeviceCommand.status == "pending"
        )
        .order_by(DeviceCommand.created_at.asc())
    )

    commands = db.scalars(statement).all()

    return commands


# Recupero della cronologia dei comandi
@app.get(
    "/devices/{device_id}/commands",
    response_model=list[DeviceCommandResponse]
)
def get_device_command_history(
    device_id: str,
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db)
):

    # Verifichiamo che il dispositivo esista
    settings_statement = select(DeviceSettings).where(
        DeviceSettings.device_id == device_id
    )

    settings = db.scalar(settings_statement)

    if settings is None:
        raise HTTPException(
            status_code=404,
            detail="Dispositivo non trovato"
        )

    # Recuperiamo gli ultimi comandi, indipendentemente dallo stato
    statement = (
        select(DeviceCommand)
        .where(DeviceCommand.device_id == device_id)
        .order_by(
            DeviceCommand.created_at.desc(),
            DeviceCommand.id.desc()
        )
        .limit(limit)
    )

    commands = db.scalars(statement).all()

    return commands


# Conferma dell'esecuzione di un comando
@app.post(
    "/commands/{command_id}/ack",
    response_model=DeviceCommandResponse
)
def acknowledge_command(
    command_id: int,
    acknowledgement: DeviceCommandAcknowledge,
    db: Session = Depends(get_db)
):

    statement = select(DeviceCommand).where(
        DeviceCommand.id == command_id
    )

    command = db.scalar(statement)

    if command is None:
        raise HTTPException(
            status_code=404,
            detail="Comando non trovato"
        )

    if command.status != "pending":
        raise HTTPException(
            status_code=409,
            detail="Il comando è già stato completato"
        )

    command.status = acknowledgement.status

    command.executed_at = datetime.now(timezone.utc)

    if acknowledgement.status == "failed":
        command.error_message = (
            acknowledgement.error_message or "Errore non specificato"
        )
    else:
        command.error_message = None

    db.commit()
    db.refresh(command)

    return command

