from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "Study Sheets API"
    database_url: str = "mysql+pymysql://study_sheets:study_sheets_dev@127.0.0.1:3306/study_sheets"


@lru_cache
def get_settings() -> Settings:
    return Settings()
