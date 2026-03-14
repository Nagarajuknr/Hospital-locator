# admin_panel/mediguide_admin/models.py
# These Django models map to the SAME tables that FastAPI created.
# Django reads the existing tables — it does NOT create new ones.
# managed = False means Django never touches the table structure.

from django.db import models


class Hospital(models.Model):
    id                  = models.CharField(max_length=100, primary_key=True)
    name                = models.CharField(max_length=200)
    type                = models.CharField(max_length=20, choices=[
                            ("government","Government"),("private","Private"),
                            ("trust","Trust"),("clinic","Clinic")])
    address             = models.TextField()
    city                = models.CharField(max_length=100)
    state               = models.CharField(max_length=100)
    pincode             = models.CharField(max_length=10, blank=True, null=True)
    phone               = models.CharField(max_length=20, blank=True, null=True)
    email               = models.CharField(max_length=150, blank=True, null=True)
    website             = models.CharField(max_length=300, blank=True, null=True)
    latitude            = models.FloatField(blank=True, null=True)
    longitude           = models.FloatField(blank=True, null=True)
    emergency_available = models.BooleanField(default=False)
    ambulance_available = models.BooleanField(default=False)
    icu_beds            = models.IntegerField(default=0)
    total_beds          = models.IntegerField(default=0)
    opd_timing          = models.CharField(max_length=100, blank=True, null=True)
    google_rating       = models.FloatField(blank=True, null=True)
    total_reviews       = models.IntegerField(default=0)
    source              = models.CharField(max_length=50, default="manual")
    google_place_id     = models.CharField(max_length=100, blank=True, null=True)
    is_verified         = models.BooleanField(default=False)
    is_active           = models.BooleanField(default=True)
    created_at          = models.DateTimeField(auto_now_add=True)
    updated_at          = models.DateTimeField(auto_now=True)

    class Meta:
        managed  = False        # Django reads the table, never modifies it
        db_table = "hospitals"
        ordering = ["city", "name"]
        verbose_name        = "Hospital"
        verbose_name_plural = "Hospitals"

    def __str__(self):
        return f"{self.name} — {self.city}"


class Specialty(models.Model):
    id   = models.CharField(max_length=100, primary_key=True)
    name = models.CharField(max_length=100)
    icon = models.CharField(max_length=10, blank=True, null=True)

    class Meta:
        managed  = False
        db_table = "specialties"
        ordering = ["name"]
        verbose_name_plural = "Specialties"

    def __str__(self):
        return f"{self.icon or ''} {self.name}".strip()


class HospitalSpecialty(models.Model):
    id           = models.CharField(max_length=100, primary_key=True)
    hospital     = models.ForeignKey(Hospital,  on_delete=models.DO_NOTHING, db_column="hospital_id")
    specialty    = models.ForeignKey(Specialty, on_delete=models.DO_NOTHING, db_column="specialty_id")
    doctor_count = models.IntegerField(default=0)

    class Meta:
        managed  = False
        db_table = "hospital_specialties"
        verbose_name        = "Hospital Specialty"
        verbose_name_plural = "Hospital Specialties"

    def __str__(self):
        return f"{self.hospital.name} — {self.specialty.name}"


class Doctor(models.Model):
    id               = models.CharField(max_length=100, primary_key=True)
    hospital         = models.ForeignKey(Hospital,  on_delete=models.DO_NOTHING, db_column="hospital_id")
    specialty        = models.ForeignKey(Specialty, on_delete=models.DO_NOTHING, db_column="specialty_id", null=True, blank=True)
    name             = models.CharField(max_length=150)
    qualification    = models.CharField(max_length=200, blank=True, null=True)
    experience_years = models.IntegerField(default=0)
    consultation_fee = models.IntegerField(default=0)
    available_days   = models.CharField(max_length=100, blank=True, null=True)
    slot_duration    = models.IntegerField(default=15)
    is_available     = models.BooleanField(default=True)
    created_at       = models.DateTimeField(auto_now_add=True)

    class Meta:
        managed  = False
        db_table = "doctors"
        ordering = ["hospital", "name"]

    def __str__(self):
        return f"Dr. {self.name} — {self.hospital.name}"


