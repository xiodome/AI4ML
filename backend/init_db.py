"""
Database initialisation script.
Run with:  python init_db.py
"""
import sys
import os

# Ensure the backend directory is on the path
sys.path.insert(0, os.path.dirname(__file__))

from app.database import Base, engine, SessionLocal
from app.models import User, UserRole, Dataset, Task, MLModel, Pipeline  # noqa: F401 – imports register models
from app.routers.auth import hash_password
from app.config import settings


def init_db() -> None:
    print("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    print("Tables created.")

    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.username == "admin").first()
        if not existing:
            admin = User(
                username="admin",
                email="admin@ai4ml.com",
                hashed_password=hash_password("Admin123!"),
                role=UserRole.admin,
                api_token_quota=999999,
                api_token_used=0,
                is_active=True,
            )
            db.add(admin)
            db.commit()
            print("Default admin user created: admin / Admin123!")
        else:
            print("Admin user already exists – skipping.")
    finally:
        db.close()

    print("Database initialisation complete.")


if __name__ == "__main__":
    init_db()
