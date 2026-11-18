
import { useCallback, useEffect, useState } from "react";

import {
  getDeviceSettings,
  updateDeviceSettings,
  getDeviceStatus,
  sendDeviceCommand,
} from "../services/api";

function Maintenance() {
  const deviceId = "plantpulse_001";

  const [settings, setSettings] = useState(null);
  const [form, setForm] = useState({});
  const [deviceStatus, setDeviceStatus] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  // Recupera la configurazione dal database
  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);

      const data = await getDeviceSettings(deviceId);

      setSettings(data);

      // Gli input HTML gestiscono comodamente valori stringa
      setForm({
        measurement_interval_seconds: String(data.measurement_interval_seconds),
        soil_moisture_min: String(data.soil_moisture_min),
        soil_moisture_max: String(data.soil_moisture_max),
        light_min: String(data.light_min),
        light_max: String(data.light_max),
        air_temperature_min: String(data.air_temperature_min),
        air_temperature_max: String(data.air_temperature_max),
        air_humidity_min: String(data.air_humidity_min),
        air_humidity_max: String(data.air_humidity_max),
      });

      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [deviceId]);

  // Recupera lo stato del dispositivo
  const loadDeviceStatus = useCallback(async () => {
    try {
      const data = await getDeviceStatus(deviceId);
      setDeviceStatus(data);
    } catch (err) {
      console.error("Errore nel recupero dello stato:", err);
    }
  }, [deviceId]);

  // Caricamento iniziale e aggiornamento diagnostica
  useEffect(() => {
    // Differiamo il caricamento iniziale per evitare
    // aggiornamenti sincroni di stato direttamente nell'effetto.
    const initialLoad = setTimeout(() => {
      loadSettings();
      loadDeviceStatus();
    }, 0);

    // Aggiorna lo stato del dispositivo ogni 5 secondi
    const interval = setInterval(() => {
      loadDeviceStatus();
    }, 5000);

    return () => {
      clearTimeout(initialLoad);
      clearInterval(interval);
    };
  }, [loadSettings, loadDeviceStatus]);

  // Aggiorna un singolo campo del modulo
  function handleChange(key, value) {
    setForm((previous) => ({
      ...previous,
      [key]: value,
    }));
  }

  // Salva la configurazione
  async function handleSave(event) {
    event.preventDefault();

    const numericFields = [
      "measurement_interval_seconds",
      "soil_moisture_min",
      "soil_moisture_max",
      "light_min",
      "light_max",
      "air_temperature_min",
      "air_temperature_max",
      "air_humidity_min",
      "air_humidity_max",
    ];

    const newSettings = {};

    for (const field of numericFields) {
      if (form[field] === "" || !Number.isFinite(Number(form[field]))) {
        setMessage({
          type: "error",
          text: "Tutti i campi devono contenere valori numerici validi.",
        });
        return;
      }

      newSettings[field] = Number(form[field]);
    }

    // L'intervallo deve essere un numero intero
    if (!Number.isInteger(newSettings.measurement_interval_seconds)) {
      setMessage({
        type: "error",
        text: "L'intervallo di misurazione deve essere un numero intero.",
      });
      return;
    }

    const intervalChanged =
      settings &&
      newSettings.measurement_interval_seconds !==
        settings.measurement_interval_seconds;

    try {
      setSaving(true);
      setMessage(null);

      // Prima salviamo la configurazione in PostgreSQL
      const updatedSettings = await updateDeviceSettings(
        deviceId,
        newSettings
      );

      setSettings(updatedSettings);

      setForm({
        measurement_interval_seconds: String(updatedSettings.measurement_interval_seconds),
        soil_moisture_min: String(updatedSettings.soil_moisture_min),
        soil_moisture_max: String(updatedSettings.soil_moisture_max),
        light_min: String(updatedSettings.light_min),
        light_max: String(updatedSettings.light_max),
        air_temperature_min: String(updatedSettings.air_temperature_min),
        air_temperature_max: String(updatedSettings.air_temperature_max),
        air_humidity_min: String(updatedSettings.air_humidity_min),
        air_humidity_max: String(updatedSettings.air_humidity_max),
      });

      // Se l'intervallo è cambiato, comunichiamo la modifica al C++
      if (intervalChanged) {
        try {
          const command = await sendDeviceCommand(
            deviceId,
            "set_measurement_interval",
            {
              seconds: newSettings.measurement_interval_seconds,
            }
          );

          setMessage({
            type: "success",
            text: `Configurazione salvata. Modifica dell'intervallo inviata al dispositivo (comando #${command.id}).`,
          });
        } catch (commandError) {
          setMessage({
            type: "error",
            text: `Configurazione salvata, ma non è stato possibile inviare il nuovo intervallo al dispositivo: ${commandError.message}`,
          });
        }
      } else {
        setMessage({
          type: "success",
          text: "Configurazione salvata correttamente.",
        });
      }
    } catch (err) {
      setMessage({
        type: "error",
        text: err.message,
      });
    } finally {
      setSaving(false);
    }
  }

  // Formatta una data
  function formatDate(date) {
    if (!date) return "Mai";

    return new Date(date).toLocaleString("it-IT");
  }

  // Genera un campo numerico
  function renderField(label, key, unit, step = "0.1") {
    return (
      <div className="maintenance-field" key={key}>
        <label htmlFor={key}>{label}</label>

        <div className="maintenance-input">
          <input
            id={key}
            type="number"
            step={step}
            value={form[key] ?? ""}
            onChange={(event) =>
              handleChange(key, event.target.value)
            }
            required
          />

          <span>{unit}</span>
        </div>
      </div>
    );
  }

  if (loading) {
    return <div className="maintenance-page">Caricamento configurazione...</div>;
  }

  if (error && !settings) {
    return (
      <div className="maintenance-page">
        <h1>Manutenzione</h1>
        <p className="maintenance-error">
          Impossibile recuperare la configurazione: {error}
        </p>
        <button onClick={loadSettings}>Riprova</button>
      </div>
    );
  }

  return (
    <div className="maintenance-page">

      <div className="maintenance-header">
        <h1>Manutenzione</h1>
        <p>
          Configurazione e diagnostica del dispositivo PlantPulse.
        </p>
      </div>

      {/* DIAGNOSTICA */}
      <section className="maintenance-section">

        <h2>Diagnostica dispositivo</h2>

        <div className="maintenance-status-grid">

          <div className="maintenance-status-card">
            <span>Stato dispositivo</span>

            <strong className={
              deviceStatus?.is_online ? "online" : "offline"
            }>
              {deviceStatus
                ? deviceStatus.is_online ? "Online" : "Offline"
                : "Non disponibile"}
            </strong>
          </div>

          <div className="maintenance-status-card">
            <span>Ultima comunicazione</span>
            <strong>
              {formatDate(deviceStatus?.last_seen)}
            </strong>
          </div>

          <div className="maintenance-status-card">
            <span>Misurazioni registrate</span>
            <strong>
              {deviceStatus?.total_measurements ?? "—"}
            </strong>
          </div>

          <div className="maintenance-status-card">
            <span>Intervallo attuale nel backend</span>
            <strong>
              {deviceStatus
                ? `${deviceStatus.measurement_interval_seconds} secondi`
                : "—"}
            </strong>
          </div>

        </div>

      </section>

      {/* CONFIGURAZIONE */}
      <section className="maintenance-section">

        <h2>Configurazione dispositivo</h2>

        <form
          className="maintenance-form"
          onSubmit={handleSave}
        >

          <div className="maintenance-group">
            <h3>Acquisizione dati</h3>

            {renderField(
              "Intervallo di misurazione",
              "measurement_interval_seconds",
              "secondi",
              "1"
            )}
          </div>

          <div className="maintenance-group">
            <h3>Umidità del terreno</h3>

            <div className="maintenance-fields">
              {renderField("Soglia minima", "soil_moisture_min", "%")}
              {renderField("Soglia massima", "soil_moisture_max", "%")}
            </div>
          </div>

          <div className="maintenance-group">
            <h3>Luminosità</h3>

            <div className="maintenance-fields">
              {renderField("Soglia minima", "light_min", "lux")}
              {renderField("Soglia massima", "light_max", "lux")}
            </div>
          </div>

          <div className="maintenance-group">
            <h3>Temperatura dell'aria</h3>

            <div className="maintenance-fields">
              {renderField("Soglia minima", "air_temperature_min", "°C")}
              {renderField("Soglia massima", "air_temperature_max", "°C")}
            </div>
          </div>

          <div className="maintenance-group">
            <h3>Umidità dell'aria</h3>

            <div className="maintenance-fields">
              {renderField("Soglia minima", "air_humidity_min", "%")}
              {renderField("Soglia massima", "air_humidity_max", "%")}
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="maintenance-save-button"
          >
            {saving ? "Salvataggio..." : "Salva configurazione"}
          </button>

        </form>

        {message && (
          <div className={`control-message ${message.type}`}>
            {message.text}
          </div>
        )}

        {settings && (
          <p className="maintenance-updated">
            Ultima modifica: {formatDate(settings.updated_at)}
          </p>
        )}

      </section>

    </div>
  );
}

export default Maintenance;