class User(models.Model):
    id          = models.CharField(max_length=100, primary_key=True)
    phone       = models.CharField(max_length=15, unique=True)
    name        = models.CharField(max_length=100, blank=True, null=True)
    email       = models.CharField(max_length=150, blank=True, null=True)
    role        = models.CharField(max_length=20, choices=[
                    ("patient","Patient"),("doctor","Doctor"),
                    ("nurse","Nurse"),("receptionist","Receptionist"),
                    ("admin","Admin")])
    hospital    = models.ForeignKey(Hospital, on_delete=models.DO_NOTHING,
                    db_column="hospital_id", null=True, blank=True)
    is_active   = models.BooleanField(default=True)
    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        managed  = False
        db_table = "users"
        ordering = ["role", "name"]

    def __str__(self):
        return f"{self.name or self.phone} ({self.role})"


class Appointment(models.Model):
    id          = models.CharField(max_length=100, primary_key=True)
    patient     = models.ForeignKey(User,     on_delete=models.DO_NOTHING, db_column="patient_id")
    hospital    = models.ForeignKey(Hospital, on_delete=models.DO_NOTHING, db_column="hospital_id")
    doctor      = models.ForeignKey(Doctor,   on_delete=models.DO_NOTHING, db_column="doctor_id")
    status      = models.CharField(max_length=20)
    reason      = models.TextField(blank=True, null=True)
    notes       = models.TextField(blank=True, null=True)
    token_no    = models.IntegerField(blank=True, null=True)
    booked_at   = models.DateTimeField(auto_now_add=True)

    class Meta:
        managed  = False
        db_table = "appointments"
        ordering = ["-booked_at"]

    def __str__(self):
        return f"Appt #{self.token_no} — {self.patient} at {self.hospital.name}"


class PatientMonitoring(models.Model):
    id            = models.CharField(max_length=100, primary_key=True)
    patient       = models.ForeignKey(User,     on_delete=models.DO_NOTHING, db_column="patient_id")
    hospital      = models.ForeignKey(Hospital, on_delete=models.DO_NOTHING, db_column="hospital_id")
    status        = models.CharField(max_length=20)
    ward          = models.CharField(max_length=50, blank=True, null=True)
    bed_number    = models.CharField(max_length=10, blank=True, null=True)
    diagnosis     = models.TextField(blank=True, null=True)
    doctor_notes  = models.TextField(blank=True, null=True)
    family_code   = models.CharField(max_length=10, blank=True, null=True)
    admitted_at   = models.DateTimeField(auto_now_add=True)
    discharged_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        managed  = False
        db_table = "patient_monitoring"
        ordering = ["-admitted_at"]
        verbose_name        = "Patient Monitoring"
        verbose_name_plural = "Patient Monitoring"

    def __str__(self):
        return f"{self.patient} — {self.status} (Code: {self.family_code})"


class BloodAvailability(models.Model):
    id          = models.CharField(max_length=100, primary_key=True)
    hospital    = models.OneToOneField(Hospital, on_delete=models.DO_NOTHING, db_column="hospital_id")
    a_pos  = models.IntegerField(default=0)
    a_neg  = models.IntegerField(default=0)
    b_pos  = models.IntegerField(default=0)
    b_neg  = models.IntegerField(default=0)
    ab_pos = models.IntegerField(default=0)
    ab_neg = models.IntegerField(default=0)
    o_pos  = models.IntegerField(default=0)
    o_neg  = models.IntegerField(default=0)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        managed  = False
        db_table = "blood_availability"
        verbose_name        = "Blood Availability"
        verbose_name_plural = "Blood Availability"

    def __str__(self):
        return f"Blood Bank — {self.hospital.name}"