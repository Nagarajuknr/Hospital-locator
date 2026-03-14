# backend/src/seed_data.py
# Run ONCE to fill DB with real hospital data + specialties + doctors
# Command (from inside backend/ with venv active):
#   python -m src.seed_data

import asyncio
from sqlalchemy import select
from .database import AsyncSessionLocal, create_tables
from .models import (Hospital, Specialty, HospitalSpecialty,
                     Doctor, BloodAvailability, User,
                     UserRole, HospitalType)

SPECIALTIES = [
    {"name": "Cardiology",         "icon": "🫀"},
    {"name": "Orthopaedics",       "icon": "🦴"},
    {"name": "Neurology",          "icon": "🧠"},
    {"name": "Paediatrics",        "icon": "👶"},
    {"name": "Gynaecology",        "icon": "🌸"},
    {"name": "General Surgery",    "icon": "🔪"},
    {"name": "Emergency Medicine", "icon": "🚨"},
    {"name": "Ophthalmology",      "icon": "👁️"},
    {"name": "Dermatology",        "icon": "🩺"},
    {"name": "Psychiatry",         "icon": "🧘"},
    {"name": "Oncology",           "icon": "🎗️"},
    {"name": "Urology",            "icon": "💊"},
    {"name": "ENT",                "icon": "👂"},
    {"name": "Dentistry",          "icon": "🦷"},
    {"name": "Radiology",          "icon": "📡"},
]

HOSPITALS = [
    {"name":"Apollo Hospitals Chennai","type":HospitalType.PRIVATE,
     "address":"21, Greams Lane, Off Greams Road","city":"Chennai",
     "state":"Tamil Nadu","pincode":"600006","phone":"044-28293333",
     "latitude":13.0569,"longitude":80.2521,"emergency_available":True,
     "ambulance_available":True,"icu_beds":50,"total_beds":500,
     "opd_timing":"8AM-8PM Mon-Sat","google_rating":4.2,"total_reviews":1840,
     "is_verified":True,
     "specs":["Cardiology","Neurology","Oncology","General Surgery","Orthopaedics"]},
    {"name":"MIOT International","type":HospitalType.PRIVATE,
     "address":"4/112, Mount Poonamallee Road, Manapakkam","city":"Chennai",
     "state":"Tamil Nadu","pincode":"600089","phone":"044-42002288",
     "latitude":13.0128,"longitude":80.1758,"emergency_available":True,
     "ambulance_available":True,"icu_beds":30,"total_beds":350,
     "opd_timing":"9AM-6PM Mon-Sat","google_rating":4.4,"total_reviews":2100,
     "is_verified":True,
     "specs":["Orthopaedics","Neurology","Cardiology","General Surgery"]},
    {"name":"Fortis Malar Hospital","type":HospitalType.PRIVATE,
     "address":"52, 1st Main Road, Gandhi Nagar, Adyar","city":"Chennai",
     "state":"Tamil Nadu","pincode":"600020","phone":"044-42892222",
     "latitude":13.0013,"longitude":80.2565,"emergency_available":True,
     "ambulance_available":False,"icu_beds":20,"total_beds":180,
     "opd_timing":"9AM-5PM Mon-Sat","google_rating":4.1,"total_reviews":980,
     "is_verified":True,
     "specs":["Cardiology","Paediatrics","Gynaecology","General Surgery"]},
    {"name":"Rajiv Gandhi Govt General Hospital","type":HospitalType.GOVERNMENT,
     "address":"Park Town, Chennai","city":"Chennai",
     "state":"Tamil Nadu","pincode":"600003","phone":"044-25305000",
     "latitude":13.0836,"longitude":80.2785,"emergency_available":True,
     "ambulance_available":True,"icu_beds":100,"total_beds":2600,
     "opd_timing":"8AM-1PM Mon-Sat","google_rating":3.8,"total_reviews":4200,
     "is_verified":True,
     "specs":["Emergency Medicine","General Surgery","Orthopaedics","Cardiology","Neurology"]},
    {"name":"Dr. Mehta's Hospitals","type":HospitalType.PRIVATE,
     "address":"2, McNichols Road, Chetpet","city":"Chennai",
     "state":"Tamil Nadu","pincode":"600031","phone":"044-26461025",
     "latitude":13.0741,"longitude":80.2468,"emergency_available":False,
     "ambulance_available":False,"icu_beds":10,"total_beds":80,
     "opd_timing":"9AM-7PM Mon-Sun","google_rating":4.0,"total_reviews":560,
     "is_verified":True,
     "specs":["Gynaecology","Paediatrics","General Surgery"]},
    {"name":"SRM Institutes of Medical Sciences","type":HospitalType.PRIVATE,
     "address":"No.1, Jawaharlal Nehru Salai, Vadapalani","city":"Chennai",
     "state":"Tamil Nadu","pincode":"600026","phone":"044-22355555",
     "latitude":13.0521,"longitude":80.2118,"emergency_available":True,
     "ambulance_available":True,"icu_beds":25,"total_beds":220,
     "opd_timing":"8AM-8PM Mon-Sat","google_rating":4.3,"total_reviews":1320,
     "is_verified":True,
     "specs":["Oncology","Neurology","Cardiology","Urology","Radiology"]},
]

