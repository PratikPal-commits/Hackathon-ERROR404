"""
Anomaly schemas.
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class AnomalyLogResponse(BaseModel):
    """Anomaly log response schema."""

    id: int
    student_id: Optional[int] = None
    session_id: Optional[int] = None
    anomaly_type: str
    severity: str
    reason: str
    details: Optional[str] = None
    is_resolved: bool
    resolved_by: Optional[int] = None
    resolution_notes: Optional[str] = None
    resolved_at: Optional[datetime] = None
    attempt_time: datetime
    ip_address: Optional[str] = None
    device_info: Optional[str] = None
    created_at: datetime

    # Optional related info
    student_name: Optional[str] = None
    student_roll_no: Optional[str] = None
    session_date: Optional[str] = None
    course_name: Optional[str] = None

    model_config = {"from_attributes": True}


class AnomalyLogListResponse(BaseModel):
    """Paginated anomaly log list response."""

    anomalies: list[AnomalyLogResponse]
    total: int
    page: int
    page_size: int
    total_pages: int

    # Summary stats
    total_unresolved: int
    critical_count: int
    high_count: int


class AnomalyResolve(BaseModel):
    """Resolve anomaly request schema."""

    resolution_notes: str = Field(..., min_length=1)


class AnomalyStats(BaseModel):
    """Anomaly statistics."""

    total_anomalies: int
    unresolved: int
    resolved: int
    by_type: dict[str, int]
    by_severity: dict[str, int]
    recent_24h: int


class AnomalyFilter(BaseModel):
    """Anomaly filter parameters."""

    student_id: Optional[int] = None
    session_id: Optional[int] = None
    anomaly_type: Optional[str] = None
    severity: Optional[str] = None
    is_resolved: Optional[bool] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
