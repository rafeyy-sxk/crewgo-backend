"""FastAPI application entry point.

This module creates and configures the FastAPI application with all routes,
middleware, exception handlers, and background tasks.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import auth, chat, crews, events, reels, users
from app.config import settings
from app.core.exceptions import register_exception_handlers
from app.core.logging import setup_logging, get_logger
from app.db.client import get_supabase_client
from app.tasks.scheduler import setup_scheduler, start_scheduler, stop_scheduler

# Setup logging
setup_logging()
logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager for startup and shutdown events."""
    # Startup
    logger.info("Starting Crewgo API...")

    # Setup scheduler
    setup_scheduler()
    start_scheduler()

    # Test database connection
    try:
        supabase = get_supabase_client()
        # Simple query to test connection
        supabase.table("users").select("id").limit(1).execute()
        logger.info("Database connection successful")
    except Exception as e:
        logger.error(f"Database connection failed: {str(e)}")
        # Don't fail startup, but log the error

    logger.info("Crewgo API started successfully")

    yield

    # Shutdown
    logger.info("Shutting down Crewgo API...")
    stop_scheduler()
    logger.info("Crewgo API shut down")


# Create FastAPI app
app = FastAPI(
    title="Crewgo API",
    description="Backend API for Crewgo - Local event discovery and AI-powered crew coordination",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS middleware
if settings.is_development:
    # Allow all origins in development
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    # Restrict origins in production
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "https://crewgo.pk",
            "https://www.crewgo.pk",
            "https://app.crewgo.pk",
        ],
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["*"],
    )

# Register exception handlers
register_exception_handlers(app)

# Include routers
app.include_router(auth.router, prefix="/api/v1")
app.include_router(users.router, prefix="/api/v1")
app.include_router(events.router, prefix="/api/v1")
app.include_router(crews.router, prefix="/api/v1")
app.include_router(chat.router, prefix="/api/v1")
app.include_router(reels.router, prefix="/api/v1")


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "crewgo-api",
        "version": "1.0.0",
    }


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "Welcome to Crewgo API",
        "docs": "/docs",
        "health": "/health",
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.is_development,
    )
