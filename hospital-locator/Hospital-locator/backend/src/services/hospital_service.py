# backend/src/services/hospital_service.py
# Business logic for hospital search.
# Uses Google Maps Places API as an ALTERNATIVE to ABDM for finding hospitals.
#
# WHY GOOGLE MAPS INSTEAD OF ABDM:
# - Google Maps Places API is free (200 USD credit/month ≈ 5000 searches free)
# - Returns GPS coordinates, ratings, photos, phone numbers
# - Works immediately — no approval process
# - Get key: console.cloud.google.com → Enable "Places API" → Create credential

import httpx
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text, select
from sqlalchemy.orm import selectinload
from ..models import Hospital, HospitalSpecialty, Specialty, HospitalType
from ..config import settings

# ── Nearby search using Haversine in PostgreSQL ────────────
async def get_nearby_hospitals(
    db:        AsyncSession,
    lat:       float,
    lng:       float,
    radius_km: float  = 10.0,
    specialty: str    = None,
    emergency: bool   = None,
    limit:     int    = 20,
) -> list:
    distance_expr = """
        (6371 * acos(LEAST(1.0,
            cos(radians(:lat)) * cos(radians(h.latitude))
            * cos(radians(h.longitude) - radians(:lng))
            + sin(radians(:lat)) * sin(radians(h.latitude))
        )))
    """
    where = [
        "h.is_active = true",
        "h.latitude  IS NOT NULL",
        f"{distance_expr} <= :radius",
    ]
    if emergency:
        where.append("h.emergency_available = true")

    spec_join = ""
    if specialty:
        spec_join = """
            JOIN hospital_specialties hs ON hs.hospital_id = h.id
            JOIN specialties s ON s.id = hs.specialty_id
        """
        where.append("LOWER(s.name) = LOWER(:specialty)")

    sql = text(f"""
        SELECT h.id, h.name, h.type, h.address, h.city, h.phone,
               h.latitude, h.longitude,
               h.emergency_available, h.ambulance_available,
               h.icu_beds, h.total_beds, h.opd_timing,
               h.google_rating, h.total_reviews, h.is_verified,
               ROUND(({distance_expr})::numeric, 2) AS distance_km
        FROM hospitals h
        {spec_join}
        WHERE {" AND ".join(where)}
        ORDER BY distance_km ASC
        LIMIT :limit
    """)

    params = {"lat": lat, "lng": lng, "radius": radius_km, "limit": limit}
    if specialty:
        params["specialty"] = specialty

    result = await db.execute(sql, params)
    return [dict(r) for r in result.mappings().all()]


# ── Get full hospital detail ───────────────────────────────
async def get_hospital_detail(db: AsyncSession, hospital_id: str):
    result = await db.execute(
        select(Hospital)
        .options(
            selectinload(Hospital.specialties).selectinload(HospitalSpecialty.specialty),
            selectinload(Hospital.doctors),
            selectinload(Hospital.blood_availability),
        )
        .where(Hospital.id == hospital_id, Hospital.is_active == True)
    )
    return result.scalar_one_or_none()


# ── Search by name ─────────────────────────────────────────
async def search_hospitals_by_name(db: AsyncSession, query: str, city: str = None):
    stmt = select(Hospital).where(
        Hospital.is_active == True,
        Hospital.name.ilike(f"%{query}%")
    )
    if city:
        stmt = stmt.where(Hospital.city.ilike(f"%{city}%"))
    result = await db.execute(stmt.limit(20))
    return result.scalars().all()


# ── Fetch from Google Maps and save to DB ─────────────────
async def fetch_from_google_maps(city: str, db: AsyncSession) -> int:
    """
    Calls Google Maps Places API to find hospitals in a city.
    Saves new hospitals to the database.
    Returns count of new hospitals added.

    Requires GOOGLE_MAPS_API_KEY in .env
    Get free key: console.cloud.google.com → Places API → Create Key
    Free quota: ~5000 requests/month
    """
    if not settings.GOOGLE_MAPS_API_KEY:
        return 0

    added = 0
    url   = "https://maps.googleapis.com/maps/api/place/textsearch/json"

    async with httpx.AsyncClient() as client:
        resp = await client.get(url, params={
            "query": f"hospitals in {city} Tamil Nadu India",
            "key":   settings.GOOGLE_MAPS_API_KEY,
            "type":  "hospital",
        }, timeout=15.0)

        data = resp.json()
        for place in data.get("results", []):
            name = place.get("name", "")
            if not name:
                continue

            # Skip if already exists
            existing = await db.execute(
                select(Hospital).where(Hospital.name == name, Hospital.city == city)
            )
            if existing.scalar_one_or_none():
                continue

            loc = place.get("geometry", {}).get("location", {})
            db.add(Hospital(
                name             = name,
                type             = HospitalType.PRIVATE,
                address          = place.get("formatted_address", ""),
                city             = city,
                state            = "Tamil Nadu",
                latitude         = loc.get("lat"),
                longitude        = loc.get("lng"),
                google_rating    = place.get("rating"),
                total_reviews    = place.get("user_ratings_total", 0),
                google_place_id  = place.get("place_id"),
                source           = "google_maps",
                is_verified      = False,
            ))
            added += 1

    await db.commit()
    return added
