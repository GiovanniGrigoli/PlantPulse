
#include <iostream>
#include <sstream>
#include <string>
#include <random>
#include <chrono>
#include <iomanip>
#include <algorithm>
#include <thread>
#include <nlohmann/json.hpp>
#include <ctime>
#include <cmath>
#include <curl/curl.h>

using json = nlohmann::json;

class PlantPulseDevice {

private:

    // Identificativo del dispositivo
    const std::string deviceId = "plantpulse_001";

    // Valori ambientali iniziali
    double soilMoisture = 65.0;
    double light = 850.0;
    double airTemperature = 22.0;
    double airHumidity = 58.0;

    // Generatore casuale
    std::random_device rd;
    std::mt19937 generator{rd()};

    // Genera una variazione casuale
    double randomVariation(double min, double max) {
        std::uniform_real_distribution<double> distribution(min, max);
        return distribution(generator);
    }

    // Limita un valore tra minimo e massimo
    double clampValue(double value, double min, double max) {
        return std::clamp(value, min, max);
    }

    // Restituisce il timestamp in millisecondi
    long long getTimestamp() const {
        auto now = std::chrono::system_clock::now();

        return std::chrono::duration_cast<std::chrono::milliseconds>(
            now.time_since_epoch()
        ).count();
    }

public:

    // Simulazione del passaggio del tempo
    void update(double elapsedSeconds = 1.0) {

        soilMoisture -= 0.025 * elapsedSeconds;
        soilMoisture += randomVariation(-0.015, 0.015) * elapsedSeconds;

        light += randomVariation(-3.0, 3.0) * elapsedSeconds;

        airTemperature += randomVariation(-0.015, 0.015) * elapsedSeconds;

        airHumidity += randomVariation(-0.025, 0.025) * elapsedSeconds;

        // Limiti delle misurazioni
        soilMoisture = clampValue(soilMoisture, 0.0, 100.0);
        light = clampValue(light, 0.0, 20000.0);
        airTemperature = clampValue(airTemperature, 0.0, 50.0);
        airHumidity = clampValue(airHumidity, 0.0, 100.0);
    }

    // Comandi per modificare le condizioni ambientali

    void increaseSoilMoisture(double amount) {
        soilMoisture = clampValue(soilMoisture + amount, 0.0, 100.0);
    }

    void decreaseSoilMoisture(double amount) {
        soilMoisture = clampValue(soilMoisture - amount, 0.0, 100.0);
    }

    void increaseLight(double amount) {
        light = clampValue(light + amount, 0.0, 20000.0);
    }

    void decreaseLight(double amount) {
        light = clampValue(light - amount, 0.0, 20000.0);
    }

    void increaseTemperature(double amount) {
        airTemperature = clampValue(airTemperature + amount, 0.0, 50.0);
    }

    void decreaseTemperature(double amount) {
        airTemperature = clampValue(airTemperature - amount, 0.0, 50.0);
    }

    void increaseAirHumidity(double amount) {
        airHumidity = clampValue(airHumidity + amount, 0.0, 100.0);
    }

    void decreaseAirHumidity(double amount) {
        airHumidity = clampValue(airHumidity - amount, 0.0, 100.0);
    }

    // Imposta direttamente i parametri ambientali
    void setSoilMoisture(double value) {
        soilMoisture = clampValue(value, 0.0, 100.0);
    }

    void setLight(double value) {
        light = clampValue(value, 0.0, 20000.0);
    }

    void setAirTemperature(double value) {
        airTemperature = clampValue(value, 0.0, 50.0);
    }

    void setAirHumidity(double value) {
        airHumidity = clampValue(value, 0.0, 100.0);
    }

    // Arrotonda un valore a due cifre decimali
    double roundToTwoDecimals(double value) const {
        return std::round(value * 100.0) / 100.0;
    }

