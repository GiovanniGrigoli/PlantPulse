# PlantPulse 🌱

PlantPulse è un progetto IoT personale per il monitoraggio e la gestione delle condizioni ambientali di una pianta. L'applicazione viene eseguita localmente su un singolo computer: un simulatore C++ riproduce il comportamento del dispositivo, il backend riceve e memorizza le misurazioni e il frontend consente di consultare i dati e inviare comandi.

## Funzionalità

- Acquisizione simulata di umidità del terreno, luminosità, temperatura e umidità dell'aria.
- Dashboard con ultime misurazioni e stato del dispositivo.
- Storico e grafici delle misurazioni.
- Invio di comandi al dispositivo simulato e consultazione del relativo stato.
- Configurazione dell'intervallo di misurazione e delle soglie ambientali.
- Persistenza di misurazioni, configurazioni e comandi in PostgreSQL.
- Containerizzazione con Docker Compose.
- Verifiche automatiche e pubblicazione delle immagini Docker tramite GitHub Actions e GHCR.

## Architettura e flusso dei dati

Il sistema è composto da quattro elementi principali:

1. **Simulatore hardware C++17**: genera valori ambientali, invia misurazioni in formato JSON e interroga il backend per recuperare i comandi in attesa.
2. **Backend FastAPI**: espone API REST, valida i dati, interagisce con PostgreSQL e gestisce il ciclo di vita dei comandi.
3. **Database PostgreSQL 17**: conserva misurazioni, impostazioni del dispositivo e comandi.
4. **Frontend React**: mostra i dati e permette di gestire il dispositivo tramite il backend. Nella configurazione containerizzata, Nginx serve il frontend e inoltra `/api/` al backend.

Flusso delle misurazioni: `C++ → HTTP/JSON → FastAPI → SQLAlchemy → PostgreSQL → API → React`.

Flusso dei comandi: `React → FastAPI → PostgreSQL (pending) → simulatore C++ → esecuzione → endpoint di acknowledgement → PostgreSQL`.

Il dispositivo simulato utilizza l'identificativo `plantpulse_001`.

## Tecnologie utilizzate

| Area | Tecnologie |
|---|---|
| Simulatore | C++17, libcurl, nlohmann/json |
| Backend | Python 3.12, FastAPI, Uvicorn, Pydantic, SQLAlchemy, Psycopg, python-dotenv |
| Database | PostgreSQL 17, SQL |
| Frontend | JavaScript, React 19, Vite 8, Recharts |
| Web server / reverse proxy | Nginx |
| Container | Docker, Docker Compose |
| Versionamento e CI/CD | Git, GitHub, GitHub Actions |
| Registry immagini | GitHub Container Registry (GHCR) |
| Test | pytest, HTTPX, ESLint, build Vite |
| Ambiente di sviluppo | Linux/Ubuntu su WSL2, Visual Studio Code |

## Struttura del repository

```text
PlantPulse/
├── .github/workflows/ci.yml
├── dashboard/
│   ├── backend/
│   │   ├── app/
│   │   │   ├── main.py
│   │   │   ├── database.py
│   │   │   ├── models.py
│   │   │   ├── schemas.py
│   │   │   └── logging_config.py
│   │   ├── sql/init.sql
│   │   ├── tests/
│   │   ├── Dockerfile
│   │   ├── requirements.txt
│   │   └── requirements-dev.txt
│   ├── frontend/
│   │   ├── src/
│   │   │   ├── components/
│   │   │   ├── pages/
│   │   │   └── services/api.js
│   │   ├── Dockerfile
│   │   ├── nginx.conf
│   │   ├── package.json
│   │   └── package-lock.json
│   ├── docker-compose.yml
│   └── docker-compose.prod.yml
├── hardware/
│   └── main.cpp
├── .gitignore
└── README.md
```

## Requisiti

Per lavorare sul progetto da sorgente sono necessari:

- Linux oppure Windows con WSL2 e una distribuzione Ubuntu.
- Git.
- Docker Engine e Docker Compose.
- Python 3.12 e `venv`.
- Node.js 24 e npm.
- Compilatore C++ compatibile con C++17.
- `pkg-config`, librerie di sviluppo libcurl e header nlohmann-json.

Su Ubuntu/WSL2, le dipendenze C++ si installano con:

