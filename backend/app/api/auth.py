import secrets
import time
import uuid

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, Field
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.core.auth import (
    check_origin,
    current_session,
    digest,
    protected_session,
    verify_google,
)
from app.core.config import get_settings
from app.db.session import get_db
from app.db.upsert import insert_for
from app.models import LoginSession, User

router = APIRouter(prefix="/auth", tags=["accounts"])


class GoogleLogin(BaseModel):
    credential: str = Field(min_length=1, max_length=8192)


def cookie(response: Response, name: str, value: str, age: int) -> None:
    response.set_cookie(
        name,
        value,
        max_age=age,
        secure=get_settings().cookie_secure,
        httponly=True,
        samesite="lax",
        path="/",
    )
    response.headers["Cache-Control"] = "no-store"


def account(db: Session, session: LoginSession, csrf: str) -> dict:
    user = db.get(User, session.user_id)
    if user is None:
        raise HTTPException(401, "Please sign in again")
    return {"user": {"id": user.id, "name": user.name, "email": user.email}, "csrf_token": csrf}


@router.post("/csrf")
def csrf_challenge(request: Request, response: Response) -> dict:
    check_origin(request)
    csrf = secrets.token_urlsafe(32)
    cookie(response, get_settings().csrf_cookie, csrf, 600)
    return {"csrf_token": csrf}


@router.post("/google")
def google_login(
    payload: GoogleLogin,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
) -> dict:
    check_origin(request)
    settings = get_settings()
    csrf = request.headers.get("x-csrf-token", "")
    stored_csrf = request.cookies.get(settings.csrf_cookie, "")
    if not csrf or not stored_csrf or not secrets.compare_digest(csrf, stored_csrf):
        raise HTTPException(403, "Invalid sign-in challenge; please retry")
    claims = verify_google(payload.credential)
    if claims.get("nonce") != csrf:
        raise HTTPException(401, "Google sign-in challenge does not match")
    stmt = insert_for(db, User).values(
        id=str(uuid.uuid4()),
        google_sub=claims["sub"],
        email=claims["email"],
        name=str(claims.get("name") or claims["email"])[:160],
    )
    db.execute(
        stmt.on_conflict_do_update(
            index_elements=["google_sub"],
            set_={"email": stmt.excluded.email, "name": stmt.excluded.name},
        )
    )
    user = db.scalar(select(User).where(User.google_sub == claims["sub"]))
    now = int(time.time())
    db.execute(delete(LoginSession).where(LoginSession.expires_at <= now))
    previous = request.cookies.get(settings.session_cookie)
    if previous:
        db.execute(delete(LoginSession).where(LoginSession.token_hash == digest(previous)))
    token, next_csrf = secrets.token_urlsafe(32), secrets.token_urlsafe(32)
    age = max(1, min(settings.session_days, 30)) * 86400
    session = LoginSession(
        token_hash=digest(token),
        user_id=user.id,
        csrf_hash=digest(next_csrf),
        expires_at=now + age,
    )
    db.add(session)
    db.commit()
    cookie(response, settings.session_cookie, token, age)
    cookie(response, settings.csrf_cookie, next_csrf, age)
    return account(db, session, next_csrf)


@router.get("/me")
def me(
    request: Request,
    response: Response,
    session: LoginSession = Depends(current_session),
    db: Session = Depends(get_db),
) -> dict:
    response.headers["Cache-Control"] = "no-store"
    csrf = request.cookies.get(get_settings().csrf_cookie, "")
    if not csrf or not secrets.compare_digest(digest(csrf), session.csrf_hash):
        raise HTTPException(401, "Please sign in again")
    return account(db, session, csrf)


@router.post("/logout", status_code=204)
def logout(
    response: Response,
    session: LoginSession = Depends(protected_session),
    db: Session = Depends(get_db),
) -> None:
    db.delete(session)
    db.commit()
    for name in (get_settings().session_cookie, get_settings().csrf_cookie):
        response.delete_cookie(
            name, path="/", secure=get_settings().cookie_secure, httponly=True, samesite="lax"
        )
    response.headers["Cache-Control"] = "no-store"
