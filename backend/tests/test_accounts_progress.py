import json
import os
import time
import uuid

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event, select, text
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.api import auth as auth_api
from app.content_import import import_draft, publish_revision
from app.content_manifest import SheetManifest
from app.core.auth import digest
from app.core.config import get_settings
from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models import LoginSession, Sheet, User

ORIGIN = "http://localhost:5173"
ROOT = "/api/v1/me/progress/dsa"
QUESTION = ROOT + "/questions/arrays/prefix/q1"
TOPIC = ROOT + "/topics/arrays/prefix"


def manifest():
    return {
        "manifest_version": 1,
        "slug": "dsa",
        "steps": [
            {
                "stable_key": "arrays",
                "title": "Arrays",
                "topics": [
                    {
                        "stable_key": "prefix",
                        "title": "Prefix",
                        "items": [
                            {"stable_key": "learn", "title": "Learn", "kind": "concept"},
                            {"stable_key": "q1", "title": "First", "kind": "practice"},
                            {"stable_key": "q2", "title": "Second", "kind": "practice"},
                        ],
                    },
                    {
                        "stable_key": "matrix",
                        "title": "Matrix",
                        "items": [
                            {"stable_key": "q1", "title": "Third", "kind": "practice"},
                        ],
                    },
                ],
            }
        ],
    }


@pytest.fixture(params=["sqlite", "postgresql"])
def setup(request, monkeypatch):
    settings = get_settings()
    monkeypatch.setattr(settings, "cookie_secure", False)
    monkeypatch.setattr(settings, "frontend_origins", [ORIGIN])
    schema = None
    admin = None
    if request.param == "postgresql":
        url = os.environ.get("PROGRESS_TEST_DATABASE_URL")
        if not url:
            pytest.skip("Set PROGRESS_TEST_DATABASE_URL to test against PostgreSQL")
        admin = create_engine(url)
        schema = "test_" + uuid.uuid4().hex
        with admin.begin() as db:
            db.execute(text("CREATE SCHEMA " + schema))
        engine = create_engine(url, connect_args={"options": "-csearch_path=" + schema})
    else:
        engine = create_engine(
            "sqlite+pysqlite:///:memory:",
            poolclass=StaticPool,
            connect_args={"check_same_thread": False},
        )

        @event.listens_for(engine, "connect")
        def enforce_foreign_keys(connection, record):
            connection.execute("PRAGMA foreign_keys=ON")

    Base.metadata.create_all(engine)
    with Session(engine) as db:
        db.add(
            Sheet(id=str(uuid.uuid4()), slug="dsa", title="DSA", description="Learn", sort_order=1)
        )
        db.commit()
        revision = import_draft(db, SheetManifest.model_validate(manifest()))
        publish_revision(db, "dsa", revision)

    def database():
        with Session(engine) as db:
            yield db

    identity = {"nonce": "", "email": "student@example.com"}

    def verify(credential):
        if credential == "invalid":
            raise HTTPException(401, "Invalid Google credential")
        return {
            "sub": credential,
            "email": identity["email"],
            "name": "Student",
            "nonce": identity["nonce"],
        }

    app.dependency_overrides[get_db] = database
    monkeypatch.setattr(auth_api, "verify_google", verify)

    def login(client, sub="alice"):
        csrf = client.post("/api/v1/auth/csrf", headers={"Origin": ORIGIN})
        assert csrf.status_code == 200
        identity["nonce"] = csrf.json()["csrf_token"]
        response = client.post(
            "/api/v1/auth/google",
            json={"credential": sub},
            headers={"Origin": ORIGIN, "X-CSRF-Token": identity["nonce"]},
        )
        assert response.status_code == 200, response.text
        return {"Origin": ORIGIN, "X-CSRF-Token": response.json()["csrf_token"]}

    try:
        yield engine, login, identity
    finally:
        app.dependency_overrides.pop(get_db, None)
        engine.dispose()
        if admin and schema:
            with admin.begin() as db:
                db.execute(text("DROP SCHEMA " + schema + " CASCADE"))
            admin.dispose()


