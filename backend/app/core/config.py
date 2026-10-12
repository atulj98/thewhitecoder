from functools import lru_cache

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "Study Sheets API"
    database_url: str = (
        "postgresql+psycopg://study_sheets:study_sheets_dev@127.0.0.1:5432/study_sheets"
    )
    google_client_id: str = ""
    frontend_origins: list[str] = ["http://localhost:5173", "http://localhost:5174"]
    cookie_secure: bool = True
    session_days: int = 7

    @field_validator("google_client_id")
    @classmethod
    def clean_google_client_id(cls, value: str) -> str:
        return value.strip()

    @field_validator("database_url", mode="before")
    @classmethod
    def use_psycopg_for_postgresql(cls, value: str) -> str:
        # Managed hosts supply these URLs without SQLAlchemy's driver suffix.
        # Preserve the provider's credentials, escaping, and query parameters.
        for prefix in ("postgres://", "postgresql://"):
            if isinstance(value, str) and value.startswith(prefix):
                return "postgresql+psycopg://" + value[len(prefix) :]
        return value

    @property
    def session_cookie(self) -> str:
        return "__Host-twc_session" if self.cookie_secure else "twc_session"

    @property
    def csrf_cookie(self) -> str:
        return "__Host-twc_csrf" if self.cookie_secure else "twc_csrf"


@lru_cache
def get_settings() -> Settings:
    return Settings()
