import os
from functools import lru_cache
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "BlindSpot AI Backend"
    VERSION: str = "1.0.0"
    API_PREFIX: str = "/api"
    
    # Environment
    ENVIRONMENT: str = "development"
    
    # AI Provider
    GOOGLE_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-3.8-flash"
    
    # Database
    DATABASE_URL: str = "sqlite:///./blindspot.db"
    
    # CORS
    ALLOWED_ORIGINS: str = "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173,http://127.0.0.1:3000"
    
    # Upload limits
    MAX_UPLOAD_MB: int = 20
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    @property
    def cors_origins(self) -> List[str]:
        if not self.ALLOWED_ORIGINS:
            return ["*"]
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",") if origin.strip()]


@lru_cache()
def get_settings() -> Settings:
    return Settings()
