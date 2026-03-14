# backend/src/models.py
# Every database table as a Python class.
# SQLAlchemy reads these and creates real tables in PostgreSQL on startup.
# NO manual SQL. NO Alembic yet. Just run the server and tables appear.

from sqlalchemy import (
    Column, String, Integer, Float, Boolean,
    Text, DateTime, ForeignKey, Enum, UniqueConstraint
)
from sqlalchemy.orm import relationship, DeclarativeBase
from sqlalchemy.sql import func
import uuid, enum

class Base(DeclarativeBase):
    pass

def gen_uuid():
    return str(uuid.uuid4())

# ── Enums (fixed-choice fields) ────────────────────────────
class HospitalType(str, enum.Enum):
    GOVERNMENT = "government"
    PRIVATE    = "private"
    TRUST      = "trust"
    CLINIC     = "clinic"

class AppointmentStatus(str, enum.Enum):
    BOOKED      = "booked"
    CONFIRMED   = "confirmed"
    ARRIVED     = "arrived"
    IN_PROGRESS = "in_progress"
    COMPLETED   = "completed"
    CANCELLED   = "cancelled"

class PatientStatus(str, enum.Enum):
    ADMITTED   = "admitted"
    STABLE     = "stable"
    CRITICAL   = "critical"
    IN_SURGERY = "in_surgery"
    IN_ICU     = "in_icu"
    RECOVERING = "recovering"
    DISCHARGED = "discharged"

class UserRole(str, enum.Enum):
    PATIENT      = "patient"
    DOCTOR       = "doctor"
    NURSE        = "nurse"
    RECEPTIONIST = "receptionist"
    ADMIN        = "admin"

# ── users ──────────────────────────────────────────────────
class User(Base):
    __tablename__ = "users"
    id          = Column(String, primary_key=True, default=gen_uuid)
    phone       = Column(String(15), unique=True, nullable=False, index=True)
    name        = Column(String(100), nullable=True)
    email       = Column(String(150), unique=True, nullable=True)
    role        = Column(Enum(UserRole), default=UserRole.PATIENT)
    hospital_id = Column(String, ForeignKey("hospitals.id"), nullable=True)
    is_active   = Column(Boolean, default=True)
    created_at  = Column(DateTime(timezone=True), server_default=func.now())
    updated_at  = Column(DateTime(timezone=True), onupdate=func.now())

    hospital       = relationship("Hospital", back_populates="staff")
    appointments   = relationship("Appointment", back_populates="patient",
                                  foreign_keys="Appointment.patient_id")
    health_records = relationship("HealthRecord", back_populates="patient")
    monitoring     = relationship("PatientMonitoring", back_populates="patient",
                                  foreign_keys="PatientMonitoring.patient_id")

# ── specialties ────────────────────────────────────────────
class Specialty(Base):
    __tablename__ = "specialties"
    id   = Column(String, primary_key=True, default=gen_uuid)
    name = Column(String(100), unique=True, nullable=False)
    icon = Column(String(10), nullable=True)

    hospital_specialties = relationship("HospitalSpecialty", back_populates="specialty")
    doctors              = relationship("Doctor", back_populates="specialty")

