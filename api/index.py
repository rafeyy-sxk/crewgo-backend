"""Vercel serverless entry point for CrewGO FastAPI backend."""
import traceback
from fastapi import FastAPI
from fastapi.responses import JSONResponse

# Try to import the real app, expose error if it fails
try:
    from app.main import app
except Exception as e:
    # Create a minimal app that reports the startup error
    app = FastAPI()

    _error = traceback.format_exc()

    @app.get("/{path:path}")
    @app.post("/{path:path}")
    async def error_handler(path: str):
        return JSONResponse(
            status_code=500,
            content={"startup_error": str(e), "traceback": _error},
        )
