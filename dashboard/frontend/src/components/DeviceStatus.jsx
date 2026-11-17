
function DeviceStatus({ isOnline, lastSeen, secondsSinceLastMeasurement, totalMeasurements }) {
  const statusLabel = isOnline ? "Online" : "Offline";
  const statusClass = isOnline ? "online" : "offline";

  return (
    <div className="device-status-card">
      <div className="device-status-header">
        <div>
          <h3>Stato dispositivo</h3>
          <p>plantpulse_001</p>
        </div>

        <span className={`status-badge ${statusClass}`}>
          <span className="status-dot"></span>
          {statusLabel}
        </span>
      </div>

      <div className="device-status-details">
        <span>Ultima comunicazione</span>
        <strong>
          {lastSeen
            ? new Date(lastSeen).toLocaleString("it-IT")
            : "Non disponibile"}
        </strong>

        <span>Secondi dall'ultima misurazione</span>
        <strong>
          {secondsSinceLastMeasurement != null
            ? `${secondsSinceLastMeasurement.toFixed(1)} s`
            : "Non disponibile"}
        </strong>

        <span>Misurazioni totali</span>
        <strong>{totalMeasurements ?? "Non disponibile"}</strong>
      </div>
    </div>
  );
}

export default DeviceStatus;
