import os

from pathlib import Path
from dotenv import load_dotenv

from sqlalchemy import create_engine, text
from sqlalchemy.engine import URL
from sqlalchemy.orm import DeclarativeBase, sessionmaker


# 1. Caricamento delle variabili d'ambiente

BASE_DIR = Path(__file__).resolve().parents[2]
load_dotenv(BASE_DIR / ".env")


# 2. Recupero delle credenziali

DB_USER = os.getenv("POSTGRES_USER")
DB_PASSWORD = os.getenv("POSTGRES_PASSWORD")
DB_NAME = os.getenv("POSTGRES_DB")

DB_HOST = os.getenv("DB_HOST", "127.0.0.1")
DB_PORT = int(os.getenv("DB_PORT", "5432"))


if not all([DB_USER, DB_PASSWORD, DB_NAME]):
    raise RuntimeError("Configurazione database incompleta nel file .env")


# 3. Creazione dell'indirizzo di connessione

DATABASE_URL = URL.create(
    drivername="postgresql+psycopg",
    username=DB_USER,
    password=DB_PASSWORD,
    host=DB_HOST,
    port=DB_PORT,
    database=DB_NAME
)


# 4. Creazione del motore SQLAlchemy

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True
)


# 5. Gestione delle sessioni

SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    autocommit=False
)


# 6. Base per i modelli delle tabelle

class Base(DeclarativeBase):
    pass


# 7. Funzione per ottenere una sessione database

def get_db():
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()


# 8. Test della connessione

def test_connection():

    with engine.connect() as connection:

        result = connection.execute(
            text("SELECT current_database(), current_user")
        )

        database, user = result.fetchone()

        print("Connessione al database riuscita!")
        print(f"Database: {database}")
        print(f"Utente: {user}")


if __name__ == "__main__":
    test_connection()