    // Genera il JSON nel formato richiesto dal backend FastAPI
    std::string getMeasurementJson() const {

        long long timestamp = getTimestamp();

        std::time_t seconds = timestamp / 1000;

        std::tm utcTime{};
        gmtime_r(&seconds, &utcTime);

        char dateBuffer[32];

        std::strftime(
            dateBuffer,
            sizeof(dateBuffer),
            "%Y-%m-%dT%H:%M:%S",
            &utcTime
        );

        int milliseconds = timestamp % 1000;

        std::ostringstream isoTimestamp;

        isoTimestamp << dateBuffer
                    << "."
                    << std::setfill('0')
                    << std::setw(3)
                    << milliseconds
                    << "Z";

        json measurement = {
            {"device_id", deviceId},
            {"measured_at", isoTimestamp.str()},
            {"soil_moisture", roundToTwoDecimals(soilMoisture)},
            {"light", roundToTwoDecimals(light)},
            {"air_temperature", roundToTwoDecimals(airTemperature)},
            {"air_humidity", roundToTwoDecimals(airHumidity)}
        };

        return measurement.dump();
    }

        bool applyCommand(
        const json& command,
        int& measurementInterval,
        std::string& error
    ) {
        try {

            std::string commandType =
                command.at("command_type").get<std::string>();

            const json& payload = command.at("payload");

            if (!payload.is_object()) {
                error = "Payload non valido";
                return false;
            }

            if (commandType == "set_measurement_interval") {

                if (!payload.contains("seconds") ||
                    !payload.at("seconds").is_number_integer()) {
                    error = "Intervallo non valido";
                    return false;
                }

                int seconds = payload.at("seconds").get<int>();

                if (seconds < 1 || seconds > 3600) {
                    error = "Intervallo fuori dai limiti";
                    return false;
                }

                measurementInterval = seconds;
            }

            else if (commandType == "set_soil_moisture") {

                double value = payload.at("value").get<double>();
                setSoilMoisture(value);
            }

            else if (commandType == "set_light") {

                double value = payload.at("value").get<double>();
                setLight(value);
            }

            else if (commandType == "set_air_temperature") {

                double value = payload.at("value").get<double>();
                setAirTemperature(value);
            }

            else if (commandType == "set_air_humidity") {

                double value = payload.at("value").get<double>();
                setAirHumidity(value);
            }

            else {
                error = "Comando sconosciuto";
                return false;
            }

            return true;
        }

        catch (const std::exception& e) {

            error = e.what();
            return false;
        }
    }

    std::string getDeviceId() const {
        return deviceId;
    }
};

// Invia una misurazione al backend FastAPI tramite HTTP POST
bool sendMeasurement(const std::string& measurementJson) {

    CURL* curl = curl_easy_init();

    if (!curl) {
        std::cerr << "Errore: impossibile inizializzare CURL\n";
        return false;
    }

    // Header della richiesta HTTP
    struct curl_slist* headers = nullptr;

    headers = curl_slist_append(
        headers,
        "Content-Type: application/json"
    );

    // Corpo della richiesta
    curl_easy_setopt(
        curl,
        CURLOPT_URL,
        "http://127.0.0.1:8000/measurements"
    );

    curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);

    curl_easy_setopt(curl, CURLOPT_POST, 1L);

    curl_easy_setopt(
        curl,
        CURLOPT_POSTFIELDS,
        measurementJson.c_str()
    );

    curl_easy_setopt(
        curl,
        CURLOPT_POSTFIELDSIZE,
        static_cast<long>(measurementJson.size())
    );

    // Timeout per evitare attese infinite
    curl_easy_setopt(curl, CURLOPT_CONNECTTIMEOUT, 2L);
    curl_easy_setopt(curl, CURLOPT_TIMEOUT, 5L);

    // Esecuzione della richiesta
    CURLcode result = curl_easy_perform(curl);

    bool success = false;

    if (result != CURLE_OK) {

        std::cerr << "Errore HTTP: "
                  << curl_easy_strerror(result)
                  << std::endl;

    } else {

        long responseCode = 0;

        curl_easy_getinfo(
            curl,
            CURLINFO_RESPONSE_CODE,
            &responseCode
        );

        if (responseCode >= 200 && responseCode < 300) {

            std::cout << "Misurazione inviata correttamente!"
                      << " HTTP " << responseCode
                      << std::endl;

            success = true;

        } else {

            std::cerr << "Errore del backend. HTTP "
                      << responseCode
                      << std::endl;
        }
    }

    curl_slist_free_all(headers);
    curl_easy_cleanup(curl);

    return success;
}

