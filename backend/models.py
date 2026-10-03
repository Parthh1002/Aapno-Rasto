"""
models.py - SQLAlchemy ORM models (maps Python classes → PostgreSQL tables)
These match exactly with the ComplaintRow and User interfaces in the frontend.
"""

import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Float, Integer, Boolean, Text,
    DateTime, ForeignKey, ARRAY
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from database import Base


class User(Base):
    __tablename__ = "users"

    id           = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    firebase_uid = Column(String(128), unique=True, nullable=True, index=True)  # Link to Firebase Auth
    name         = Column(String(255), nullable=False)
    email        = Column(String(255), unique=True, nullable=False, index=True)
    phone        = Column(String(20), nullable=True)
    role         = Column(String(50), default="citizen", nullable=False)  # citizen | engineer | admin
    points       = Column(Integer, default=0)
    avatar_url   = Column(Text, nullable=True)
    created_at   = Column(DateTime, default=datetime.utcnow)
    updated_at   = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationship: one user → many complaints
    complaints = relationship("Complaint", back_populates="user")


class Complaint(Base):
    __tablename__ = "complaints"

    id                     = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    user_id                = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    # Core fields
    category               = Column(String(100), nullable=False, index=True)
    sub_category           = Column(String(100), nullable=True)
    description            = Column(Text, nullable=False)
    status                 = Column(String(50), default="pending", nullable=False, index=True)
    urgency                = Column(String(20), nullable=True)   # low | medium | high

    # Location
    lat                    = Column(Float, nullable=False)
    lng                    = Column(Float, nullable=False)
    address                = Column(Text, nullable=True)

    # Images
    image_url              = Column(Text, nullable=True)
    resolution_image_url   = Column(Text, nullable=True)
    resolution_notes       = Column(Text, nullable=True)
    resolution_photos      = Column(ARRAY(Text), nullable=True)

    # Assignment
    assigned_to            = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    # Duplicate detection
    is_duplicate           = Column(Boolean, default=False)
    duplicate_type         = Column(String(50), nullable=True)
    master_issue_id        = Column(UUID(as_uuid=True), nullable=True)
    match_confidence       = Column(Float, nullable=True)
    matched_against_issue_id = Column(UUID(as_uuid=True), nullable=True)
    match_reason           = Column(ARRAY(Text), nullable=True)
    image_hash             = Column(String(64), nullable=True)

    # Engagement
    upvotes                = Column(Integer, default=0)
    location_mismatch      = Column(Boolean, default=False)
    points_awarded         = Column(Integer, nullable=True)

    # Timestamps
    created_at             = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at             = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    resolved_at            = Column(DateTime, nullable=True)

    # Relationship
    user = relationship("User", back_populates="complaints", foreign_keys=[user_id])
