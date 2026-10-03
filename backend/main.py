"""
main.py - FastAPI Application
Aapno Rasto Backend — PostgreSQL (Neon.tech) powered REST API
Replaces: Supabase client calls from the frontend
"""

import math
import random
import os
from contextlib import asynccontextmanager
from datetime import datetime
from typing import List, Optional
from dotenv import load_dotenv

from fastapi import FastAPI, HTTPException, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import desc

# Local modules
from database import get_db, check_db_connection, Base, engine
import models
import schemas

load_dotenv()

# ─── App Init ─────────────────────────────────────────────────────────────────

# ─── Lifespan: Create Tables & Check DB ──────────────────────────────────────

@asynccontextmanager
async def lifespan(app):
    # Startup: auto-create all tables, verify DB connection
    Base.metadata.create_all(bind=engine)
    ok = check_db_connection()
    if ok:
        print("✅ Connected to PostgreSQL (Neon.tech)")
    else:
        print("❌ Could NOT connect to PostgreSQL — check DATABASE_URL in .env")
    yield
    # Shutdown: nothing to clean up

app = FastAPI(
    title="Aapno Rasto API",
    description="Backend API for Aapno Rasto — Civic Issue Reporting Platform",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# ─── CORS Middleware ──────────────────────────────────────────────────────────

allowed_origins = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:5173,http://localhost:3000"
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins + ["*"],  # "*" allows mobile apps too
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Startup: Create Tables & Check DB ────────────────────────────────────────

@app.on_event("startup")
def startup():
    # Auto-creates all tables defined in models.py if they don't exist
    Base.metadata.create_all(bind=engine)
    ok = check_db_connection()
    if ok:
        print("✅ Connected to PostgreSQL (Neon.tech)")
    else:
        print("❌ Could NOT connect to PostgreSQL — check DATABASE_URL in .env")


# ═════════════════════════════════════════════════════════════════════════════
# HEALTH CHECK
# ═════════════════════════════════════════════════════════════════════════════

@app.get("/health", tags=["System"])
def health_check(db: Session = Depends(get_db)):
    try:
        db.execute(models.User.__table__.select().limit(1))
        db_status = "connected"
    except Exception:
        db_status = "error"
    return {
        "status": "ok",
        "message": "Aapno Rasto backend is running",
        "database": db_status,
        "version": "2.0.0"
    }


# ═════════════════════════════════════════════════════════════════════════════
# USERS
# ═════════════════════════════════════════════════════════════════════════════

@app.post("/api/users", response_model=schemas.UserResponse, tags=["Users"])
def create_or_get_user(data: schemas.UserCreate, db: Session = Depends(get_db)):
    """
    Create a new user OR return existing one (upsert by email).
    Call this right after Firebase Auth login.
    """
    # Check if user already exists
    existing = db.query(models.User).filter(models.User.email == data.email).first()
    if existing:
        # Update firebase_uid if missing
        if data.firebase_uid and not existing.firebase_uid:
            existing.firebase_uid = data.firebase_uid
            db.commit()
            db.refresh(existing)
        return existing

    user = models.User(**data.model_dump())
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@app.get("/api/users/{user_id}", response_model=schemas.UserResponse, tags=["Users"])
def get_user(user_id: str, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@app.get("/api/users/by-email/{email}", response_model=schemas.UserResponse, tags=["Users"])
def get_user_by_email(email: str, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


# ═════════════════════════════════════════════════════════════════════════════
# COMPLAINTS — CRUD
# ═════════════════════════════════════════════════════════════════════════════

@app.get("/api/complaints", response_model=List[schemas.ComplaintResponse], tags=["Complaints"])
def get_all_complaints(
    status: Optional[str] = Query(None, description="Filter by status: pending|in_progress|completed|rejected"),
    category: Optional[str] = Query(None),
    limit: int = Query(100, le=500),
    offset: int = Query(0),
    db: Session = Depends(get_db)
):
    """Fetch all complaints. Supports filtering by status/category and pagination."""
    q = db.query(models.Complaint)
    if status:
        q = q.filter(models.Complaint.status == status)
    if category:
        q = q.filter(models.Complaint.category == category)
    return q.order_by(desc(models.Complaint.created_at)).offset(offset).limit(limit).all()


@app.get("/api/complaints/user/{user_id}", response_model=List[schemas.ComplaintResponse], tags=["Complaints"])
def get_user_complaints(user_id: str, db: Session = Depends(get_db)):
    """Fetch all complaints filed by a specific user."""
    return (
        db.query(models.Complaint)
        .filter(models.Complaint.user_id == user_id)
        .order_by(desc(models.Complaint.created_at))
        .all()
    )


@app.get("/api/complaints/{complaint_id}", response_model=schemas.ComplaintResponse, tags=["Complaints"])
def get_complaint(complaint_id: str, db: Session = Depends(get_db)):
    """Get a single complaint by ID."""
    c = db.query(models.Complaint).filter(models.Complaint.id == complaint_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Complaint not found")
    return c


@app.post("/api/complaints", response_model=schemas.ComplaintResponse, tags=["Complaints"])
def create_complaint(data: schemas.ComplaintCreate, db: Session = Depends(get_db)):
    """
    Submit a new civic complaint.
    Replaces: addDoc(collection(db, 'complaints'), ...)
    """
    complaint = models.Complaint(**data.model_dump())
    db.add(complaint)
    db.commit()
    db.refresh(complaint)
    return complaint


@app.put("/api/complaints/{complaint_id}/status", response_model=schemas.ComplaintResponse, tags=["Complaints"])
def update_complaint_status(
    complaint_id: str,
    data: schemas.ComplaintStatusUpdate,
    db: Session = Depends(get_db)
):
    """
    Update complaint status (pending → in_progress → completed/rejected).
    Replaces: updateDoc(doc(db, 'complaints', id), ...)
    """
    c = db.query(models.Complaint).filter(models.Complaint.id == complaint_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Complaint not found")

    c.status = data.status
    c.updated_at = datetime.utcnow()

    if data.urgency:
        c.urgency = data.urgency
    if data.resolution_notes:
        c.resolution_notes = data.resolution_notes
    if data.resolution_image_url:
        c.resolution_image_url = data.resolution_image_url
    if data.status == "completed":
        c.resolved_at = datetime.utcnow()
        c.points_awarded = 10
        # Award points to user
        if c.user_id:
            user = db.query(models.User).filter(models.User.id == c.user_id).first()
            if user:
                user.points = (user.points or 0) + 10

    db.commit()
    db.refresh(c)
    return c


@app.put("/api/complaints/{complaint_id}/assign", response_model=schemas.ComplaintResponse, tags=["Complaints"])
def assign_complaint(complaint_id: str, data: schemas.ComplaintAssign, db: Session = Depends(get_db)):
    """Assign a complaint to an engineer."""
    c = db.query(models.Complaint).filter(models.Complaint.id == complaint_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Complaint not found")
    c.assigned_to = data.engineer_id
    c.status = "in_progress"
    c.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(c)
    return c


@app.put("/api/complaints/{complaint_id}/upvote", tags=["Complaints"])
def upvote_complaint(complaint_id: str, db: Session = Depends(get_db)):
    """Upvote a complaint to increase its priority."""
    c = db.query(models.Complaint).filter(models.Complaint.id == complaint_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Complaint not found")
    c.upvotes = (c.upvotes or 0) + 1
    db.commit()
    return {"id": str(c.id), "upvotes": c.upvotes}


@app.put("/api/complaints/{complaint_id}/duplicate", response_model=schemas.ComplaintResponse, tags=["Complaints"])
def mark_duplicate(complaint_id: str, data: schemas.ComplaintDuplicateUpdate, db: Session = Depends(get_db)):
    """Mark a complaint as duplicate (used by the AI grouping service)."""
    c = db.query(models.Complaint).filter(models.Complaint.id == complaint_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Complaint not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(c, field, value)
    c.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(c)
    return c


@app.delete("/api/complaints/{complaint_id}", tags=["Complaints"])
def delete_complaint(complaint_id: str, db: Session = Depends(get_db)):
    """Delete a complaint (admin only)."""
    c = db.query(models.Complaint).filter(models.Complaint.id == complaint_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Complaint not found")
    db.delete(c)
    db.commit()
    return {"message": "Complaint deleted successfully", "id": complaint_id}


# ═════════════════════════════════════════════════════════════════════════════
# AI / ANALYTICS — (existing logic kept intact)
# ═════════════════════════════════════════════════════════════════════════════

def haversine_distance(coord1: schemas.Coordinate, coord2: schemas.Coordinate) -> float:
    R = 6371e3
    phi1 = math.radians(coord1.lat)
    phi2 = math.radians(coord2.lat)
    delta_phi = math.radians(coord2.lat - coord1.lat)
    delta_lambda = math.radians(coord2.lng - coord1.lng)
    a = math.sin(delta_phi / 2.0) ** 2 + \
        math.cos(phi1) * math.cos(phi2) * \
        math.sin(delta_lambda / 2.0) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


@app.post("/api/complaints/group", tags=["AI"])
def group_complaints(req: schemas.GroupRequest):
    """
    Groups nearby complaints of the same category to detect duplicates.
    (AI service — no DB needed, pure computation)
    """
    groups = []
    visited = set()
    for i, c1 in enumerate(req.complaints):
        if c1.id in visited:
            continue
        current_group = [c1.id]
        visited.add(c1.id)
        for j, c2 in enumerate(req.complaints):
            if i != j and c2.id not in visited and c1.category == c2.category:
                distance = haversine_distance(c1.location, c2.location)
                if distance <= req.radius_meters:
                    current_group.append(c2.id)
                    visited.add(c2.id)
        if len(current_group) > 1:
            groups.append({
                "master_id": current_group[0],
                "duplicate_ids": current_group[1:],
                "category": c1.category,
                "approx_location": c1.location,
            })
    return {"groups": groups}


@app.post("/api/images/compare", tags=["AI"])
def compare_images(req: schemas.ImageCompareRequest):
    """
    Image similarity check for duplicate complaint detection.
    (Stub — replace with real CV model in production)
    """
    similarity_score = random.uniform(0.5, 0.99)
    is_duplicate = similarity_score > 0.85
    return {
        "similarity_score": round(similarity_score, 4),
        "is_duplicate": is_duplicate,
        "recommendation": "Merge complaints" if is_duplicate else "Keep separate",
    }


# ─── Entry Point ──────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
