from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import math
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Gujarat Connect Backend API", description="AI and Backend services for Gujarat Connect")

# Allow CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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

def haversine_distance(coord1: Coordinate, coord2: Coordinate) -> float:
    # Earth radius in meters
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

@app.post("/api/complaints/group")
def group_complaints(req: GroupRequest):
    """
    Groups complaints together if they are within `radius_meters` of each other
    and have the same category. Used to detect duplicates.
    """
    groups = []
    visited = set()

    for i, c1 in enumerate(req.complaints):
        if c1.id in visited:
            continue
            
        # Start a new group
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
                "approx_location": c1.location
            })

    return {"groups": groups}

class ImageCompareRequest(BaseModel):
    image1_url: str
    image2_url: str

@app.post("/api/images/compare")
def compare_images(req: ImageCompareRequest):
    """
    Dummy endpoint for image comparison and recommendation logic.
    In a real scenario, this would use a ResNet or structural similarity model
    to detect if two complaint images show the same physical pothole/issue.
    """
    # Dummy similarity score
    import random
    similarity_score = random.uniform(0.5, 0.99)
    is_duplicate = similarity_score > 0.85
    
    return {
        "similarity_score": round(similarity_score, 4),
        "is_duplicate": is_duplicate,
        "recommendation": "Merge complaints" if is_duplicate else "Keep separate"
    }

@app.get("/health")
def health_check():
    return {"status": "ok", "message": "Backend is running smoothly."}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