// Memorizza il contenuto ricevuto da una risposta HTTP
size_t writeCallback(
    void* contents,
    size_t size,
    size_t nmemb,
    void* userData
) {
    size_t totalSize = size * nmemb;

    std::string* response =
        static_cast<std::string*>(userData);

    response->append(
        static_cast<char*>(contents),
        totalSize
    );

    return totalSize;
}

// Recupera i comandi in attesa dal backend
json fetchPendingCommands(const std::string& deviceId) {

    CURL* curl = curl_easy_init();

    if (!curl) {
        std::cerr << "Errore inizializzazione CURL\n";
        return json::array();
    }

    std::string response;

    std::string url =
        "http://127.0.0.1:8000/devices/" +
        deviceId +
        "/commands/pending";

    curl_easy_setopt(curl, CURLOPT_URL, url.c_str());

    curl_easy_setopt(
        curl,
        CURLOPT_WRITEFUNCTION,
        writeCallback
    );

    curl_easy_setopt(
        curl,
        CURLOPT_WRITEDATA,
        &response
    );

    curl_easy_setopt(curl, CURLOPT_CONNECTTIMEOUT, 2L);
    curl_easy_setopt(curl, CURLOPT_TIMEOUT, 5L);

    CURLcode result = curl_easy_perform(curl);

    long responseCode = 0;

    if (result == CURLE_OK) {
        curl_easy_getinfo(
            curl,
            CURLINFO_RESPONSE_CODE,
            &responseCode
        );
    }

    curl_easy_cleanup(curl);

    if (result != CURLE_OK) {
        std::cerr << "Errore recupero comandi: "
                  << curl_easy_strerror(result)
                  << std::endl;

        return json::array();
    }

    if (responseCode != 200) {
        std::cerr << "Backend ha restituito HTTP "
                  << responseCode
                  << std::endl;

        return json::array();
    }

    try {

        json commands = json::parse(response);

        if (!commands.is_array()) {
            std::cerr << "Risposta del backend non valida\n";
            return json::array();
        }

        return commands;

    } catch (const json::exception& e) {

        std::cerr << "Errore lettura JSON: "
                  << e.what()
                  << std::endl;

        return json::array();
    }
}

// Comunica al backend l'esito di un comando
bool acknowledgeCommand(
    long long commandId,
    const std::string& status,
    const std::string& errorMessage = ""
) {

    CURL* curl = curl_easy_init();

    if (!curl) {
        std::cerr << "Errore inizializzazione CURL\n";
        return false;
    }

    std::string url =
        "http://127.0.0.1:8000/commands/" +
        std::to_string(commandId) +
        "/ack";

    // Prepariamo il JSON di risposta
    json acknowledgement = {
        {"status", status},
        {"error_message",
            status == "failed"
                ? json(errorMessage.empty()
                    ? "Errore non specificato"
                    : errorMessage)
                : json(nullptr)
        }
    };

    std::string requestBody = acknowledgement.dump();
    std::string response;

    struct curl_slist* headers = nullptr;

    headers = curl_slist_append(
        headers,
        "Content-Type: application/json"
    );

    curl_easy_setopt(curl, CURLOPT_URL, url.c_str());
    curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
    curl_easy_setopt(curl, CURLOPT_POST, 1L);

    curl_easy_setopt(
        curl,
        CURLOPT_POSTFIELDS,
        requestBody.c_str()
    );

    curl_easy_setopt(
        curl,
        CURLOPT_POSTFIELDSIZE,
        static_cast<long>(requestBody.size())
    );

    curl_easy_setopt(
        curl,
        CURLOPT_WRITEFUNCTION,
        writeCallback
    );

    curl_easy_setopt(
        curl,
        CURLOPT_WRITEDATA,
        &response
    );

    curl_easy_setopt(curl, CURLOPT_CONNECTTIMEOUT, 2L);
    curl_easy_setopt(curl, CURLOPT_TIMEOUT, 5L);

    CURLcode result = curl_easy_perform(curl);

    long responseCode = 0;

    if (result == CURLE_OK) {
        curl_easy_getinfo(
            curl,
            CURLINFO_RESPONSE_CODE,
            &responseCode
        );
    }

    curl_slist_free_all(headers);
    curl_easy_cleanup(curl);

    if (result != CURLE_OK) {
        std::cerr << "Errore invio conferma: "
                  << curl_easy_strerror(result)
                  << std::endl;

        return false;
    }

    if (responseCode != 200) {
        std::cerr << "Errore conferma comando. HTTP "
                  << responseCode
                  << std::endl;

        return false;
    }

    std::cout << "Comando " << commandId
              << " confermato: " << status
              << std::endl;

    return true;
}

