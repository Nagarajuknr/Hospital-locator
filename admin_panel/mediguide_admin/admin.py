# admin_panel/mediguide_admin/admin.py
# Registers all models in the Django admin panel with full search, filter, edit.

from django.contrib import admin
from django.utils.html import format_html
from .models import (
    Hospital, Specialty, HospitalSpecialty, Doctor,
    User, Appointment, PatientMonitoring, BloodAvailability
)


# ── Hospital Admin ────────────────────────────────────────
@admin.register(Hospital)
class HospitalAdmin(admin.ModelAdmin):
    list_display  = ["name", "city", "type", "emergency_badge",
                     "total_beds", "google_rating", "is_verified", "is_active"]
    list_filter   = ["city", "type", "emergency_available", "is_verified", "is_active", "source"]
    search_fields = ["name", "city", "phone", "address"]
    list_editable = ["is_verified", "is_active"]
    ordering      = ["city", "name"]

    fieldsets = [
        ("Basic Info", {"fields": [
            "name", "type", "is_active", "is_verified", "source"
        ]}),
        ("Location", {"fields": [
            "address", "city", "state", "pincode", "latitude", "longitude"
        ]}),
        ("Contact", {"fields": ["phone", "email", "website"]}),
        ("Services", {"fields": [
            "emergency_available", "ambulance_available",
            "icu_beds", "total_beds", "opd_timing"
        ]}),
        ("Ratings", {"fields": ["google_rating", "total_reviews", "google_place_id"]}),
    ]

    def emergency_badge(self, obj):
        if obj.emergency_available:
            return format_html('<span style="color:red;font-weight:bold;">🚨 24/7</span>')
        return format_html('<span style="color:gray;">—</span>')
    emergency_badge.short_description = "Emergency"


# ── Specialty Admin ───────────────────────────────────────
@admin.register(Specialty)
class SpecialtyAdmin(admin.ModelAdmin):
    list_display  = ["icon", "name"]
    search_fields = ["name"]


# ── Hospital Specialty Admin ──────────────────────────────
@admin.register(HospitalSpecialty)
class HospitalSpecialtyAdmin(admin.ModelAdmin):
    list_display  = ["hospital", "specialty", "doctor_count"]
    list_filter   = ["specialty"]
    search_fields = ["hospital__name", "specialty__name"]
    autocomplete_fields = ["hospital", "specialty"]


# ── Doctor Admin ──────────────────────────────────────────
@admin.register(Doctor)
class DoctorAdmin(admin.ModelAdmin):
    list_display  = ["name", "hospital", "specialty", "experience_years",
                     "consultation_fee", "available_days", "is_available"]
    list_filter   = ["hospital__city", "specialty", "is_available"]
    search_fields = ["name", "hospital__name", "qualification"]
    list_editable = ["is_available", "consultation_fee"]

    fieldsets = [
        ("Doctor Info", {"fields": [
            "name", "qualification", "experience_years",
            "hospital", "specialty"
        ]}),
        ("Schedule", {"fields": [
            "available_days", "slot_duration",
            "consultation_fee", "is_available"
        ]}),
    ]


# ── User Admin ────────────────────────────────────────────
@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display  = ["phone", "name", "role", "hospital", "is_active", "created_at"]
    list_filter   = ["role", "is_active"]
    search_fields = ["phone", "name", "email"]
    list_editable = ["role", "is_active"]
    readonly_fields = ["id", "created_at"]

    fieldsets = [
        ("Account", {"fields": ["id", "phone", "name", "email", "is_active"]}),
        ("Role",    {"fields": ["role", "hospital"]}),
        ("Dates",   {"fields": ["created_at"]}),
    ]


# ── Appointment Admin ─────────────────────────────────────
@admin.register(Appointment)
class AppointmentAdmin(admin.ModelAdmin):
    list_display  = ["token_no", "patient", "hospital", "doctor", "status", "booked_at"]
    list_filter   = ["status", "hospital__city"]
    search_fields = ["patient__phone", "hospital__name", "doctor__name"]
    readonly_fields = ["id", "booked_at"]


# ── Patient Monitoring Admin ──────────────────────────────
@admin.register(PatientMonitoring)
class PatientMonitoringAdmin(admin.ModelAdmin):
    list_display  = ["patient", "hospital", "status_badge",
                     "ward", "bed_number", "family_code", "admitted_at"]
    list_filter   = ["status", "hospital__city"]
    search_fields = ["patient__phone", "family_code", "hospital__name"]
    readonly_fields = ["id", "family_code", "admitted_at"]

    fieldsets = [
        ("Patient",  {"fields": ["patient", "hospital", "family_code"]}),
        ("Status",   {"fields": ["status", "ward", "bed_number"]}),
        ("Medical",  {"fields": ["diagnosis", "doctor_notes"]}),
        ("Dates",    {"fields": ["admitted_at", "discharged_at"]}),
    ]

    def status_badge(self, obj):
        colors = {
            "admitted":   "blue",   "stable":     "green",
            "critical":   "red",    "in_surgery":  "orange",
            "in_icu":     "red",    "recovering":  "purple",
            "discharged": "gray",
        }
        color = colors.get(obj.status, "gray")
        return format_html(
            '<span style="color:{};font-weight:bold;">{}</span>',
            color, obj.status.upper()
        )
    status_badge.short_description = "Status"


# ── Blood Availability Admin ──────────────────────────────
@admin.register(BloodAvailability)
class BloodAvailabilityAdmin(admin.ModelAdmin):
    list_display  = ["hospital", "a_pos", "a_neg", "b_pos", "b_neg",
                     "ab_pos", "ab_neg", "o_pos", "o_neg", "updated_at"]
    search_fields = ["hospital__name", "hospital__city"]
    readonly_fields = ["updated_at"]

    fieldsets = [
        ("Hospital",     {"fields": ["hospital"]}),
        ("A Group",      {"fields": [("a_pos", "a_neg")]}),
        ("B Group",      {"fields": [("b_pos", "b_neg")]}),
        ("AB Group",     {"fields": [("ab_pos", "ab_neg")]}),
        ("O Group",      {"fields": [("o_pos", "o_neg")]}),
        ("Last Updated", {"fields": ["updated_at"]}),
    ]