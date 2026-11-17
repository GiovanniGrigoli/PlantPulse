
import { useState, useEffect } from "react";

import {
  sendDeviceCommand,
  getDeviceCommandHistory,
} from "../services/api";

function Controls() {
  const deviceId = "plantpulse_001";

  const parameters = [
    {
      key: "soil_moisture",
      label: "Umidità del terreno",
      unit: "%",
      command: "set_soil_moisture",
      min: 0,
      max: 100,
    },
    {
      key: "light",
      label: "Luminosità",
      unit: "lux",
      command: "set_light",
      min: 0,
    },
    {
      key: "air_temperature",
      label: "Temperatura dell'aria",
      unit: "°C",
      command: "set_air_temperature",
    },
    {
      key: "air_humidity",
      label: "Umidità dell'aria",
      unit: "%",
      command: "set_air_humidity",
      min: 0,
      max: 100,
    },
  ];

  const [values, setValues] = useState({
    soil_moisture: "50",
    light: "800",
    air_temperature: "22",
    air_humidity: "60",
  });

  const [sending, setSending] = useState(null);
  const [message, setMessage] = useState(null);

  const [commands, setCommands] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState(null);

  // Recupera la cronologia dal backend
  async function loadCommandHistory() {
    try {
      const data = await getDeviceCommandHistory(deviceId, 20);

      setCommands(data);
      setHistoryError(null);
    } catch (error) {
      setHistoryError(error.message);
    } finally {
      setHistoryLoading(false);
    }
  }

  // Aggiornamento automatico ogni 5 secondi
  useEffect(() => {
    loadCommandHistory();

    const interval = setInterval(() => {
      loadCommandHistory();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  function handleChange(key, value) {
    setValues((previous) => ({
      ...previous,
      [key]: value,
    }));
  }

  async function handleSubmit(parameter) {
    const value = Number(values[parameter.key]);

    if (
      values[parameter.key] === "" ||
      !Number.isFinite(value) ||
      (parameter.min !== undefined && value < parameter.min) ||
      (parameter.max !== undefined && value > parameter.max)
    ) {
      setMessage({
        type: "error",
        text: "Inserisci un valore valido.",
      });
      return;
    }

    try {
      setSending(parameter.key);
      setMessage(null);

      const response = await sendDeviceCommand(
        deviceId,
        parameter.command,
        { value }
      );

      setMessage({
        type: "success",
        text: `Comando inviato correttamente. ID: ${response.id}`,
      });

      // Aggiorniamo subito la cronologia
      await loadCommandHistory();

    } catch (error) {
      setMessage({
        type: "error",
        text: error.message,
      });
    } finally {
      setSending(null);
    }
  }

  // Converte gli stati tecnici in etichette leggibili
  function getStatusLabel(status) {
    const labels = {
      pending: "In attesa",
      executed: "Eseguito",
      failed: "Fallito",
    };

    return labels[status] || status;
  }

  function getCommandLabel(commandType) {
    const parameter = parameters.find(
      (item) => item.command === commandType
    );

    return parameter ? parameter.label : commandType;
  }

  function formatDate(date) {
    if (!date) return "—";

    return new Date(date).toLocaleString("it-IT");
  }

  return (
    <div className="controls-page">

      <div className="controls-header">
        <h1>Controlli</h1>
        <p>
          Gestione manuale dei parametri del dispositivo PlantPulse.
        </p>
      </div>

      {/* Invio dei comandi */}
      <div className="controls-grid">

        {parameters.map((parameter) => (
          <div className="control-card" key={parameter.key}>

            <h2>{parameter.label}</h2>

            <div className="control-input">
              <input
                type="number"
                value={values[parameter.key]}
                min={parameter.min}
                max={parameter.max}
                onChange={(event) =>
                  handleChange(parameter.key, event.target.value)
                }
              />

              <span>{parameter.unit}</span>
            </div>

            <button
              onClick={() => handleSubmit(parameter)}
              disabled={sending !== null}
            >
              {sending === parameter.key
                ? "Invio in corso..."
                : "Invia comando"}
            </button>

          </div>
        ))}

      </div>

      {message && (
        <div className={`control-message ${message.type}`}>
          {message.text}
        </div>
      )}

      {/* Cronologia dei comandi */}
      <div className="statistics-history-card">

        <div className="statistics-history-header">
          <div>
            <h2>Cronologia comandi</h2>
            <p>Ultimi 20 comandi inviati al dispositivo</p>
          </div>
        </div>

        {historyLoading ? (
          <p>Caricamento cronologia...</p>
        ) : historyError ? (
          <p className="control-history-error">
            Errore: {historyError}
          </p>
        ) : commands.length === 0 ? (
          <p>Nessun comando registrato.</p>
        ) : (

          <div className="statistics-table-container">

            <table className="statistics-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Parametro</th>
                  <th>Valore</th>
                  <th>Invio</th>
                  <th>Esecuzione</th>
                  <th>Stato</th>
                </tr>
              </thead>

              <tbody>
                {commands.map((command) => (
                  <tr key={command.id}>

                    <td>#{command.id}</td>

                    <td>
                      {getCommandLabel(command.command_type)}
                    </td>

                    <td>
                      {command.payload.value}
                    </td>

                    <td>
                      {formatDate(command.created_at)}
                    </td>

                    <td>
                      {formatDate(command.executed_at)}
                    </td>

                    <td>
                      <span
                        className={`command-status ${command.status}`}
                      >
                        {getStatusLabel(command.status)}
                      </span>

                      {command.error_message && (
                        <div className="command-error">
                          {command.error_message}
                        </div>
                      )}
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>

          </div>
        )}

      </div>

    </div>
  );
}

export default Controls;
