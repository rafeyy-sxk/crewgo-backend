"""Vercel serverless entry point for CrewGO FastAPI backend."""
import traceback
from fastapi import FastAPI
from fastapi.responses import JSONResponse

# Define app at module level so Vercel can always find it
app = FastAPI(title="CrewGO API")

_startup_error: str | None = None
_startup_traceback: str | None = None

try:
    from app.main import app  # overrides fallback if import succeeds
except Exception as exc:
    _startup_error = str(exc)
    _startup_traceback = traceback.format_exc()

    @app.api_route("/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"])
    async def startup_error(path: str = ""):
        return JSONResponse(
            status_code=500,
            content={
                "startup_error": _startup_error,
                "traceback": _startup_traceback,
            },
        )
