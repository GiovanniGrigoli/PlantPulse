
# PlantPulse 🌱

PlantPulse is an IoT-based plant monitoring and management system.

The project simulates an IoT device that collects environmental measurements and sends them to a backend server. Data is stored in a PostgreSQL database and displayed through a web dashboard, which also allows the user to monitor the device, configure measurement parameters and send commands.

The current implementation runs locally on a single computer. The hardware component is simulated in C++ and communicates with the backend through HTTP requests.

## Features

- **Environmental monitoring:** collection of soil moisture, light intensity, air temperature and air humidity.
- **Real-time dashboard:** visualization of the latest measurements and device status.
- **Historical statistics:** consultation of previously collected measurements.
- **Device management:** monitoring of device connectivity and configuration.
- **Remote commands:** sending commands from the dashboard to the simulated device.
- **Maintenance and configuration:** modification of measurement intervals and environmental thresholds.
- **Persistent storage:** measurements, settings and commands are stored in PostgreSQL.

## Architecture

PlantPulse is composed of three main components:

1. **Hardware simulator (C++):** simulates a plant monitoring device, generates environmental measurements and communicates with the backend.
2. **Backend (Python + FastAPI):** exposes REST API endpoints, processes measurements and commands, and communicates with the database.
3. **Frontend (React):** provides the web interface used to visualize data and manage the device.

PostgreSQL is used as the persistent database, while Docker Compose manages the database container.

### Data flow

```text
       C++ IoT Simulator
              |
              | HTTP / JSON
              v
       FastAPI Backend
              |
              | SQLAlchemy
              v
       PostgreSQL Database
              ^
              |
       FastAPI Backend
              ^
              |
        React Frontend
              |
              v
       Web Dashboard
```

The simulator periodically sends measurements to the backend. The backend stores them in PostgreSQL, where they can be retrieved by the frontend.

The frontend can also send commands to the backend. These commands are stored in the database and retrieved by the simulator, which executes them and reports their outcome.

## Tech Stack

| Component | Technologies |
|---|---|
| Hardware simulator | C++17, libcurl, nlohmann/json |
| Backend | Python, FastAPI, SQLAlchemy |
| Database | PostgreSQL 17 |
| Database management | Docker, Docker Compose |
| Frontend | React 19, JavaScript, Vite |
| Data visualization | Recharts |
| Communication | HTTP, REST API, JSON |

## Project Structure

```text
PlantPulse/
│
├── dashboard/
│   │
│   ├── backend/
│   │   ├── app/
│   │   │   ├── __init__.py
│   │   │   ├── main.py
│   │   │   ├── database.py
│   │   │   ├── models.py
│   │   │   └── schemas.py
│   │   │
│   │   ├── sql/
│   │   │   └── init.sql
│   │   │
│   │   └── requirements.txt
│   │
│   ├── frontend/
│   │   ├── src/
│   │   │   ├── components/
│   │   │   ├── pages/
│   │   │   ├── services/
│   │   │   └── App.jsx
│   │   │
│   │   ├── package.json
│   │   └── package-lock.json
│   │
│   ├── .env.example
│   ├── .gitignore
│   └── docker-compose.yml
│
├── hardware/
│   └── main.cpp
│
├── .gitignore
└── README.md
```

## Requirements

The following software is required to run the project:

- Linux or Windows with WSL2.
- Python 3.10 or newer.
- Node.js and npm (a version compatible with Vite 8).
- Docker Engine and Docker Compose.
- Git.
- A C++17-compatible compiler.
- `pkg-config`.
- libcurl development libraries.
- nlohmann-json development headers.

On Ubuntu or WSL2, the C++ dependencies can be installed with:

```bash
sudo apt update

sudo apt install build-essential pkg-config \
libcurl4-openssl-dev nlohmann-json3-dev
```

## Installation and Setup

### 1. Clone the repository

Clone the repository and enter the project directory:

```bash
git clone https://github.com/GiovanniGrigoli/PlantPulse.git

cd PlantPulse
```

Replace `<REPOSITORY_URL>` with the URL of the GitHub repository.

### 2. Configure environment variables

Move into the dashboard directory:

```bash
cd dashboard
```

Create the environment configuration file:

```bash
cp .env.example .env
```

Edit `.env`:

```bash
nano .env
```

Example configuration:

```env
POSTGRES_DB=plantpulse
POSTGRES_USER=plantpulse
POSTGRES_PASSWORD=change-this-password

DB_HOST=127.0.0.1
DB_PORT=5432
```

Set a secure local password and make sure the credentials match the PostgreSQL user configuration.

**Important:** `.env` contains local credentials and must never be committed to Git.

### 3. Start PostgreSQL

From the `dashboard` directory, start the database container:

```bash
docker compose up -d db
```

Check that the container is running:

```bash
docker compose ps
```

The database is exposed locally on port `5432`.

The PostgreSQL data is stored in a Docker volume named `plantpulse_db_data`, so it persists across container restarts.

If the SQL initialization script is mounted in `docker-compose.yml`, PostgreSQL executes it automatically when initializing an empty database data directory. Initialization scripts are not executed again when an already initialized volume is reused.

### 4. Configure and start the backend

Open a new terminal from the project root and enter the dashboard directory:

```bash
cd ~/PlantPulse/dashboard
```

