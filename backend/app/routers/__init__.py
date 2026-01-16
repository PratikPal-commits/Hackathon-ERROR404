"""
Routers package initialization.
"""

from app.routers.auth import router as auth_router
from app.routers.students import router as students_router
from app.routers.courses import router as courses_router
from app.routers.sessions import router as sessions_router
from app.routers.attendance import router as attendance_router
from app.routers.analytics import router as analytics_router
from app.routers.anomalies import router as anomalies_router

__all__ = [
    "auth_router",
    "students_router",
    "courses_router",
    "sessions_router",
    "attendance_router",
    "analytics_router",
    "anomalies_router",
]
