from fastapi.testclient import TestClient

from app.main import app


def test_catalog_lists_five_subjects_from_database():
    response = TestClient(app).get("/api/v1/sheets")
    assert response.status_code == 200
    sheets = response.json()
    assert [sheet["slug"] for sheet in sheets] == ["dsa", "cn", "os", "dbms", "oops"]
    assert all(sheet["is_published"] is False for sheet in sheets)


def test_unpublished_sheet_exposes_metadata_but_no_draft_content():
    response = TestClient(app).get("/api/v1/sheets/dsa")
    assert response.status_code == 200
    assert response.json()["revision_number"] is None
    assert response.json()["steps"] == []


def test_unknown_sheet_is_not_found():
    response = TestClient(app).get("/api/v1/sheets/unknown")
    assert response.status_code == 404
