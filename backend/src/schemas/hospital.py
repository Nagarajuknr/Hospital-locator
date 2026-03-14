# backend/src/schemas/hospital.py
# Pydantic schemas — shapes of data going in/out of API

from pydantic import BaseModel
from typing import Optional, List
from enum import Enum

class HospitalType(str, Enum):
    GOVERNMENT = "government"
    PRIVATE    = "private"
    TRUST      = "trust"
    CLINIC     = "clinic"

class SpecialtyOut(BaseModel):
    id:           str
    name:         str
    icon:         Optional[str] = None
    doctor_count: int = 0

class DoctorOut(BaseModel):
    id:               str
    name:             str
    qualification:    Optional[str] = None
    experience_years: int = 0
    consultation_fee: int = 0
    available_days:   Optional[str] = None
    is_available:     bool = True

class BloodOut(BaseModel):
    a_pos: int;  a_neg: int
    b_pos: int;  b_neg: int
    ab_pos: int; ab_neg: int
    o_pos: int;  o_neg: int

class HospitalListItem(BaseModel):
    id:                  str
    name:                str
    type:                Optional[str] = None
    address:             str
    city:                str
    phone:               Optional[str] = None
    latitude:            Optional[float] = None
    longitude:           Optional[float] = None
    emergency_available: bool = False
    ambulance_available: bool = False
    total_beds:          int = 0
    icu_beds:            int = 0
    opd_timing:          Optional[str] = None
    google_rating:       Optional[float] = None
    total_reviews:       int = 0
    is_verified:         bool = False
    distance_km:         Optional[float] = None

    class Config:
        from_attributes = True

class HospitalDetail(HospitalListItem):
    state:              str
    pincode:            Optional[str] = None
    email:              Optional[str] = None
    website:            Optional[str] = None
    specialties:        List[SpecialtyOut]     = []
    doctors:            List[DoctorOut]        = []
    blood_availability: Optional[BloodOut]     = None
