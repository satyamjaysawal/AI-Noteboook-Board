from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    port: int = 5000
    database_url: str = "postgresql://noteflow:noteflow123@localhost:5432/noteflow"
    database_ssl: bool = False
    google_api_key: str = ""
    client_url: str = "http://localhost:5173"


@lru_cache
def get_settings() -> Settings:
    return Settings()