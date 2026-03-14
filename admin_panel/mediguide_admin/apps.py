# admin_panel/mediguide_admin/apps.py
from django.apps import AppConfig

class MediguideAdminConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name               = "mediguide_admin"
    verbose_name       = "MediGuide Admin"