Create a Python virtual environment:

```bash
python3 -m venv backend/venv
```

Activate it:

```bash
source backend/venv/bin/activate
```

Install the dependencies:

```bash
pip install -r backend/requirements.txt
```

Start the FastAPI development server:

```bash
fastapi dev backend/app/main.py
```

The backend is now available at:

- API: http://127.0.0.1:8000
- Interactive API documentation: http://127.0.0.1:8000/docs

### 5. Configure and start the frontend

Open another terminal and enter the frontend directory:

```bash
cd ~/PlantPulse/dashboard/frontend
```

Install the dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

The dashboard is available at:

http://localhost:5173

### 6. Compile and start the hardware simulator

Open another terminal from the project root:

```bash
cd ~/PlantPulse
```

Compile the C++ simulator:

```bash
g++ -std=c++17 -Wall -Wextra -pedantic \
hardware/main.cpp -o hardware/plantpulse \
$(pkg-config --cflags --libs libcurl)
```

Run the simulator:

```bash
./hardware/plantpulse
```

The simulator starts generating environmental measurements and sending them to the backend.

It also periodically checks for pending commands and reports their execution status.

**Note:** The backend must be running before starting the simulator. The simulator currently communicates with `http://127.0.0.1:8000`.

## Running the Project

To use PlantPulse, the following components must be running simultaneously:

| Component | Command | Address |
|---|---|---|
| PostgreSQL | `docker compose up -d db` | `127.0.0.1:5432` |
| Backend | `fastapi dev backend/app/main.py` | `127.0.0.1:8000` |
| Frontend | `npm run dev` | `localhost:5173` |
| Hardware simulator | `./hardware/plantpulse` | Local process |

Each component runs independently in its own terminal, except PostgreSQL, which runs inside Docker.

## Dashboard

The web dashboard provides four main sections:

### Dashboard

Displays the latest environmental measurements:

- Soil moisture.
- Light intensity.
- Air temperature.
- Air humidity.

It also provides an overview of the plant monitoring system and device status.

### Statistics

Provides access to historical measurements and graphical representations of environmental data.

### Controls

Allows the user to send commands to the simulated device, modifying its environmental parameters.

The supported commands include:

- Setting soil moisture.
- Setting light intensity.
- Setting air temperature.
- Setting air humidity.
- Changing the measurement interval.

The command history is also available.

### Maintenance

Provides device diagnostics and configuration management.

The user can monitor device connectivity and modify:

- Measurement interval.
- Minimum and maximum soil moisture.
- Minimum and maximum light intensity.
- Minimum and maximum air temperature.
- Minimum and maximum air humidity.

## API Endpoints

The backend exposes a REST API implemented with FastAPI.

The main endpoints are:

| Method | Endpoint | Description |
|---|---|---|
| GET | `/` | API status |
| POST | `/measurements` | Receive and store a measurement |
| GET | `/measurements/latest` | Retrieve the latest measurement |
| GET | `/measurements/history` | Retrieve measurement history |
| GET | `/settings` | Retrieve device settings |
| PUT | `/settings` | Update device settings |
| GET | `/devices/{device_id}/status` | Retrieve device status |
| POST | `/devices/{device_id}/commands` | Create a device command |
| GET | `/devices/{device_id}/commands` | Retrieve command history |
| GET | `/devices/{device_id}/commands/pending` | Retrieve pending commands |
| POST | `/commands/{command_id}/ack` | Confirm command execution |

Interactive API documentation is available at:

http://127.0.0.1:8000/docs

## Database

PlantPulse uses PostgreSQL to store three main categories of information:

- **Measurements:** environmental data collected by the device, including timestamps and device identifiers.
- **Device settings:** measurement intervals and environmental thresholds.
- **Device commands:** commands sent to the device, their payloads and execution status.

The database schema is defined in:

```text
dashboard/backend/sql/init.sql
```

## Troubleshooting

### PostgreSQL is not running

Check the container status:

```bash
docker compose ps
```

If necessary, start the database again:

```bash
docker compose up -d db
```

### Backend cannot connect to PostgreSQL

Check that:

- The PostgreSQL container is running.
- The `.env` file exists in the `dashboard` directory.
- The database credentials in `.env` match the PostgreSQL user.
- The database is accessible on port `5432`.

### Frontend cannot communicate with the backend

Make sure the FastAPI server is running on:

```text
http://127.0.0.1:8000
```

Also check the API base URL in:

```text
dashboard/frontend/src/services/api.js
```

### Hardware simulator cannot send measurements

Make sure the backend is running before starting the simulator.

Check that the simulator is configured to communicate with:

```text
http://127.0.0.1:8000
```

Also verify that the required C++ dependencies are installed.

## Security Notes

- Never commit `.env` or other files containing credentials.
- Keep database credentials private.
- PostgreSQL is bound to `127.0.0.1` in the provided Docker Compose configuration, limiting access to the local machine.
- The current implementation is intended for local development and experimentation, not production deployment.

## Future Development

Possible future improvements include:

- Integration with physical IoT sensors and microcontrollers.
- Development of an Android application.
- Deployment on a remote server.
- Improved authentication and security.
- Additional monitoring and notification features.
- Automated testing and CI/CD pipelines.

---

**PlantPulse** — A simple IoT system for monitoring and managing plant environmental conditions.
