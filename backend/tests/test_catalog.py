from fastapi.testclient import TestClient

from app.main import app


def test_catalog_does_not_list_unpublished_subjects():
    response = TestClient(app).get("/api/v1/sheets")
    assert response.status_code == 200
    sheets = response.json()
    assert sheets == []


def test_unpublished_sheet_is_not_found():
    response = TestClient(app).get("/api/v1/sheets/cn")
    assert response.status_code == 404


def test_unknown_sheet_is_not_found():
    response = TestClient(app).get("/api/v1/sheets/unknown")
    assert response.status_code == 404
