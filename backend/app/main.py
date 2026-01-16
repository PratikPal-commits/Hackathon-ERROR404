"""
FastAPI Application Entry Point.
Intelligent Student Attendance Verification System.
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import init_db, close_db
from app.routers import (
    auth_router,
    students_router,
    courses_router,
    sessions_router,
    attendance_router,
    analytics_router,
    anomalies_router,
)

# Configure logging
logging.basicConfig(
    level=logging.DEBUG if settings.debug else logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    # Startup
    logger.info("Starting up Attendance Verification System...")
    await init_db()
    logger.info("Database initialized successfully")

    yield

    # Shutdown
    logger.info("Shutting down...")
    await close_db()
    logger.info("Database connections closed")


# Create FastAPI application
app = FastAPI(
    title="Intelligent Student Attendance Verification System",
    description="""
    A smart, multi-factor attendance system designed to prevent proxy attendance using
    AI-based facial recognition, ID card validation, and fingerprint authentication.
    
    ## Features
    - Multi-factor verification (Face + ID + Fingerprint)
    - Proxy attendance prevention
    - Secure attendance storage
    - Faculty & Admin dashboards
    - Attendance analytics and anomaly detection
    
    ## Authentication
    All endpoints (except /auth/login and /auth/register) require JWT authentication.
    Include the token in the Authorization header: `Bearer <token>`
    
    ## Roles
    - **Student**: Can mark own attendance, view own records
    - **Faculty**: Can manage sessions, view course analytics
    - **Admin**: Full access to all features
    """,
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth_router)
app.include_router(students_router)
app.include_router(courses_router)
app.include_router(sessions_router)
app.include_router(attendance_router)
app.include_router(analytics_router)
app.include_router(anomalies_router)


@app.get("/", tags=["Health"])
async def root():
    """Root endpoint - API health check."""
    return {
        "message": "Intelligent Student Attendance Verification System",
        "version": "1.0.0",
        "status": "healthy",
        "docs": "/docs",
    }


@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "database": "connected", "version": "1.0.0"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=settings.debug)
