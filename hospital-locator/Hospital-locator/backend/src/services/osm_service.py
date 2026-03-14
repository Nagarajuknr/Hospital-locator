# backend/src/services/osm_service.py
# Fetches real hospital data from OpenStreetMap using the Overpass API.
# 100% FREE — no API key, no account, no credit card needed.
#
# How it works:
#   OpenStreetMap is a free community map of the entire world.
#   Overpass API lets you query it for specific things like hospitals.
#   We ask: "give me all hospitals in Chennai" → it returns name, address, GPS, phone.
#
# Run from backend/ with venv active:
#   python -m src.services.osm_service

import asyncio
import httpx
from sqlalchemy import select
from ..database import AsyncSessionLocal, create_tables
from ..models import Hospital, HospitalType

# Overpass API endpoint — completely free, no key needed
OVERPASS_URL = "https://overpass-api.de/api/interpreter"

# Cities to fetch hospitals for
TARGET_CITIES = [
    {"name": "Chennai",    "lat": 13.0827, "lng": 80.2707, "radius": 25000},
    {"name": "Coimbatore", "lat": 11.0168, "lng": 76.9558, "radius": 20000},
    {"name": "Madurai",    "lat": 9.9252,  "lng": 78.1198, "radius": 20000},
    {"name": "Salem",      "lat": 11.6643, "lng": 78.1460, "radius": 15000},
    {"name": "Trichy",     "lat": 10.7905, "lng": 78.7047, "radius": 15000},
]


def build_query(lat: float, lng: float, radius: int) -> str:
    """
    Overpass QL query — asks for all nodes/ways tagged as hospitals
    within a circle of `radius` metres around lat/lng.
    """
    return f"""
    [out:json][timeout:30];
    (
      node["amenity"="hospital"](around:{radius},{lat},{lng});
      way["amenity"="hospital"](around:{radius},{lat},{lng});
      node["amenity"="clinic"](around:{radius},{lat},{lng});
      node["healthcare"="hospital"](around:{radius},{lat},{lng});
    );
    out center tags;
    """


def parse_hospital(element: dict, city: str) -> dict | None:
    """Extract useful fields from an OSM element."""
    tags = element.get("tags", {})
    name = tags.get("name") or tags.get("name:en")
    if not name:
        return None  # skip unnamed entries

    # GPS coordinates
    if element["type"] == "node":
        lat = element.get("lat")
        lng = element.get("lon")
    else:
        # Way element — use centre point
        centre = element.get("center", {})
        lat = centre.get("lat")
        lng = centre.get("lon")

    if not lat or not lng:
        return None

    # Build address from OSM tags
    addr_parts = [
        tags.get("addr:housenumber", ""),
        tags.get("addr:street", ""),
        tags.get("addr:suburb", ""),
    ]
    address = ", ".join(p for p in addr_parts if p) or tags.get("addr:full", "")
    if not address:
        address = f"Near {lat:.4f}, {lng:.4f}"  # fallback

    # Hospital type
    amenity = tags.get("amenity", "")
    h_type  = HospitalType.CLINIC if amenity == "clinic" else HospitalType.PRIVATE

    # Emergency
    emergency = tags.get("emergency") == "yes"

    return {
        "name":                name,
        "type":                h_type,
        "address":             address,
        "city":                city,
        "state":               "Tamil Nadu",
        "pincode": (tags.get("addr:postcode", "") or "")[:10],
        "phone": (tags.get("phone") or tags.get("contact:phone", ""))[:20],
        "website":             tags.get("website") or tags.get("contact:website", ""),
        "latitude":            lat,
        "longitude":           lng,
        "emergency_available": emergency,
        "ambulance_available": False,
        "total_beds":          int(tags.get("beds", 0) or 0),
        "icu_beds":            0,
        "opd_timing": (tags.get("opening_hours", "") or "")[:100],
        "source":              "openstreetmap",
        "is_verified":         False,
        "is_active":           True,
    }


async def fetch_city(city: dict, client: httpx.AsyncClient) -> list:
    """Fetch all hospitals for one city from Overpass API."""
    print(f"  Fetching {city['name']}...")
    query = build_query(city["lat"], city["lng"], city["radius"])
    try:
        resp = await client.post(
            OVERPASS_URL,
            data={"data": query},
            timeout=40.0,
        )
        resp.raise_for_status()
        elements = resp.json().get("elements", [])
        hospitals = []
        for el in elements:
            parsed = parse_hospital(el, city["name"])
            if parsed:
                hospitals.append(parsed)
        print(f"  ✅ {city['name']}: {len(hospitals)} hospitals found")
        return hospitals
    except Exception as e:
        print(f"  ❌ {city['name']} failed: {e}")
        return []


async def save_to_database(hospitals: list) -> int:
    """Save fetched hospitals to PostgreSQL, skip duplicates."""
    await create_tables()
    added = 0
    async with AsyncSessionLocal() as db:
        for h in hospitals:
            # Skip if hospital with same name+city already exists
            existing = await db.execute(
                select(Hospital).where(
                    Hospital.name == h["name"],
                    Hospital.city == h["city"],
                )
            )
            if existing.scalar_one_or_none():
                continue

            db.add(Hospital(**h))
            added += 1

        await db.commit()
    return added


async def fetch_all_cities():
    """Main function — fetches hospitals for all target cities."""
    print("\n🗺️  Fetching hospitals from OpenStreetMap...")
    print("   No API key needed. This is completely free.\n")

    all_hospitals = []
    async with httpx.AsyncClient() as client:
        for city in TARGET_CITIES:
            result = await fetch_city(city, client)
            all_hospitals.extend(result)
            # Be polite to the free API — wait 2 seconds between cities
            await asyncio.sleep(2)

    # Remove duplicates by name+city
    seen  = set()
    unique = []
    for h in all_hospitals:
        key = f"{h['name'].lower()}|{h['city'].lower()}"
        if key not in seen:
            seen.add(key)
            unique.append(h)

    print(f"\n📊 Total unique hospitals found: {len(unique)}")
    added = await save_to_database(unique)
    print(f"✅ Added {added} new hospitals to database")
    print(f"   ({len(unique) - added} were already in the database)\n")
    return added


# Run as script: python -m src.services.osm_service
if __name__ == "__main__":
    asyncio.run(fetch_all_cities())