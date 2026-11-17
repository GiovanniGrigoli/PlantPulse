-- PlantPulse database initialization
-- PostgreSQL 17

-- 1. Measurements
CREATE TABLE IF NOT EXISTS measurements (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    device_id VARCHAR(64) NOT NULL,
    measured_at TIMESTAMPTZ NOT NULL,
    soil_moisture DOUBLE PRECISION NOT NULL,
    light DOUBLE PRECISION NOT NULL,
    air_temperature DOUBLE PRECISION NOT NULL,
    air_humidity DOUBLE PRECISION NOT NULL,

    CONSTRAINT check_soil_moisture
        CHECK (soil_moisture BETWEEN 0 AND 100),

    CONSTRAINT check_air_humidity
        CHECK (air_humidity BETWEEN 0 AND 100),

    CONSTRAINT check_light
        CHECK (light >= 0)
);

-- 2. Device settings
CREATE TABLE IF NOT EXISTS device_settings (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    device_id VARCHAR(64) NOT NULL UNIQUE,

    measurement_interval_seconds INTEGER NOT NULL DEFAULT 2,

    soil_moisture_min DOUBLE PRECISION NOT NULL DEFAULT 30,
    soil_moisture_max DOUBLE PRECISION NOT NULL DEFAULT 70,

    light_min DOUBLE PRECISION NOT NULL DEFAULT 200,
    light_max DOUBLE PRECISION NOT NULL DEFAULT 1200,

    air_temperature_min DOUBLE PRECISION NOT NULL DEFAULT 15,
    air_temperature_max DOUBLE PRECISION NOT NULL DEFAULT 30,

    air_humidity_min DOUBLE PRECISION NOT NULL DEFAULT 40,
    air_humidity_max DOUBLE PRECISION NOT NULL DEFAULT 70,

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT check_interval
        CHECK (measurement_interval_seconds BETWEEN 1 AND 3600),

    CONSTRAINT check_soil_thresholds
        CHECK (
            soil_moisture_min >= 0
            AND soil_moisture_max <= 100
            AND soil_moisture_min < soil_moisture_max
        ),

    CONSTRAINT check_light_thresholds
        CHECK (light_min >= 0 AND light_min < light_max),

    CONSTRAINT check_temperature_thresholds
        CHECK (air_temperature_min < air_temperature_max),

    CONSTRAINT check_humidity_thresholds
        CHECK (
            air_humidity_min >= 0
            AND air_humidity_max <= 100
            AND air_humidity_min < air_humidity_max
        )
);

-- 3. Device commands
CREATE TABLE IF NOT EXISTS device_commands (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    device_id VARCHAR(64) NOT NULL
        REFERENCES device_settings(device_id),

    command_type VARCHAR(64) NOT NULL,
    payload JSONB NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    executed_at TIMESTAMPTZ,
    error_message TEXT,

    CONSTRAINT check_command_status
        CHECK (status IN ('pending', 'executed', 'failed'))
);

-- 4. Index for pending commands
CREATE INDEX IF NOT EXISTS idx_device_commands_pending
ON device_commands(device_id, created_at)
WHERE status = 'pending';

-- 5. Initial device configuration
INSERT INTO device_settings (
    device_id,
    measurement_interval_seconds,
    soil_moisture_min,
    soil_moisture_max,
    light_min,
    light_max,
    air_temperature_min,
    air_temperature_max,
    air_humidity_min,
    air_humidity_max
)
VALUES (
    'plantpulse_001',
    2,
    30,
    70,
    200,
    1200,
    15,
    30,
    40,
    70
)
ON CONFLICT (device_id) DO NOTHING;
