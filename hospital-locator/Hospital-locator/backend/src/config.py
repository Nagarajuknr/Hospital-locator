# backend/src/config.py
from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "postgresql+asyncpg://mediguide:mediguide123@localhost:5432/mediguide_db"

    # JWT
    JWT_SECRET: str = "CHANGE-THIS-IN-PRODUCTION-use-python-secrets-token-hex-32"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 43200  # 30 days

    # App
    APP_NAME: str = "MediGuide India"
    DEBUG: bool = True
    ENVIRONMENT: str = "development"

    # Optional — fill in when you get them
    GOOGLE_MAPS_API_KEY: Optional[str] = None   # free from console.cloud.google.com
    CLOUDINARY_CLOUD_NAME: Optional[str] = None
    CLOUDINARY_API_KEY: Optional[str] = None
    CLOUDINARY_API_SECRET: Optional[str] = None

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
