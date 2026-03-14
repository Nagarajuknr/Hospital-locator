# backend/src/routers/blood.py
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from ..database import get_db
from ..middleware.auth import require_staff
from ..models import BloodAvailability, Hospital, User

router = APIRouter()

class BloodUpdate(BaseModel):
    a_pos: int = 0; a_neg: int = 0
    b_pos: int = 0; b_neg: int = 0
    ab_pos: int = 0; ab_neg: int = 0
    o_pos: int = 0; o_neg: int = 0

# ── GET /api/blood/nearby ─────────────────────────────────
@router.get("/nearby")
async def blood_nearby(
    blood_group: str  = Query(..., description="e.g. O+ or AB-"),
    lat:         float = Query(...),
    lng:         float = Query(...),
    radius:      float = Query(20.0),
    db: AsyncSession   = Depends(get_db),
):
    """Find hospitals near you that have the requested blood group available."""
    col_map = {
        "A+":"a_pos","A-":"a_neg","B+":"b_pos","B-":"b_neg",
        "AB+":"ab_pos","AB-":"ab_neg","O+":"o_pos","O-":"o_neg",
    }
    col = col_map.get(blood_group.upper())
    if not col:
        raise HTTPException(status_code=400,
            detail=f"Invalid blood group. Use one of: {list(col_map.keys())}")

    from sqlalchemy import text
    sql = text(f"""
        SELECT h.id, h.name, h.address, h.city, h.phone,
               h.latitude, h.longitude,
               ba.{col} AS units_available,
               ROUND((6371 * acos(LEAST(1.0,
                   cos(radians(:lat))*cos(radians(h.latitude))
                   *cos(radians(h.longitude)-radians(:lng))
                   +sin(radians(:lat))*sin(radians(h.latitude))
               )))::numeric, 2) AS distance_km
        FROM hospitals h
        JOIN blood_availability ba ON ba.hospital_id = h.id
        WHERE h.is_active = true
          AND h.latitude IS NOT NULL
          AND ba.{col} > 0
          AND (6371 * acos(LEAST(1.0,
                   cos(radians(:lat))*cos(radians(h.latitude))
                   *cos(radians(h.longitude)-radians(:lng))
                   +sin(radians(:lat))*sin(radians(h.latitude))
               ))) <= :radius
        ORDER BY distance_km ASC
        LIMIT 15
    """)
    result = await db.execute(sql, {"lat": lat, "lng": lng, "radius": radius})
    return {
        "blood_group": blood_group,
        "hospitals": [dict(r) for r in result.mappings().all()]
    }

# ── PATCH /api/blood/{hospital_id} (staff only) ───────────
@router.patch("/{hospital_id}")
async def update_blood(
    hospital_id: str,
    body: BloodUpdate,
    user: User = Depends(require_staff),
    db:   AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(BloodAvailability).where(BloodAvailability.hospital_id == hospital_id)
    )
    ba = result.scalar_one_or_none()
    if not ba:
        ba = BloodAvailability(hospital_id=hospital_id)
        db.add(ba)

    for field, value in body.model_dump().items():
        setattr(ba, field, value)

    return {"message": "Blood availability updated", "hospital_id": hospital_id}

# ── GET /api/blood/{hospital_id} ──────────────────────────
@router.get("/{hospital_id}")
async def get_blood(hospital_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(BloodAvailability).where(BloodAvailability.hospital_id == hospital_id)
    )
    ba = result.scalar_one_or_none()
    if not ba:
        raise HTTPException(status_code=404, detail="Blood availability not found")
    return {
        "hospital_id": hospital_id,
        "A+": ba.a_pos, "A-": ba.a_neg, "B+": ba.b_pos, "B-": ba.b_neg,
        "AB+": ba.ab_pos, "AB-": ba.ab_neg, "O+": ba.o_pos, "O-": ba.o_neg,
        "updated_at": str(ba.updated_at),
    }
