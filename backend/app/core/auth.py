import hashlib
import secrets
import time
from functools import lru_cache

from fastapi import Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.session import get_db
from app.models import LoginSession


def digest(value: str) -> str:
    return hashlib.sha256(value.encode()).hexdigest()


def check_origin(request: Request) -> None:
    if request.headers.get("origin") not in get_settings().frontend_origins:
        raise HTTPException(403, "Request origin is not allowed")


def current_session(request: Request, db: Session = Depends(get_db)) -> LoginSession:
    token = request.cookies.get(get_settings().session_cookie, "")
    session = db.get(LoginSession, digest(token)) if token else None
    if session is None or session.expires_at <= int(time.time()):
        raise HTTPException(401, "Please sign in again")
    return session


def protected_session(
    request: Request, session: LoginSession = Depends(current_session)
) -> LoginSession:
    check_origin(request)
    csrf = request.headers.get("x-csrf-token", "")
    if not csrf or not secrets.compare_digest(digest(csrf), session.csrf_hash):
        raise HTTPException(403, "Invalid CSRF token")
    return session


@lru_cache
def google_transport():
    from cachecontrol import CacheControl
    from google.auth.transport.requests import Request as GoogleRequest
    from requests import Session as RequestsSession

    class BoundedRequest(GoogleRequest):
        def __call__(self, *args, **kwargs):
            kwargs["timeout"] = 10
            return super().__call__(*args, **kwargs)

    return BoundedRequest(session=CacheControl(RequestsSession()))


def verify_google(credential: str) -> dict:
    from google.auth.exceptions import GoogleAuthError, TransportError
    from google.oauth2.id_token import verify_oauth2_token

    settings = get_settings()
    if not settings.google_client_id:
        raise HTTPException(503, "Google sign-in is not configured yet")
    try:
        claims = verify_oauth2_token(credential, google_transport(), settings.google_client_id)
    except TransportError as exc:
        raise HTTPException(503, "Google verification unavailable; please retry") from exc
    except (ValueError, GoogleAuthError, KeyError) as exc:
        raise HTTPException(401, "Invalid Google credential") from exc
    if (
        not isinstance(claims.get("sub"), str)
        or not claims["sub"]
        or len(claims["sub"]) > 255
        or not isinstance(claims.get("email"), str)
        or not claims["email"]
        or len(claims["email"]) > 320
        or claims.get("email_verified") is not True
    ):
        raise HTTPException(401, "A verified Google account is required")
    return claims
