# backend/src/routers/monitoring.py
# Real-time patient status tracking — family can see patient status via family_code

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import random, string
from ..database import get_db
from ..middleware.auth import get_current_user, require_staff
from ..models import (PatientMonitoring, MonitoringUpdate,
                      PatientStatus, User)
from ..schemas.monitoring import AdmitPatientRequest, UpdateStatusRequest

router = APIRouter()  # noqa: this must exist

def _make_family_code():
    """Generates a short code like MG-X7K2 for families to track patients."""
    return "MG-" + ''.join(random.choices(string.ascii_uppercase + string.digits, k=4))

# ── POST /api/monitoring/admit (staff only) ───────────────
@router.post("/admit")
async def admit_patient(
    body: AdmitPatientRequest,
    user: User = Depends(require_staff),
    db:   AsyncSession = Depends(get_db),
):
    """Staff admits a patient. Creates a monitoring record + family tracking code."""
    # Find or create patient by phone
    result = await db.execute(select(User).where(User.phone == body.patient_phone))
    patient = result.scalar_one_or_none()
    if not patient:
        from ..models import UserRole
        patient = User(phone=body.patient_phone, role=UserRole.PATIENT)
        db.add(patient)
        await db.flush()

    # Generate unique family code
    family_code = _make_family_code()

    record = PatientMonitoring(
        patient_id  = patient.id,
        hospital_id = body.hospital_id,
        admitted_by = user.id,
        ward        = body.ward,
        bed_number  = body.bed_number,
        diagnosis   = body.diagnosis,
        status      = PatientStatus.ADMITTED,
        family_code = family_code,
    )
    db.add(record)
    await db.flush()

    # Log the first update
    db.add(MonitoringUpdate(
        record_id  = record.id,
        updated_by = user.id,
        status     = PatientStatus.ADMITTED,
        message    = f"Patient admitted. Ward: {body.ward or 'N/A'}, Bed: {body.bed_number or 'N/A'}",
    ))

    return {
        "record_id":   record.id,
        "family_code": family_code,
        "message":     "Patient admitted. Share the family_code with the family.",
        "tracking_url": f"/track/{family_code}",
    }

# ── GET /api/monitoring/track/{family_code} (public) ──────
@router.get("/track/{family_code}")
async def track_patient(family_code: str, db: AsyncSession = Depends(get_db)):
    """
    Public endpoint — family enters their code to see patient status.
    No login required. Shows only safe info (no private medical details).
    """
    result = await db.execute(
        select(PatientMonitoring)
        .where(PatientMonitoring.family_code == family_code.upper())
    )
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=404, detail="Invalid tracking code")

    # Get last 10 updates
    updates_result = await db.execute(
        select(MonitoringUpdate)
        .where(MonitoringUpdate.record_id == record.id)
        .order_by(MonitoringUpdate.created_at.desc())
        .limit(10)
    )
    updates = updates_result.scalars().all()

    return {
        "status":      record.status,
        "ward":        record.ward,
        "admitted_at": str(record.admitted_at),
        "updates": [
            {"status": u.status, "message": u.message, "time": str(u.created_at)}
            for u in updates
        ]
    }

# ── PATCH /api/monitoring/{id}/status (staff only) ────────
@router.patch("/{record_id}/status")
async def update_patient_status(
    record_id: str,
    body:      UpdateStatusRequest,
    user: User = Depends(require_staff),
    db:   AsyncSession = Depends(get_db),
):
    """Staff updates patient status — family code page updates in real time."""
    record = await db.get(PatientMonitoring, record_id)
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")

    try:
        new_status = PatientStatus(body.status)
    except ValueError:
        raise HTTPException(status_code=400,
            detail=f"Invalid status. Valid: {[s.value for s in PatientStatus]}")

    record.status = new_status
    db.add(MonitoringUpdate(
        record_id  = record_id,
        updated_by = user.id,
        status     = new_status,
        message    = body.message or f"Status updated to {new_status.value}",
    ))

    return {"message": "Status updated", "status": new_status.value,
            "family_code": record.family_code}

# ── GET /api/monitoring/hospital/{hospital_id} (staff) ────
@router.get("/hospital/{hospital_id}")
async def list_admitted_patients(
    hospital_id: str,
    user: User = Depends(require_staff),
    db:   AsyncSession = Depends(get_db),
):
    """Staff view — list all currently admitted patients in a hospital."""
    result = await db.execute(
        select(PatientMonitoring)
        .where(PatientMonitoring.hospital_id == hospital_id,
               PatientMonitoring.status != PatientStatus.DISCHARGED)
        .order_by(PatientMonitoring.admitted_at.desc())
    )
    records = result.scalars().all()
    return {
        "count": len(records),
        "patients": [
            {"id": r.id, "status": r.status,
             "ward": r.ward, "bed_number": r.bed_number,
             "diagnosis": r.diagnosis, "family_code": r.family_code,
             "admitted_at": str(r.admitted_at)}
            for r in records
        ]
    }