# ── hospitals ──────────────────────────────────────────────
class Hospital(Base):
    __tablename__ = "hospitals"
    id                  = Column(String, primary_key=True, default=gen_uuid)
    name                = Column(String(200), nullable=False, index=True)
    type                = Column(Enum(HospitalType), default=HospitalType.PRIVATE)
    address             = Column(Text, nullable=False)
    city                = Column(String(100), nullable=False, index=True)
    state               = Column(String(100), nullable=False)
    pincode             = Column(String(10), nullable=True)
    phone               = Column(String(20), nullable=True)
    email               = Column(String(150), nullable=True)
    website             = Column(String(300), nullable=True)
    latitude            = Column(Float, nullable=True)
    longitude           = Column(Float, nullable=True)
    emergency_available = Column(Boolean, default=False)
    ambulance_available = Column(Boolean, default=False)
    icu_beds            = Column(Integer, default=0)
    total_beds          = Column(Integer, default=0)
    opd_timing          = Column(String(100), nullable=True)
    google_rating       = Column(Float, nullable=True)
    total_reviews       = Column(Integer, default=0)
    source              = Column(String(50), default="manual")
    google_place_id     = Column(String(100), nullable=True, unique=True)
    is_verified         = Column(Boolean, default=False)
    is_active           = Column(Boolean, default=True)
    created_at          = Column(DateTime(timezone=True), server_default=func.now())
    updated_at          = Column(DateTime(timezone=True), onupdate=func.now())

    specialties        = relationship("HospitalSpecialty", back_populates="hospital")
    doctors            = relationship("Doctor",            back_populates="hospital")
    staff              = relationship("User",              back_populates="hospital")
    appointments       = relationship("Appointment",       back_populates="hospital")
    monitoring_records = relationship("PatientMonitoring", back_populates="hospital")
    blood_availability = relationship("BloodAvailability", back_populates="hospital", uselist=False)

# ── hospital_specialties (junction) ───────────────────────
class HospitalSpecialty(Base):
    __tablename__ = "hospital_specialties"
    __table_args__ = (UniqueConstraint("hospital_id", "specialty_id"),)
    id           = Column(String, primary_key=True, default=gen_uuid)
    hospital_id  = Column(String, ForeignKey("hospitals.id"), nullable=False)
    specialty_id = Column(String, ForeignKey("specialties.id"), nullable=False)
    doctor_count = Column(Integer, default=0)

    hospital  = relationship("Hospital",  back_populates="specialties")
    specialty = relationship("Specialty", back_populates="hospital_specialties")

# ── doctors ────────────────────────────────────────────────
class Doctor(Base):
    __tablename__ = "doctors"
    id               = Column(String, primary_key=True, default=gen_uuid)
    hospital_id      = Column(String, ForeignKey("hospitals.id"), nullable=False)
    specialty_id     = Column(String, ForeignKey("specialties.id"), nullable=True)
    name             = Column(String(150), nullable=False)
    qualification    = Column(String(200), nullable=True)
    experience_years = Column(Integer, default=0)
    consultation_fee = Column(Integer, default=0)
    available_days   = Column(String(100), nullable=True)
    slot_duration    = Column(Integer, default=15)
    is_available     = Column(Boolean, default=True)
    created_at       = Column(DateTime(timezone=True), server_default=func.now())

    hospital  = relationship("Hospital",  back_populates="doctors")
    specialty = relationship("Specialty", back_populates="doctors")
    slots     = relationship("AppointmentSlot", back_populates="doctor")

# ── appointment_slots ──────────────────────────────────────
class AppointmentSlot(Base):
    __tablename__ = "appointment_slots"
    id         = Column(String, primary_key=True, default=gen_uuid)
    doctor_id  = Column(String, ForeignKey("doctors.id"), nullable=False)
    date       = Column(String(10), nullable=False)   # YYYY-MM-DD
    start_time = Column(String(5),  nullable=False)   # HH:MM
    end_time   = Column(String(5),  nullable=False)
    is_booked  = Column(Boolean, default=False)
    token_no   = Column(Integer, nullable=True)

    doctor      = relationship("Doctor", back_populates="slots")
    appointment = relationship("Appointment", back_populates="slot", uselist=False)

