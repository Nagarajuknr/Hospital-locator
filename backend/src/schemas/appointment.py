# backend/src/schemas/appointment.py
from pydantic import BaseModel
from typing import Optional

class AppointmentCreate(BaseModel):
    hospital_id: str
    doctor_id:   str
    slot_id:     Optional[str] = None
    reason:      Optional[str] = None

class AppointmentOut(BaseModel):
    id:          str
    hospital_id: str
    doctor_id:   str
    status:      str
    token_no:    Optional[int] = None
    reason:      Optional[str] = None
    booked_at:   str

    class Config:
        from_attributes = True

class SlotCreate(BaseModel):
    doctor_id:  str
    date:       str        # YYYY-MM-DD
    start_time: str        # HH:MM
    end_time:   str

class SlotOut(BaseModel):
    id:         str
    date:       str
    start_time: str
    end_time:   str
    is_booked:  bool
    token_no:   Optional[int] = None

    class Config:
        from_attributes = True
