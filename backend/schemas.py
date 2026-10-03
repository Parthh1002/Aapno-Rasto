"""
schemas.py - Pydantic schemas for request/response validation
Separates DB models (SQLAlchemy) from API contracts (Pydantic)
"""

from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional
from datetime import datetime
import uuid


# ─── User Schemas ─────────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    firebase_uid: Optional[str] = None
    name: str
    email: str
    phone: Optional[str] = None
    role: str = "citizen"

class UserResponse(BaseModel):
    id: uuid.UUID
    firebase_uid: Optional[str]
    name: str
    email: str
    phone: Optional[str]
    role: str
    points: int
    avatar_url: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True  # Allows converting SQLAlchemy model → Pydantic


# ─── Complaint Schemas ────────────────────────────────────────────────────────

class ComplaintCreate(BaseModel):
    user_id: Optional[uuid.UUID] = None
    category: str
    sub_category: Optional[str] = None
    description: str
    lat: float
    lng: float
    address: Optional[str] = None
    image_url: Optional[str] = None
    urgency: Optional[str] = None  # low | medium | high

class ComplaintStatusUpdate(BaseModel):
    status: str  # pending | in_progress | completed | rejected
    urgency: Optional[str] = None
    resolution_notes: Optional[str] = None
    resolution_image_url: Optional[str] = None

class ComplaintAssign(BaseModel):
    engineer_id: uuid.UUID

class ComplaintDuplicateUpdate(BaseModel):
    is_duplicate: bool
    duplicate_type: Optional[str] = None
    master_issue_id: Optional[uuid.UUID] = None
    match_confidence: Optional[float] = None
    match_reason: Optional[List[str]] = None

class ComplaintResponse(BaseModel):
    id: uuid.UUID
    user_id: Optional[uuid.UUID]
    category: str
    sub_category: Optional[str]
    description: str
    status: str
    urgency: Optional[str]
    lat: float
    lng: float
    address: Optional[str]
    image_url: Optional[str]
    resolution_image_url: Optional[str]
    resolution_notes: Optional[str]
    resolution_photos: Optional[List[str]]
    assigned_to: Optional[uuid.UUID]
    is_duplicate: Optional[bool]
    duplicate_type: Optional[str]
    master_issue_id: Optional[uuid.UUID]
    match_confidence: Optional[float]
    matched_against_issue_id: Optional[uuid.UUID]
    match_reason: Optional[List[str]]
    image_hash: Optional[str]
    upvotes: int
    location_mismatch: Optional[bool]
    points_awarded: Optional[int]
    created_at: datetime
    updated_at: Optional[datetime]
    resolved_at: Optional[datetime]

    class Config:
        from_attributes = True


# ─── Grouping/AI Schemas (existing endpoints) ─────────────────────────────────

class Coordinate(BaseModel):
    lat: float
    lng: float

class ComplaintData(BaseModel):
    id: str
    category: str
    location: Coordinate
    description: Optional[str] = None

class GroupRequest(BaseModel):
    complaints: List[ComplaintData]
    radius_meters: Optional[float] = 50.0

class ImageCompareRequest(BaseModel):
    image1_url: str
    image2_url: str
