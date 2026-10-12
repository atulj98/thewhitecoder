import pytest

from app.core.config import Settings
from app.release import validate_production_settings


@pytest.mark.parametrize("scheme", ["postgres", "postgresql", "postgresql+psycopg"])
def test_provider_url_uses_installed_driver_and_preserves_escaping(scheme):
    suffix = "student:dev%40password@db.internal:5432/sheets?sslmode=require"
    settings = Settings(database_url=f"{scheme}://{suffix}", _env_file=None)
    assert settings.database_url == f"postgresql+psycopg://{suffix}"


@pytest.mark.parametrize(
    "overrides, message",
    [
        ({"database_url": "sqlite:///sheets.db"}, "PostgreSQL"),
        ({"google_client_id": ""}, "GOOGLE_CLIENT_ID"),
        ({"cookie_secure": False}, "COOKIE_SECURE"),
        ({"frontend_origins": ["http://localhost:5173"]}, "FRONTEND_ORIGINS"),
        (
            {"frontend_origins": ["https://thewhitecoder.com", "https://unrelated.example"]},
            "FRONTEND_ORIGINS",
        ),
    ],
)
def test_release_rejects_incomplete_production_configuration(overrides, message):
    values = {
        "database_url": "postgresql://student:dev@db.internal/sheets",
        "google_client_id": "web-client.apps.googleusercontent.com",
        "cookie_secure": True,
        "frontend_origins": ["https://thewhitecoder.com", "https://www.thewhitecoder.com"],
    }
    settings = Settings(**(values | overrides), _env_file=None)
    with pytest.raises(ValueError, match=message):
        validate_production_settings(settings)


def test_release_accepts_the_production_configuration():
    validate_production_settings(
        Settings(
            database_url="postgresql://student:dev@db.internal/sheets",
            google_client_id="web-client.apps.googleusercontent.com",
            cookie_secure=True,
            frontend_origins=["https://thewhitecoder.com", "https://www.thewhitecoder.com"],
            _env_file=None,
        )
    )
