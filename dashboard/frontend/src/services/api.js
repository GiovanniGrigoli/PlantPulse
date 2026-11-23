
const API_BASE_URL = "/api";

// Funzione generale per effettuare richieste HTTP
async function request(endpoint, options = {}) {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  });

  // Gestione delle risposte HTTP non riuscite
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));

    throw new Error(
      errorData.detail || `Errore HTTP: ${response.status}`
    );
  }

  return response.json();
}

// Recupera l'ultima misurazione
export function getLatestMeasurement() {
  return request("/measurements/latest");
}

// Recupera lo storico delle misurazioni
export function getMeasurementHistory(limit = 50) {
  return request(`/measurements/history?limit=${limit}`);
}

// Recupera lo stato del dispositivo
export function getDeviceStatus(deviceId) {
  return request(`/devices/${deviceId}/status`);
}


// Invia un comando al dispositivo
export function sendDeviceCommand(deviceId, commandType, payload) {
  return request(`/devices/${deviceId}/commands`, {
    method: "POST",
    body: JSON.stringify({
      command_type: commandType,
      payload: payload,
    }),
  });
}
     

// Recupera la cronologia dei comandi del dispositivo
export function getDeviceCommandHistory(deviceId, limit = 20) {
  return request(
    `/devices/${deviceId}/commands?limit=${limit}`
  );
}


// Recupera la configurazione del dispositivo
export function getDeviceSettings(deviceId) {
  return request(`/settings?device_id=${deviceId}`);
}

// Aggiorna la configurazione del dispositivo
export function updateDeviceSettings(deviceId, settings) {
  return request(`/settings?device_id=${deviceId}`, {
    method: "PUT",
    body: JSON.stringify(settings),
  });
}
