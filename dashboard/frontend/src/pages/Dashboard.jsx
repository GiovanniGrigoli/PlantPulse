
import { useState, useEffect } from "react";

import SensorCard from "../components/SensorCard";

import DeviceStatus from "../components/DeviceStatus";

import {
  getLatestMeasurement,
  getDeviceStatus,
} from "../services/api";

function Dashboard() {
  const [measurement, setMeasurement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deviceStatus, setDeviceStatus] = useState(null);

  useEffect(() => {
    let active = true;

    
    async function loadMeasurement() {
      try {
        const data = await getLatestMeasurement();

        if (active) {
          setMeasurement(data);
          setError(null);
          setLoading(false);
        }
      } catch (err) {
        if (active) {
          setError(err.message);
          setLoading(false);
        }
      }

      try {
        const statusData = await getDeviceStatus("plantpulse_001");

        if (active) {
          setDeviceStatus(statusData);
        }
      } catch (err) {
        if (active) {
          setDeviceStatus(null);
          console.error("Errore nel recupero dello stato:", err);
        }
      }
    }


    // Prima richiesta immediata
    loadMeasurement();

    // Aggiornamento automatico ogni 5 secondi
    const interval = setInterval(loadMeasurement, 5000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  const measurements = [
    {
      title: "Umidità terreno",
      value: measurement?.soil_moisture,
      unit: "%",
      icon: "💧",
      description: "Soil moisture",
    },
    {
      title: "Luminosità",
      value: measurement?.light,
      unit: " lux",
      icon: "☀️",
      description: "Light intensity",
    },
    {
      title: "Temperatura",
      value: measurement?.air_temperature,
      unit: "°C",
      icon: "🌡️",
      description: "Air temperature",
    },
    {
      title: "Umidità aria",
      value: measurement?.air_humidity,
      unit: "%",
      icon: "🌫️",
      description: "Air humidity",
    },
  ];

  return (
    <main className="dashboard-content">
      <header className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p>Monitoraggio del dispositivo PlantPulse</p>
        </div>

        <div className="device-indicator">
          <span className="status-dot"></span>
          Aggiornamento automatico
        </div>
      </header>

      <section className="welcome-section">
        <h2>Panoramica della tua pianta 🌱</h2>
        <p>
          Ecco le ultime informazioni rilevate dal dispositivo.
        </p>
      </section>

      
      <DeviceStatus
        isOnline={deviceStatus?.is_online}
        lastSeen={deviceStatus?.last_seen}
        secondsSinceLastMeasurement={deviceStatus?.seconds_since_last_measurement}
        totalMeasurements={deviceStatus?.total_measurements}
      />


      {loading && (
        <p>Caricamento delle misurazioni...</p>
      )}

      {error && (
        <p className="error-message">
          Errore nel recupero dei dati: {error}
        </p>
      )}

      <section className="sensor-grid">
        {measurements.map((sensor) => (
          <SensorCard
            key={sensor.title}
            {...sensor}
            value={
              sensor.value !== undefined &&
              sensor.value !== null
                ? sensor.value
                : "--"
            }
          />
        ))}
      </section>

      {measurement && (
        <section className="measurement-info">
          <p>
            Dispositivo: <strong>{measurement.device_id}</strong>
          </p>

          <p>
            Ultima misurazione:{" "}
            <strong>
              {new Date(
                measurement.measured_at
              ).toLocaleString("it-IT")}
            </strong>
          </p>
        </section>
      )}
    </main>
  );
}

export default Dashboard;