```bash
sudo apt update
sudo apt install -y build-essential pkg-config libcurl4-openssl-dev nlohmann-json3-dev
```

## Configurazione iniziale

Dalla root del repository:

```bash
cd dashboard
cp .env.example .env
```

Il file `dashboard/.env.example` deve contenere un esempio senza credenziali reali:

```env
POSTGRES_DB=plantpulse
POSTGRES_USER=plantpulse
POSTGRES_PASSWORD=change-this-local-password
```

Modificare `POSTGRES_PASSWORD` nel file locale `.env`. **Non committare mai `.env`**: contiene credenziali. Il file `.env.example` è invece un modello privo di segreti e può essere versionato.

> Nota sul pacchetto sorgente consegnato per la documentazione: nello ZIP esaminato non era presente `dashboard/.env.example`, anche se il README precedente lo citava. Prima di aggiornare il repository, aggiungere il file con il contenuto di esempio riportato sopra.

## Avvio locale con build dai sorgenti

Questa modalità utilizza `dashboard/docker-compose.yml` e costruisce localmente backend e frontend.

```bash
cd ~/PlantPulse/dashboard
docker compose up -d --build
docker compose ps
```

Aprire la dashboard su `http://localhost:8080`. Il backend è disponibile su `http://127.0.0.1:8000` e la documentazione interattiva FastAPI su `http://127.0.0.1:8000/docs`.

Per avviare il simulatore, da un altro terminale:

```bash
cd ~/PlantPulse
g++ -std=c++17 -Wall -Wextra -pedantic \
  hardware/main.cpp -o hardware/plantpulse \
  $(pkg-config --cflags --libs libcurl)

./hardware/plantpulse
```

Il simulatore invia una misurazione ogni intervallo configurato (inizialmente 2 secondi) e controlla periodicamente la presenza di comandi.

## Avvio locale con immagini GHCR

Il file `dashboard/docker-compose.prod.yml` utilizza le immagini già pubblicate su GitHub Container Registry:

- `ghcr.io/giovannigrigoli/plantpulse-backend:latest`
- `ghcr.io/giovannigrigoli/plantpulse-frontend:latest`

Per scaricare e avviare le immagini:

```bash
cd ~/PlantPulse/dashboard
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml ps
```

Se i pacchetti GHCR sono privati, effettuare prima il login con un Personal Access Token che abbia il permesso `read:packages`:

```bash
docker login ghcr.io -u GiovanniGrigoli
```

Inserire il token quando richiesto; non inserirlo nei file del repository.

Per arrestare i container:

```bash
docker compose -f docker-compose.prod.yml stop
```

Per riavviarli:

```bash
docker compose -f docker-compose.prod.yml start
```

Per ricrearli senza eliminare i dati:

```bash
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up -d
```

**Non utilizzare `down -v` se si desidera conservare il database**: l'opzione `-v` elimina anche i volumi associati.

## Frontend: sezioni disponibili

- **Dashboard**: mostra le quattro misurazioni più recenti e lo stato del dispositivo.
- **Statistics**: visualizza lo storico, consente di scegliere il sensore e il numero di misurazioni e presenta grafico, valori minimi, massimi e medi.
- **Controls**: invia comandi per impostare umidità del terreno, luminosità, temperatura e umidità dell'aria; mostra la cronologia dei comandi e il loro stato.
- **Maintenance**: mostra diagnostica, ultima comunicazione e numero di misurazioni; permette di modificare intervallo di acquisizione e soglie minime/massime.

Le soglie vengono memorizzate e validate; nel codice esaminato non è presente un sistema di notifiche o allarmi automatici basato sul superamento delle soglie.

## Backend: API principali

La documentazione interattiva è disponibile su `/docs` quando il backend è raggiungibile.

| Metodo | Endpoint | Funzione |
|---|---|---|
| GET | `/` | Stato dell'API |
| POST | `/measurements` | Riceve e salva una misurazione |
| GET | `/measurements/latest` | Recupera l'ultima misurazione |
| GET | `/measurements/history` | Recupera lo storico con limite |
| GET | `/settings` | Legge le impostazioni del dispositivo |
| PUT | `/settings` | Aggiorna le impostazioni |
| GET | `/devices/{device_id}/status` | Restituisce stato, ultima comunicazione e conteggio |
| POST | `/devices/{device_id}/commands` | Crea un comando in stato `pending` |
| GET | `/devices/{device_id}/commands/pending` | Elenca i comandi in attesa per il simulatore |
| GET | `/devices/{device_id}/commands` | Legge la cronologia dei comandi |
| POST | `/commands/{command_id}/ack` | Registra l'esito `executed` o `failed` |

