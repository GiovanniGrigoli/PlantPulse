
import os
from pathlib import Path

import pytest
from dotenv import load_dotenv
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.engine import URL
from sqlalchemy.orm import sessionmaker

from app.database import Base, get_db
from app.main import app


# 1. Carichiamo le credenziali dal file .env principale
DASHBOARD_DIR = Path(__file__).resolve().parents[2]
load_dotenv(DASHBOARD_DIR / ".env")


# 2. Costruiamo la connessione al database di test
TEST_DATABASE_URL = URL.create(
    drivername="postgresql+psycopg",
    username=os.getenv("POSTGRES_USER"),
    password=os.getenv("POSTGRES_PASSWORD"),
    host=os.getenv("DB_HOST", "127.0.0.1"),
    port=int(os.getenv("DB_PORT", "5432")),
    database="plantpulse_test"
)


# 3. Prepariamo il database isolato per ogni test
@pytest.fixture
def test_engine():
    engine = create_engine(TEST_DATABASE_URL, pool_pre_ping=True)

    with engine.connect() as connection:
        current_database = connection.scalar(
            text("SELECT current_database()")
        )

    # Protezione: non eseguiamo operazioni distruttive
    # se la connessione non punta al database di test.
    if current_database != "plantpulse_test":
        engine.dispose()
        raise RuntimeError(
            "ERRORE: il database collegato non è plantpulse_test!"
        )

    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    yield engine

    Base.metadata.drop_all(bind=engine)
    engine.dispose()


# 4. Sostituiamo la connessione normale di FastAPI
# con quella del database di test.
@pytest.fixture
def client(test_engine):
    TestingSessionLocal = sessionmaker(
        bind=test_engine,
        autoflush=False,
        autocommit=False
    )

    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()
