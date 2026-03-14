# backend/src/routers/appointments.py
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timedelta
from typing import Optional
from ..database import get_db
from ..middleware.auth import get_current_user, require_staff
from ..models import (Appointment, AppointmentSlot, Doctor,
                      AppointmentStatus, User)
from ..schemas.appointment import AppointmentCreate, SlotCreate

router = APIRouter()

# ── GET /api/appointments/slots?doctor_id=&date= ──────────
@router.get("/slots")
async def get_slots(
    doctor_id: str           = Query(...),
    date:      Optional[str] = Query(None, description="YYYY-MM-DD, defaults to today"),
    db: AsyncSession = Depends(get_db),
):
    """List available time slots for a doctor on a given date."""
    if not date:
        date = datetime.now().strftime("%Y-%m-%d")

    result = await db.execute(
        select(AppointmentSlot)
        .where(AppointmentSlot.doctor_id == doctor_id,
               AppointmentSlot.date == date,
               AppointmentSlot.is_booked == False)
        .order_by(AppointmentSlot.start_time)
    )
    slots = result.scalars().all()
    return {
        "date": date,
        "slots": [
            {"id": s.id, "start_time": s.start_time,
             "end_time": s.end_time, "token_no": s.token_no}
            for s in slots
        ]
    }

# ── POST /api/appointments/slots (staff only) ─────────────
@router.post("/slots")
async def create_slots(
    body: SlotCreate,
    user: User = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    """
    Staff creates time slots for a doctor.
    Can also auto-generate slots for a full day — see generate_day_slots below.
    """
    # Check doctor exists
    doctor = await db.get(Doctor, body.doctor_id)
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")

    slot = AppointmentSlot(
        doctor_id  = body.doctor_id,
        date       = body.date,
        start_time = body.start_time,
        end_time   = body.end_time,
        token_no   = await _next_token(db, body.doctor_id, body.date),
    )
    db.add(slot)
    await db.flush()
    return {"id": slot.id, "date": slot.date,
            "start_time": slot.start_time, "token_no": slot.token_no}

# ── POST /api/appointments/slots/generate-day ─────────────
@router.post("/slots/generate-day")
async def generate_day_slots(
    doctor_id:  str  = Query(...),
    date:       str  = Query(..., description="YYYY-MM-DD"),
    start_hour: int  = Query(9,   description="Start hour, e.g. 9 for 9AM"),
    end_hour:   int  = Query(17,  description="End hour, e.g. 17 for 5PM"),
    duration:   int  = Query(15,  description="Minutes per slot"),
    user: User = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    """Auto-generate all time slots for a doctor for a full day."""
    doctor = await db.get(Doctor, doctor_id)
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")

    current = datetime.strptime(f"{date} {start_hour:02d}:00", "%Y-%m-%d %H:%M")
    end     = datetime.strptime(f"{date} {end_hour:02d}:00", "%Y-%m-%d %H:%M")
    token   = 1
    created = 0

    while current < end:
        slot_end = current + timedelta(minutes=duration)
        db.add(AppointmentSlot(
            doctor_id  = doctor_id,
            date       = date,
            start_time = current.strftime("%H:%M"),
            end_time   = slot_end.strftime("%H:%M"),
            token_no   = token,
        ))
        current = slot_end
        token  += 1
        created += 1

    return {"message": f"Generated {created} slots for {date}"}

# ── POST /api/appointments (patient books) ────────────────
@router.post("/")
async def book_appointment(
    body: AppointmentCreate,
    user: User = Depends(get_current_user),
    db:   AsyncSession = Depends(get_db),
):
    """Patient books an appointment."""
    # Mark slot as booked
    if body.slot_id:
        slot = await db.get(AppointmentSlot, body.slot_id)
        if not slot or slot.is_booked:
            raise HTTPException(status_code=400, detail="Slot not available")
        slot.is_booked = True

    appt = Appointment(
        patient_id  = user.id,
        hospital_id = body.hospital_id,
        doctor_id   = body.doctor_id,
        slot_id     = body.slot_id,
        reason      = body.reason,
        token_no    = slot.token_no if body.slot_id else None,
        status      = AppointmentStatus.BOOKED,
    )
    db.add(appt)
    await db.flush()

    return {
        "id":           appt.id,
        "hospital_id":  appt.hospital_id,
        "doctor_id":    appt.doctor_id,
        "status":       appt.status,
        "token_no":     appt.token_no,
        "message":      "Appointment booked successfully",
    }

# ── GET /api/appointments/my ──────────────────────────────
@router.get("/my")
async def my_appointments(
    user: User = Depends(get_current_user),
    db:   AsyncSession = Depends(get_db),
):
    """Returns all appointments for the logged-in patient."""
    result = await db.execute(
        select(Appointment)
        .where(Appointment.patient_id == user.id)
        .order_by(Appointment.booked_at.desc())
    )
    appts = result.scalars().all()
    return {
        "appointments": [
            {"id": a.id, "hospital_id": a.hospital_id,
             "doctor_id": a.doctor_id, "status": a.status,
             "token_no": a.token_no, "reason": a.reason,
             "booked_at": str(a.booked_at)}
            for a in appts
        ]
    }

# ── PATCH /api/appointments/{id}/status (staff only) ──────
@router.patch("/{appt_id}/status")
async def update_appointment_status(
    appt_id:   str,
    status:    AppointmentStatus = Query(...),
    user: User = Depends(require_staff),
    db:   AsyncSession = Depends(get_db),
):
    appt = await db.get(Appointment, appt_id)
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")
    appt.status = status
    return {"message": f"Status updated to {status}", "id": appt_id}

# ── Helper ─────────────────────────────────────────────────
async def _next_token(db: AsyncSession, doctor_id: str, date: str) -> int:
    result = await db.execute(
        select(AppointmentSlot)
        .where(AppointmentSlot.doctor_id == doctor_id,
               AppointmentSlot.date == date)
        .order_by(AppointmentSlot.token_no.desc())
        .limit(1)
    )
    last = result.scalar_one_or_none()
    return (last.token_no or 0) + 1 if last else 1