def test_private_progress_bulk_completion_and_notes_survive(setup):
    _, login, _ = setup
    with TestClient(app) as alice, TestClient(app) as bob:
        headers = login(alice)
        assert alice.get(ROOT).json()["total"] == 3
        notes = "My private approach <script>example</script>"
        assert alice.patch(QUESTION, json={"notes": notes}, headers=headers).status_code == 200
        result = alice.put(TOPIC, json={"completed": True}, headers=headers).json()
        assert result["completed"] == 2
        assert alice.get(QUESTION + "/notes").json()["notes"] == notes
        assert alice.put(TOPIC, json={"completed": True}, headers=headers).json()["completed"] == 2
        result = alice.patch(QUESTION, json={"completed": False}, headers=headers).json()
        assert result["completed"] == 1
        result = alice.put(TOPIC, json={"completed": False}, headers=headers).json()
        assert result["completed"] == 0
        assert alice.get(QUESTION + "/notes").json()["notes"] == notes
        assert any(row["has_notes"] for row in result["entries"])
        assert all("notes" not in row for row in result["entries"])
        login(bob, "bob")
        assert bob.get(ROOT).json()["entries"] == []
        assert bob.get(QUESTION + "/notes").json()["notes"] == ""
        assert alice.get(ROOT).json()["entries"] != []
        assert len(alice.get(ROOT).json()["question_keys"]) == 3


def test_csrf_ownership_validation_and_revocable_sessions(setup):
    engine, login, _ = setup
    with TestClient(app) as client:
        assert client.get(ROOT).status_code == 401
        headers = login(client)
        assert client.patch(QUESTION, json={"completed": True}).status_code == 403
        hostile = {**headers, "Origin": "https://hostile.example"}
        assert client.patch(QUESTION, json={"completed": True}, headers=hostile).status_code == 403
        assert (
            client.patch(QUESTION, json={"notes": "x" * 10001}, headers=headers).status_code == 422
        )
        assert client.patch(QUESTION, json={}, headers=headers).status_code == 422
        assert (
            client.patch(QUESTION, json={"completed": "true"}, headers=headers).status_code == 422
        )
        assert (
            client.patch(
                QUESTION.replace("q1", "learn"), json={"completed": True}, headers=headers
            ).status_code
            == 404
        )
        assert (
            client.patch(
                QUESTION.replace("prefix", "unknown"), json={"completed": True}, headers=headers
            ).status_code
            == 404
        )
        raw = client.cookies.get("twc_session")
        with Session(engine) as db:
            assert db.get(LoginSession, digest(raw)) is not None
            assert db.get(LoginSession, raw) is None
        assert client.post("/api/v1/auth/logout", headers=headers).status_code == 204
        client.cookies.set("twc_session", raw)
        assert client.get("/api/v1/auth/me").status_code == 401


def test_login_challenge_expiry_and_google_identity_not_email(setup):
    engine, login, identity = setup
    with TestClient(app) as client:
        assert (
            client.post(
                "/api/v1/auth/csrf", headers={"Origin": "https://hostile.example"}
            ).status_code
            == 403
        )
        challenge = client.post("/api/v1/auth/csrf", headers={"Origin": ORIGIN}).json()[
            "csrf_token"
        ]
        headers = {"Origin": ORIGIN, "X-CSRF-Token": challenge}
        assert (
            client.post(
                "/api/v1/auth/google", json={"credential": "alice"}, headers=headers
            ).status_code
            == 401
        )  # nonce mismatch
        assert (
            client.post(
                "/api/v1/auth/google", json={"credential": "invalid"}, headers=headers
            ).status_code
            == 401
        )
        login(client)
        alice_id = client.get("/api/v1/auth/me").json()["user"]["id"]
        identity["email"] = "changed@example.com"
        login(client)
        assert client.get("/api/v1/auth/me").json()["user"]["id"] == alice_id
        login(client, "bob")  # Same email, different Google identity is a different account.
        assert client.get("/api/v1/auth/me").json()["user"]["id"] != alice_id
        with Session(engine) as db:
            assert len(db.scalars(select(User)).all()) == 2
            session = db.get(LoginSession, digest(client.cookies.get("twc_session")))
            session.expires_at = int(time.time()) - 1
            db.commit()
        assert client.get(ROOT).status_code == 401


