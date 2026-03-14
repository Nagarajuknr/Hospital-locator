# backend/src/routers/hospitals.py
# Replace your existing hospitals.py with this file.
# Only change from previous version: /fetch-google replaced with /fetch-osm

from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional
from ..database import get_db
from ..models import Specialty, HospitalSpecialty
from ..services.hospital_service import (
    get_nearby_hospitals, get_hospital_detail,
    search_hospitals_by_name,
)

router = APIRouter()


# GET /api/hospitals/specialties/all
@router.get("/specialties/all")
async def list_specialties(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Specialty).order_by(Specialty.name))
    specs  = result.scalars().all()
    return {"specialties": [{"id": s.id, "name": s.name, "icon": s.icon} for s in specs]}


# GET /api/hospitals/nearby
@router.get("/nearby")
async def nearby_hospitals(
    lat:       float          = Query(...,  description="Latitude  e.g. 13.0827"),
    lng:       float          = Query(...,  description="Longitude e.g. 80.2707"),
    radius:    float          = Query(10.0, description="Radius in km"),
    specialty: Optional[str]  = Query(None),
    emergency: Optional[bool] = Query(None),
    limit:     int            = Query(20),
    db: AsyncSession = Depends(get_db),
):
    hospitals = await get_nearby_hospitals(db, lat, lng, radius, specialty, emergency, limit)
    return {"count": len(hospitals), "hospitals": hospitals,
            "center": {"lat": lat, "lng": lng}, "radius_km": radius}


# GET /api/hospitals/search
@router.get("/search")
async def search_hospitals(
    q:    str           = Query(..., min_length=2),
    city: Optional[str] = Query(None),
    db: AsyncSession    = Depends(get_db),
):
    hospitals = await search_hospitals_by_name(db, q, city)
    return {
        "count": len(hospitals),
        "hospitals": [
            {"id": h.id, "name": h.name, "city": h.city,
             "address": h.address, "phone": h.phone,
             "latitude": h.latitude, "longitude": h.longitude,
             "emergency_available": h.emergency_available,
             "google_rating": h.google_rating}
            for h in hospitals
        ]
    }


# POST /api/hospitals/fetch-osm?city=Chennai
# Fetches real hospitals from OpenStreetMap — 100% free, no API key needed
@router.post("/fetch-osm")
async def fetch_osm_hospitals(
    city: Optional[str] = Query(None, description="Specific city, or leave empty for all cities"),
    db: AsyncSession = Depends(get_db),
):
    """
    Pulls real hospital data from OpenStreetMap (Overpass API).
    Completely free — no API key, no account, no credit card.
    Leave city empty to fetch Chennai, Coimbatore, Madurai, Salem, Trichy all at once.
    """
    from ..services.osm_service import fetch_all_cities, fetch_city, save_to_database
    import httpx

    if city:
        # Fetch just one city
        city_configs = {
            "Chennai":    {"name": "Chennai",    "lat": 13.0827, "lng": 80.2707, "radius": 25000},
            "Coimbatore": {"name": "Coimbatore", "lat": 11.0168, "lng": 76.9558, "radius": 20000},
            "Madurai":    {"name": "Madurai",    "lat": 9.9252,  "lng": 78.1198, "radius": 20000},
            "Salem":      {"name": "Salem",      "lat": 11.6643, "lng": 78.1460, "radius": 15000},
            "Trichy":     {"name": "Trichy",     "lat": 10.7905, "lng": 78.7047, "radius": 15000},
        }
        cfg = city_configs.get(city)
        if not cfg:
            raise HTTPException(status_code=400,
                detail=f"Unknown city. Valid: {list(city_configs.keys())}")
        async with httpx.AsyncClient() as client:
            hospitals = await fetch_city(cfg, client)
        added = await save_to_database(hospitals)
        return {"message": f"Fetched {city} from OpenStreetMap",
                "found": len(hospitals), "added_to_db": added}
    else:
        # Fetch all cities
        added = await fetch_all_cities()
        return {"message": "Fetched all Tamil Nadu cities from OpenStreetMap",
                "added_to_db": added}


# GET /api/hospitals/{id}
@router.get("/{hospital_id}")
async def hospital_detail(hospital_id: str, db: AsyncSession = Depends(get_db)):
    h = await get_hospital_detail(db, hospital_id)
    if not h:
        raise HTTPException(status_code=404, detail="Hospital not found")

    specs = [
        {"name": hs.specialty.name, "icon": hs.specialty.icon,
         "doctor_count": hs.doctor_count}
        for hs in h.specialties if hs.specialty
    ]
    doctors = [
        {"id": d.id, "name": d.name, "qualification": d.qualification,
         "experience_years": d.experience_years,
         "consultation_fee": d.consultation_fee,
         "available_days": d.available_days,
         "is_available": d.is_available}
        for d in h.doctors
    ]
    blood = None
    if h.blood_availability:
        b = h.blood_availability
        blood = {"A+": b.a_pos, "A-": b.a_neg, "B+": b.b_pos, "B-": b.b_neg,
                 "AB+": b.ab_pos, "AB-": b.ab_neg, "O+": b.o_pos, "O-": b.o_neg}

    return {
        "id": h.id, "name": h.name, "type": h.type,
        "address": h.address, "city": h.city, "state": h.state,
        "pincode": h.pincode, "phone": h.phone, "email": h.email,
        "website": h.website, "latitude": h.latitude, "longitude": h.longitude,
        "emergency_available": h.emergency_available,
        "ambulance_available": h.ambulance_available,
        "icu_beds": h.icu_beds, "total_beds": h.total_beds,
        "opd_timing": h.opd_timing, "google_rating": h.google_rating,
        "total_reviews": h.total_reviews, "is_verified": h.is_verified,
        "specialties": specs, "doctors": doctors, "blood_availability": blood,
    }