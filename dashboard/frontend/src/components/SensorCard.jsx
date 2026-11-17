
function SensorCard({ title, value, unit, icon, description }) {
  return (
    <div className="sensor-card">
      <div className="sensor-card-header">
        <span className="sensor-icon">{icon}</span>
        <span className="sensor-description">{description}</span>
      </div>

      <h3>{title}</h3>

      <div className="sensor-value">
        {value}
        <span>{unit}</span>
      </div>
    </div>
  );
}

export default SensorCard;
