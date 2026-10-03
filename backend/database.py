"""
database.py - PostgreSQL connection via SQLAlchemy
Connects to Neon.tech (or any PostgreSQL) using DATABASE_URL from .env
"""

import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    import warnings
    warnings.warn(
        "DATABASE_URL not set — create backend/.env from .env.example before starting the server.",
        stacklevel=2
    )
    DATABASE_URL = "sqlite:///./placeholder.db"  # Fallback so module loads; server won't work without real URL

# Neon.tech requires SSL — SQLAlchemy handles it via the URL ?sslmode=require
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,       # Auto-reconnect if connection drops
    pool_size=5,              # Keep 5 persistent connections
    max_overflow=10,          # Allow 10 extra on peak load
    echo=False                # Set True to debug SQL queries
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """
    FastAPI dependency injection — use this in every route with Depends(get_db).
    Automatically opens and closes a DB session per request.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def check_db_connection() -> bool:
    """Utility to verify DB is reachable — called on app startup."""
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        return False