def test_progress_survives_sheet_revisions_and_counts_only_current_questions(setup):
    engine, login, _ = setup
    with TestClient(app) as client:
        headers = login(client)
        client.patch(QUESTION, json={"completed": True, "notes": "Remember this"}, headers=headers)
        data = manifest()
        data["steps"][0]["topics"].reverse()
        data["steps"][0]["topics"][1]["items"].append(
            {"stable_key": "q3", "title": "New question", "kind": "practice"}
        )
        with Session(engine) as db:
            rev = import_draft(db, SheetManifest.model_validate(data))
            publish_revision(db, "dsa", rev)
        progress = client.get(ROOT).json()
        assert progress["total"] == 4 and progress["completed"] == 1
        assert client.get(QUESTION + "/notes").json()["notes"] == "Remember this"
        data["steps"][0]["topics"][1]["items"] = [
            row for row in data["steps"][0]["topics"][1]["items"] if row["stable_key"] != "q1"
        ]
        with Session(engine) as db:
            rev = import_draft(db, SheetManifest.model_validate(data))
            publish_revision(db, "dsa", rev)
        progress = client.get(ROOT).json()
        assert progress["total"] == 3 and progress["completed"] == 0
        assert progress["entries"] == []


def test_database_failure_keeps_notes_private_and_previous_save_intact(setup, monkeypatch):
    from sqlalchemy.exc import StatementError

    from app.api import progress as progress_api

    _, login, _ = setup
    with TestClient(app) as client:
        headers = login(client)
        assert (
            client.patch(QUESTION, json={"notes": "Original"}, headers=headers).status_code == 200
        )

        def unavailable(*args, **kwargs):
            raise StatementError(
                "Database failed", "UPDATE question_states", {"notes": "PRIVATE"}, Exception()
            )

        monkeypatch.setattr(progress_api, "write_state", unavailable)
        response = client.patch(QUESTION, json={"notes": "PRIVATE"}, headers=headers)
        assert response.status_code == 503
        assert "PRIVATE" not in response.text
        assert "UPDATE" not in response.text
        assert client.get(QUESTION + "/notes").json()["notes"] == "Original"


def test_real_google_verifier_checks_signature_audience_issuer_expiry_and_verified_email(
    monkeypatch,
):
    from cryptography.hazmat.primitives import serialization
    from cryptography.hazmat.primitives.asymmetric import rsa
    from google.auth import crypt, jwt

    from app.core import auth

    private = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    pem = private.private_bytes(
        serialization.Encoding.PEM,
        serialization.PrivateFormat.PKCS8,
        serialization.NoEncryption(),
    )
    cert = (
        private.public_key()
        .public_bytes(serialization.Encoding.PEM, serialization.PublicFormat.SubjectPublicKeyInfo)
        .decode()
    )
    response = type(
        "CertResponse",
        (),
        {
            "status": 200,
            "data": json.dumps({"test": cert}).encode(),
        },
    )()
    monkeypatch.setattr(auth, "google_transport", lambda: lambda *args, **kwargs: response)
    monkeypatch.setattr(get_settings(), "google_client_id", "our-client")
    claims = {
        "iss": "https://accounts.google.com",
        "aud": "our-client",
        "iat": int(time.time()),
        "exp": int(time.time()) + 120,
        "sub": "alice",
        "email": "alice@example.com",
        "email_verified": True,
    }
    signer = crypt.RSASigner.from_string(pem)

    def token(values):
        return jwt.encode(signer, values, key_id="test").decode()

    assert auth.verify_google(token(claims))["sub"] == "alice"
    for change in [
        {"aud": "another-app"},
        {"iss": "https://hostile.example"},
        {"exp": int(time.time()) - 120},
        {"email_verified": False},
    ]:
        with pytest.raises(HTTPException) as failure:
            auth.verify_google(token({**claims, **change}))
        assert failure.value.status_code == 401
    encoded = token(claims)
    parts = encoded.split(".")
    parts[2] = ("A" if parts[2][0] != "A" else "B") + parts[2][1:]
    with pytest.raises(HTTPException):
        auth.verify_google(".".join(parts))
