from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from app.api.auth import router as auth_router
from app.api.progress import router as progress_router
from app.api.sheets import router as sheets_router
from app.core.config import get_settings
from app.db.session import engine

app = FastAPI(title="Study Sheets API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=get_settings().frontend_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "PUT"],
    allow_headers=["Content-Type", "X-CSRF-Token"],
)
app.include_router(sheets_router, prefix="/api/v1")
app.include_router(auth_router, prefix="/api/v1")
app.include_router(progress_router, prefix="/api/v1")


@app.exception_handler(SQLAlchemyError)
async def database_error(request, exc) -> JSONResponse:
    # Do not expose or log SQL parameters, which may contain private notes.
    return JSONResponse(
        status_code=503,
        content={"detail": "Service temporarily unavailable. Please retry."},
        headers={"Cache-Control": "no-store"},
    )


@app.get("/api/v1/health/live", tags=["health"])
def live() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/v1/health/ready", tags=["health"])
def ready() -> dict[str, str]:
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
    except SQLAlchemyError as exc:
        raise HTTPException(status_code=503, detail="Database unavailable") from exc
    return {"status": "ok"}
