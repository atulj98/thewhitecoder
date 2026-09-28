from fastapi.testclient import TestClient

from app.main import app


def test_live_endpoint_does_not_require_database():
    response = TestClient(app).get("/api/v1/health/live")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_openapi_has_public_catalog_routes():
    paths = app.openapi()["paths"]
    assert "/api/v1/sheets" in paths
    assert "/api/v1/sheets/{slug}" in paths