# ── appointments ───────────────────────────────────────────
class Appointment(Base):
    __tablename__ = "appointments"
    id          = Column(String, primary_key=True, default=gen_uuid)
    patient_id  = Column(String, ForeignKey("users.id"), nullable=False)
    hospital_id = Column(String, ForeignKey("hospitals.id"), nullable=False)
    doctor_id   = Column(String, ForeignKey("doctors.id"), nullable=False)
    slot_id     = Column(String, ForeignKey("appointment_slots.id"), nullable=True)
    status      = Column(Enum(AppointmentStatus), default=AppointmentStatus.BOOKED)
    reason      = Column(Text, nullable=True)
    notes       = Column(Text, nullable=True)
    token_no    = Column(Integer, nullable=True)
    booked_at   = Column(DateTime(timezone=True), server_default=func.now())
    updated_at  = Column(DateTime(timezone=True), onupdate=func.now())

    patient  = relationship("User",             back_populates="appointments",
                            foreign_keys=[patient_id])
    hospital = relationship("Hospital",         back_populates="appointments")
    slot     = relationship("AppointmentSlot",  back_populates="appointment")

# ── health_records ─────────────────────────────────────────
class HealthRecord(Base):
    __tablename__ = "health_records"
    id          = Column(String, primary_key=True, default=gen_uuid)
    patient_id  = Column(String, ForeignKey("users.id"), nullable=False)
    record_type = Column(String(50), nullable=False)  # lab_report, prescription, xray
    title       = Column(String(200), nullable=False)
    file_url    = Column(String(500), nullable=True)
    notes       = Column(Text, nullable=True)
    recorded_on = Column(String(10), nullable=True)
    created_at  = Column(DateTime(timezone=True), server_default=func.now())

    patient = relationship("User", back_populates="health_records")

# ── patient_monitoring ─────────────────────────────────────
class PatientMonitoring(Base):
    __tablename__ = "patient_monitoring"
    id            = Column(String, primary_key=True, default=gen_uuid)
    patient_id    = Column(String, ForeignKey("users.id"), nullable=False)
    hospital_id   = Column(String, ForeignKey("hospitals.id"), nullable=False)
    admitted_by   = Column(String, ForeignKey("users.id"), nullable=True)
    status        = Column(Enum(PatientStatus), default=PatientStatus.ADMITTED)
    ward          = Column(String(50), nullable=True)
    bed_number    = Column(String(10), nullable=True)
    diagnosis     = Column(Text, nullable=True)
    doctor_notes  = Column(Text, nullable=True)
    family_code   = Column(String(10), nullable=True, unique=True, index=True)
    admitted_at   = Column(DateTime(timezone=True), server_default=func.now())
    discharged_at = Column(DateTime(timezone=True), nullable=True)
    updated_at    = Column(DateTime(timezone=True), onupdate=func.now())

    patient  = relationship("User",     back_populates="monitoring",
                            foreign_keys=[patient_id])
    hospital = relationship("Hospital", back_populates="monitoring_records")
    updates  = relationship("MonitoringUpdate", back_populates="record")

# ── monitoring_updates ─────────────────────────────────────
class MonitoringUpdate(Base):
    __tablename__ = "monitoring_updates"
    id         = Column(String, primary_key=True, default=gen_uuid)
    record_id  = Column(String, ForeignKey("patient_monitoring.id"), nullable=False)
    updated_by = Column(String, ForeignKey("users.id"), nullable=True)
    status     = Column(Enum(PatientStatus), nullable=False)
    message    = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    record = relationship("PatientMonitoring", back_populates="updates")

# ── blood_availability ─────────────────────────────────────
class BloodAvailability(Base):
    __tablename__ = "blood_availability"
    id          = Column(String, primary_key=True, default=gen_uuid)
    hospital_id = Column(String, ForeignKey("hospitals.id"), nullable=False, unique=True)
    a_pos  = Column(Integer, default=0)
    a_neg  = Column(Integer, default=0)
    b_pos  = Column(Integer, default=0)
    b_neg  = Column(Integer, default=0)
    ab_pos = Column(Integer, default=0)
    ab_neg = Column(Integer, default=0)
    o_pos  = Column(Integer, default=0)
    o_neg  = Column(Integer, default=0)
    updated_at = Column(DateTime(timezone=True),
                        onupdate=func.now(), server_default=func.now())

    hospital = relationship("Hospital", back_populates="blood_availability")
