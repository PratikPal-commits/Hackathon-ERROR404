"""
Application configuration using Pydantic Settings.
Loads environment variables from .env file.
"""

from functools import lru_cache
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # Database
    database_url: str = (
        "postgresql+asyncpg://postgres:password@localhost:5432/attendance_db"
    )

    # JWT Authentication
    secret_key: str = "your-super-secret-key-change-this-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30

    # Application
    debug: bool = True
    allowed_origins: str = "http://localhost:3000,http://localhost:8080"

    # Face Recognition
    face_recognition_tolerance: float = 0.6
    min_face_confidence: float = 0.8

    # Tesseract OCR Path (optional, for Windows)
    tesseract_cmd: str | None = None

    @property
    def allowed_origins_list(self) -> List[str]:
        """Parse allowed origins from comma-separated string."""
        return [origin.strip() for origin in self.allowed_origins.split(",")]


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()


settings = get_settings()
