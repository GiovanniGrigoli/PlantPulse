
# Immagine di partenza con Python 3.12
FROM python:3.12-slim

# Evita file .pyc e mantiene i log visibili nei container
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Cartella di lavoro interna al container
WORKDIR /app

# Copiamo prima le dipendenze
COPY requirements.txt .

# Installiamo le librerie Python
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# Copiamo il codice dell'applicazione
COPY app ./app

# Documentiamo la porta utilizzata da FastAPI
EXPOSE 8000

# Avviamo il server
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
