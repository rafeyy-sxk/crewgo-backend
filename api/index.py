"""Vercel serverless entry point for CrewGO FastAPI backend."""
from app.main import app  # noqa: F401 — Vercel picks up `app` via ASGI
