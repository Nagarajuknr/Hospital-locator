# backend/src/schemas/monitoring.py
from pydantic import BaseModel
from typing import Optional

class AdmitPatientRequest(BaseModel):
    patient_phone: str
    hospital_id:   str
    ward:          Optional[str] = None
    bed_number:    Optional[str] = None
    diagnosis:     Optional[str] = None

class UpdateStatusRequest(BaseModel):
    status:  str
    message: Optional[str] = None

class MonitoringOut(BaseModel):
    id:          str
    status:      str
    ward:        Optional[str] = None
    bed_number:  Optional[str] = None
    diagnosis:   Optional[str] = None
    family_code: Optional[str] = None
    admitted_at: str

    class Config:
        from_attributes = True