## Database

Lo schema iniziale è definito in `dashboard/backend/sql/init.sql` e comprende:

- `measurements`: misurazioni ambientali con timestamp e identificativo dispositivo;
- `device_settings`: intervallo di acquisizione e soglie ambientali;
- `device_commands`: tipo e payload JSONB del comando, stato, date ed eventuale messaggio di errore.

Lo script SQL viene eseguito da PostgreSQL all'inizializzazione di un volume dati vuoto. Non viene rieseguito automaticamente su un volume già inizializzato. Il volume Docker `plantpulse_db_data` conserva i dati tra riavvii e ricreazioni dei container, purché non venga eliminato.

## Test e pipeline CI/CD

La pipeline è definita in `.github/workflows/ci.yml` e viene avviata su push verso `main`, pull request verso `main` e manualmente tramite `workflow_dispatch`.

I job di verifica sono:

1. `backend-check`: installa le dipendenze Python, controlla la sintassi e avvia pytest con un servizio PostgreSQL.
2. `frontend-check`: installa le dipendenze con `npm ci`, esegue ESLint e la build Vite.
3. `hardware-check`: installa le dipendenze C++ e compila il simulatore.
4. `docker-check`: valida la configurazione Docker Compose.

Dopo il superamento dei controlli, il job `docker-publish` pubblica le immagini backend e frontend su GHCR. La pubblicazione è limitata ai push su `main` e agli avvii manuali sul branch `main`; ogni immagine riceve un tag `latest` e un tag identificato dallo SHA del commit.

La pipeline costruisce e pubblica immagini: **non esegue il deployment su un server remoto**. L'esecuzione prevista del progetto resta locale.

## Comandi di verifica e troubleshooting

```bash
# Stato dei servizi
docker compose -f dashboard/docker-compose.prod.yml ps

# Log dei servizi
docker compose -f dashboard/docker-compose.prod.yml logs -f backend
docker compose -f dashboard/docker-compose.prod.yml logs -f db
docker compose -f dashboard/docker-compose.prod.yml logs -f frontend

# Verifica API
curl http://127.0.0.1:8000/
curl http://127.0.0.1:8000/measurements/latest
```

Problemi comuni:

- **Database non pronto**: controllare `docker compose ... ps` e i log del servizio `db`.
- **Backend non raggiunge PostgreSQL**: verificare che `.env` sia presente in `dashboard`, che le credenziali siano corrette e che Compose imposti `DB_HOST=db` per il backend containerizzato.
- **Dashboard senza dati**: controllare che il simulatore sia avviato e che il backend riceva `POST /measurements`.
- **Comandi non eseguiti**: verificare che il simulatore sia attivo e consultare la cronologia dei comandi e i log backend.

## Sicurezza e limiti attuali

- Il progetto è pensato per uso personale e locale, non è un servizio pronto per produzione pubblica.
- Non è implementata autenticazione utente per la dashboard o per le API.
- Il simulatore è software: non è collegato a sensori fisici.
- L'identificativo del dispositivo è attualmente configurato nel codice.
- Le soglie sono configurabili e validate, ma non generano allarmi automatici.
- Il frontend nel Compose attuale usa la mappatura `8080:80`, che può esporre la porta su tutte le interfacce host. Se si vuole limitare esplicitamente l'accesso al solo computer locale, sostituirla in entrambi i file Compose con `127.0.0.1:8080:80`.

## Possibili sviluppi futuri

- Collegamento a sensori e microcontrollori fisici.
- Sistema di allarmi basato sulle soglie configurate.
- Autenticazione e autorizzazione.
- Gestione di più dispositivi.
- Applicazione Android.
- Miglioramento della gestione degli errori e dell'osservabilità.

---

**PlantPulse** — progetto personale IoT per monitoraggio e gestione delle condizioni ambientali di una pianta.