DOCTORS = [
    {"name":"Dr. Ramesh Subramanian","qualification":"MBBS, DM (Cardiology)",
     "experience_years":18,"consultation_fee":800,
     "available_days":"Mon,Wed,Fri","specialty":"Cardiology"},
    {"name":"Dr. Priya Venkatesh","qualification":"MBBS, MS (Ortho)",
     "experience_years":12,"consultation_fee":600,
     "available_days":"Tue,Thu,Sat","specialty":"Orthopaedics"},
    {"name":"Dr. Arun Krishnamurthy","qualification":"MBBS, DM (Neurology)",
     "experience_years":15,"consultation_fee":900,
     "available_days":"Mon,Tue,Wed,Thu","specialty":"Neurology"},
    {"name":"Dr. Meena Chandrasekhar","qualification":"MBBS, MD (Paediatrics)",
     "experience_years":10,"consultation_fee":500,
     "available_days":"Mon,Wed,Fri,Sat","specialty":"Paediatrics"},
    {"name":"Dr. Suresh Pandian","qualification":"MBBS, MS (General Surgery)",
     "experience_years":20,"consultation_fee":700,
     "available_days":"Mon,Tue,Thu,Fri","specialty":"General Surgery"},
]

async def seed():
    print("🌱 Seeding database...")
    await create_tables()
    async with AsyncSessionLocal() as db:
        existing = await db.execute(select(Specialty).limit(1))
        if existing.scalar_one_or_none():
            print("⚠️  Already seeded — skipping. Delete rows in pgAdmin to re-seed.")
            return

        spec_map = {}
        for s in SPECIALTIES:
            obj = Specialty(**s); db.add(obj); await db.flush()
            spec_map[s["name"]] = obj.id
        print(f"  ✅ {len(SPECIALTIES)} specialties")

        hosp_list = []
        for h in HOSPITALS:
            specs = h.pop("specs")
            hosp  = Hospital(**h); db.add(hosp); await db.flush()
            for sp in specs:
                if sp in spec_map:
                    db.add(HospitalSpecialty(hospital_id=hosp.id, specialty_id=spec_map[sp]))
            db.add(BloodAvailability(hospital_id=hosp.id,
                a_pos=5,a_neg=2,b_pos=8,b_neg=1,ab_pos=3,ab_neg=1,o_pos=10,o_neg=3))
            hosp_list.append(hosp)
        print(f"  ✅ {len(HOSPITALS)} hospitals")

        first = hosp_list[0]
        for d in DOCTORS:
            sp = d.pop("specialty")
            db.add(Doctor(hospital_id=first.id, specialty_id=spec_map.get(sp), **d))
        print(f"  ✅ {len(DOCTORS)} doctors")

        db.add(User(phone="9999999999", name="MediGuide Admin",
                    email="admin@mediguide.in", role=UserRole.ADMIN))
        print("  ✅ Admin (phone: 9999999999)")

        await db.commit()
        print("\n✅ Seeding complete!")

if __name__ == "__main__":
    asyncio.run(seed())