// Recupera, esegue e conferma tutti i comandi in attesa
void processPendingCommands(
    PlantPulseDevice& device,
    int& measurementInterval
) {

    json commands = fetchPendingCommands(device.getDeviceId());

    for (const auto& command : commands) {

        try {

            long long commandId =
                command.at("id").get<long long>();

            std::string error;

            std::cout << "\nRicevuto comando "
                      << commandId << std::endl;

            bool success = device.applyCommand(
                command,
                measurementInterval,
                error
            );

            if (success) {

                std::cout << "Comando eseguito correttamente!"
                          << std::endl;

                acknowledgeCommand(
                    commandId,
                    "executed"
                );

            } else {

                std::cerr << "Errore esecuzione comando: "
                          << error << std::endl;

                acknowledgeCommand(
                    commandId,
                    "failed",
                    error
                );
            }

        } catch (const std::exception& e) {

            std::cerr << "Errore elaborazione comando: "
                      << e.what()
                      << std::endl;
        }
    }
}

// vecchio main
// int main() {

//     PlantPulseDevice device;

//     while (true) {

//         // Aggiorna i parametri ambientali
//         device.update(2.0);

//         // Stampa il JSON compatibile con FastAPI
//         std::cout << device.getMeasurementJson() << std::endl;

//         std::this_thread::sleep_for(
//             std::chrono::seconds(2)
//         );
//     }

//     return 0;
// }


int main() {

    // Inizializzazione di libcurl
    if (curl_global_init(CURL_GLOBAL_DEFAULT) != CURLE_OK) {
        std::cerr << "Errore inizializzazione libcurl\n";
        return 1;
    }

    PlantPulseDevice device;

    // Intervallo iniziale di invio delle misurazioni
    int measurementInterval = 2;

    // Timer indipendente per le misurazioni
    auto lastMeasurement =
        std::chrono::steady_clock::now()
        - std::chrono::seconds(measurementInterval);

    std::cout << "PlantPulse avviato!"
              << std::endl;

    while (true) {

        // Aggiorna la simulazione ogni secondo
        device.update(1.0);

        // Recupera ed esegue i comandi ricevuti
        processPendingCommands(
            device,
            measurementInterval
        );

        // Controlla se è il momento di inviare una misurazione
        auto now = std::chrono::steady_clock::now();

        auto elapsed = std::chrono::duration_cast<
            std::chrono::seconds
        >(now - lastMeasurement).count();

        if (elapsed >= measurementInterval) {

            std::string measurement =
                device.getMeasurementJson();

            std::cout << "\nInvio misurazione: "
                      << measurement
                      << std::endl;

            sendMeasurement(measurement);

            lastMeasurement = now;
        }

        // Attende un secondo prima del prossimo controllo
        std::this_thread::sleep_for(
            std::chrono::seconds(1)
        );
    }

    curl_global_cleanup();

    return 0;
}