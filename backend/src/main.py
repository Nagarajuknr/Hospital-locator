# backend/src/main.py
# FastAPI app entry point.
# Run: uvicorn src.main:app --reload --port 8000

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from .database import create_tables
from .routers import auth, hospitals, appointments, monitoring, blood
import re

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("🚀  MediGuide API starting...")
    await create_tables()          # creates all 11 tables if they don't exist
    yield
    print("👋  MediGuide API shutting down.")

app = FastAPI(
    title       = "MediGuide India API",
    description = "Hospital discovery · Appointments · Patient monitoring",
    version     = "1.0.0",
    lifespan    = lifespan,
)

# Allow React portal (localhost:5173) to call this API


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "https://hospital-locator-six.vercel.app",
        "https://hospital-locator-nagarajuknrs-projects.vercel.app",

    ],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── All routers ────────────────────────────────────────────
app.include_router(auth.router,         prefix="/api/auth",         tags=["Auth"])
app.include_router(hospitals.router,    prefix="/api/hospitals",    tags=["Hospitals"])
app.include_router(appointments.router, prefix="/api/appointments", tags=["Appointments"])
app.include_router(monitoring.router,   prefix="/api/monitoring",   tags=["Monitoring"])
app.include_router(blood.router,        prefix="/api/blood",        tags=["Blood Bank"])

@app.get("/")
async def root():
    return {
        "status": "MediGuide API running ✅",
        "docs":   "http://localhost:8000/docs",
        "endpoints": {
            "auth":         "/api/auth",
            "hospitals":    "/api/hospitals",
            "appointments": "/api/appointments",
            "monitoring":   "/api/monitoring",
            "blood":        "/api/blood",
        }
    }
