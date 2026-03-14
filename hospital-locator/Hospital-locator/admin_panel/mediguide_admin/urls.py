# admin_panel/mediguide_admin/urls.py
from django.contrib import admin
from django.urls import path

# Custom admin branding
admin.site.site_header  = "MediGuide India"
admin.site.site_title   = "MediGuide Admin"
admin.site.index_title  = "Hospital Management Dashboard"

urlpatterns = [
    path("admin/", admin.site.urls),
]