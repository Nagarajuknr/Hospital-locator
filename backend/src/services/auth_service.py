# backend/src/services/auth_service.py
# Handles OTP generation, verification, and JWT tokens.
#
# INSTEAD OF ABDM: We use a simple phone OTP system.
# In development: OTP is printed in the terminal (no SMS needed).
# In production:  Plug in any free SMS API (e.g. Fast2SMS — free Indian SMS).

import random, string
from datetime import datetime, timedelta
from jose import jwt, JWTError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from ..models import User, UserRole
from ..config import settings

# In-memory OTP store (good enough for development)
# Format: { "9876543210": {"otp": "123456", "expires": datetime} }
_otp_store: dict = {}

def generate_otp(length: int = 6) -> str:
    return ''.join(random.choices(string.digits, k=length))

async def send_otp(phone: str) -> dict:
    """
    Generates an OTP and 'sends' it.
    DEV MODE: OTP is printed to terminal. No SMS service needed.
    PROD MODE: Replace the print with an SMS API call (see below).
    """
    otp = generate_otp()
    _otp_store[phone] = {
        "otp": otp,
        "expires": datetime.utcnow() + timedelta(minutes=10)
    }

    # ── DEV MODE: print to terminal ───────────────────────
    print(f"\n{'='*40}")
    print(f"  📱 OTP for {phone}: {otp}")
    print(f"  Expires in 10 minutes")
    print(f"{'='*40}\n")

    # ── PROD MODE (uncomment when ready): Fast2SMS ────────
    # Fast2SMS gives 100 free SMS/day for Indian numbers.
    # Get free API key: fast2sms.com → Dashboard → Dev API
    #
    # import httpx
    # async with httpx.AsyncClient() as client:
    #     await client.post(
    #         "https://www.fast2sms.com/dev/bulkV2",
    #         headers={"authorization": settings.FAST2SMS_API_KEY},
    #         json={
    #             "route": "otp",
    #             "variables_values": otp,
    #             "numbers": phone,
    #         }
    #     )
    #
    # ── ALTERNATIVE: Twilio (add to .env): ───────────────
    # TWILIO_SID, TWILIO_TOKEN, TWILIO_PHONE
    # Works with free trial account for testing.

    return {"message": f"OTP sent to {phone}", "dev_otp": otp if settings.DEBUG else None}

async def verify_otp(phone: str, otp: str) -> bool:
    """Returns True if OTP is correct and not expired."""
    record = _otp_store.get(phone)
    if not record:
        return False
    if datetime.utcnow() > record["expires"]:
        del _otp_store[phone]
        return False
    if record["otp"] != otp:
        return False
    del _otp_store[phone]   # OTP used — remove it
    return True

async def get_or_create_user(phone: str, db: AsyncSession) -> User:
    """Get existing user or create new patient account."""
    result = await db.execute(select(User).where(User.phone == phone))
    user = result.scalar_one_or_none()
    if not user:
        user = User(phone=phone, role=UserRole.PATIENT)
        db.add(user)
        await db.flush()
    return user

def create_access_token(user_id: str, role: str) -> str:
    """Create a JWT token valid for JWT_EXPIRE_MINUTES."""
    payload = {
        "sub":  user_id,
        "role": role,
        "exp":  datetime.utcnow() + timedelta(minutes=settings.JWT_EXPIRE_MINUTES)
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)

def decode_token(token: str) -> dict:
    """Decode and validate a JWT token. Raises JWTError if invalid."""
    return jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])