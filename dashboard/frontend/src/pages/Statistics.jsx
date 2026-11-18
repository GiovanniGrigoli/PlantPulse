
import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import { getMeasurementHistory } from "../services/api";

function Statistics() {
  const [measurements, setMeasurements] = useState([]);
  const [selectedSensor, setSelectedSensor] = useState("soil_moisture");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [historyLimit, setHistoryLimit] = useState(10);

  // async function loadHistory() {
  //   try {
  //     const data = await getMeasurementHistory(historyLimit);

  //     // Ordiniamo le misurazioni dalla più vecchia alla più recente.
  //     const orderedData = [...data].sort(
  //       (a, b) => new Date(a.measured_at) - new Date(b.measured_at)
  //     );

  //     setMeasurements(orderedData);
  //     setError(null);
  //   } catch (err) {
  //     setError(err.message);
  //   } finally {
  //     setLoading(false);
  //   }
  // }

  // useEffect(() => {
  //   loadHistory();

  //   const interval = setInterval(loadHistory, 5000);

  //   return () => clearInterval(interval);
  // }, [historyLimit]);

  useEffect(() => {
    let cancelled = false;

    const refreshHistory = () => {
      getMeasurementHistory(historyLimit)
        .then((data) => {
          if (cancelled) return;

          // Ordiniamo le misurazioni dalla più vecchia alla più recente.
          const orderedData = [...data].sort(
            (a, b) => new Date(a.measured_at) - new Date(b.measured_at)
          );

          setMeasurements(orderedData);
          setError(null);
        })
        .catch((err) => {
          if (!cancelled) {
            setError(err.message);
          }
        })
        .finally(() => {
          if (!cancelled) {
            setLoading(false);
          }
        });
    };

    refreshHistory();

    const interval = setInterval(refreshHistory, 5000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [historyLimit]);


  const sensorOptions = {
    soil_moisture: {
      label: "Umidità del terreno",
      unit: "%",
    },
    light: {
      label: "Luminosità",
      unit: "lux",
    },
    air_temperature: {
      label: "Temperatura dell'aria",
      unit: "°C",
    },
    air_humidity: {
      label: "Umidità dell'aria",
      unit: "%",
    },
  };

  const chartData = measurements.map((measurement) => ({
    ...measurement,
    chartTime: new Date(measurement.measured_at).toLocaleTimeString(
      "it-IT",
      {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }
    ),
  }));


  const selectedValues = measurements.map(
    (measurement) => Number(measurement[selectedSensor])
  );

  const statistics = selectedValues.length > 0
    ? {
        min: Math.min(...selectedValues),
        max: Math.max(...selectedValues),
        avg:
          selectedValues.reduce((sum, value) => sum + value, 0) /
          selectedValues.length,
      }
    : null;

  const formatValue = (value) =>
    value.toFixed(2) + " " + sensorOptions[selectedSensor].unit;


  return (
    <div className="statistics-page">
      <div className="statistics-header">
        <h1>Statistiche</h1>
        <p>Analisi dello storico delle misurazioni di PlantPulse.</p>
      </div>

      <div className="statistics-controls">
        <label htmlFor="sensor-select">Sensore da visualizzare</label>


      <label htmlFor="history-limit">
        Numero di misurazioni
      </label>

      <select
        id="history-limit"
        value={historyLimit}
        onChange={(event) => setHistoryLimit(Number(event.target.value))}
      >
        <option value={10}>Ultime 10</option>
        <option value={25}>Ultime 25</option>
        <option value={50}>Ultime 50</option>
        <option value={100}>Ultime 100</option>
        <option value={500}>Ultime 500</option>
      </select>


        <select
          id="sensor-select"
          value={selectedSensor}
          onChange={(event) => setSelectedSensor(event.target.value)}
        >
          {Object.entries(sensorOptions).map(([key, sensor]) => (
            <option key={key} value={key}>
              {sensor.label}
            </option>
          ))}
        </select>
      </div>

      
      {!loading && !error && statistics && (
        <div className="statistics-summary">
          <div className="statistics-summary-card">
            <span>Valore minimo</span>
            <strong>{formatValue(statistics.min)}</strong>
          </div>

          <div className="statistics-summary-card">
            <span>Valore massimo</span>
            <strong>{formatValue(statistics.max)}</strong>
          </div>

          <div className="statistics-summary-card">
            <span>Valore medio</span>
            <strong>{formatValue(statistics.avg)}</strong>
          </div>
        </div>
      )}


      <div className="statistics-chart-card">
        <h2>{sensorOptions[selectedSensor].label}</h2>

        {loading ? (
          <p>Caricamento delle misurazioni...</p>
        ) : error ? (
          <p className="statistics-error">{error}</p>
        ) : measurements.length === 0 ? (
          <p>Nessuna misurazione disponibile.</p>
        ) : (
          <div className="statistics-chart">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />

                <XAxis dataKey="chartTime" />

                <YAxis />

                <Tooltip
                  formatter={(value) => [
                    `${Number(value).toFixed(2)} ${sensorOptions[selectedSensor].unit}`,
                    sensorOptions[selectedSensor].label,
                  ]}
                />

                <Line
                  type="monotone"
                  dataKey={selectedSensor}
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        <p className="statistics-footer">
          Ultime {measurements.length} misurazioni registrate.
        </p>
      </div>


      <div className="statistics-history-card">
        <div className="statistics-history-header">
          <h2>Storico misurazioni</h2>
          <span>{measurements.length} registrazioni</span>
        </div>

        <div className="statistics-table-container">
          <table className="statistics-table">
            <thead>
              <tr>
                <th>Data e ora</th>
                <th>Umidità terreno</th>
                <th>Luminosità</th>
                <th>Temperatura</th>
                <th>Umidità aria</th>
              </tr>
            </thead>

            <tbody>
              {[...measurements].reverse().map((measurement) => (
                <tr key={measurement.id}>
                  <td>
                    {new Date(measurement.measured_at).toLocaleString("it-IT")}
                  </td>

                  <td>{measurement.soil_moisture.toFixed(2)} %</td>

                  <td>{measurement.light.toFixed(2)} lux</td>

                  <td>{measurement.air_temperature.toFixed(2)} °C</td>

                  <td>{measurement.air_humidity.toFixed(2)} %</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>


    </div>
  );
}

export default Statistics;
