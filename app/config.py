import os
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "Competitive Programming Curation"
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./test.db")

    model_config = SettingsConfigDict(case_sensitive=True, env_file=".env")

settings = Settings()
