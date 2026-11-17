from sqlalchemy import BigInteger, DateTime, Float, Identity, String, Integer, func
from sqlalchemy.orm import Mapped, mapped_column
from datetime import datetime, timezone
from .database import Base
from sqlalchemy.dialects.postgresql import JSONB

class Measurement(Base):

    __tablename__ = "measurements"

    id: Mapped[int] = mapped_column(
        BigInteger,
        Identity(always=True),
        primary_key=True
    )

    device_id: Mapped[str] = mapped_column(
        String(64),
        nullable=False
    )

    measured_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False
    )

    soil_moisture: Mapped[float] = mapped_column(
        Float,
        nullable=False
    )

    light: Mapped[float] = mapped_column(
        Float,
        nullable=False
    )

    air_temperature: Mapped[float] = mapped_column(
        Float,
        nullable=False
    )

    air_humidity: Mapped[float] = mapped_column(
        Float,
        nullable=False
    )

    def __repr__(self):
        return (
            f"Measurement(id={self.id}, "
            f"device_id='{self.device_id}', "
            f"soil_moisture={self.soil_moisture})"
        )


class DeviceSettings(Base):

    __tablename__ = "device_settings"

    id: Mapped[int] = mapped_column(
        BigInteger,
        Identity(always=True),
        primary_key=True
    )

    device_id: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
        unique=True
    )

    measurement_interval_seconds: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=2
    )

    soil_moisture_min: Mapped[float] = mapped_column(Float, nullable=False)
    soil_moisture_max: Mapped[float] = mapped_column(Float, nullable=False)

    light_min: Mapped[float] = mapped_column(Float, nullable=False)
    light_max: Mapped[float] = mapped_column(Float, nullable=False)

    air_temperature_min: Mapped[float] = mapped_column(Float, nullable=False)
    air_temperature_max: Mapped[float] = mapped_column(Float, nullable=False)

    air_humidity_min: Mapped[float] = mapped_column(Float, nullable=False)
    air_humidity_max: Mapped[float] = mapped_column(Float, nullable=False)

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False
    )



class DeviceCommand(Base):

    __tablename__ = "device_commands"

    id: Mapped[int] = mapped_column(
        BigInteger,
        Identity(always=True),
        primary_key=True
    )

    device_id: Mapped[str] = mapped_column(
        String(64),
        nullable=False
    )

    command_type: Mapped[str] = mapped_column(
        String(64),
        nullable=False
    )

    payload: Mapped[dict] = mapped_column(
        JSONB,
        nullable=False
    )

    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="pending"
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        server_default=func.now()
    )

    executed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True
    )

    error_message: Mapped[str | None] = mapped_column(
        String,
        nullable=True
    )
