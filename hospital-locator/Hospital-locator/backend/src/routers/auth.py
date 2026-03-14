# backend/src/routers/auth.py
# Phone OTP login — NO ABDM, NO complex setup needed.
# Works in dev with OTP printed to terminal.

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from ..database import get_db
from ..schemas.auth import SendOTPRequest, VerifyOTPRequest, TokenResponse, UserUpdate
from ..services.auth_service import send_otp, verify_otp, get_or_create_user, create_access_token
from ..middleware.auth import get_current_user
from ..models import User

router = APIRouter()

# ── POST /api/auth/send-otp ───────────────────────────────
@router.post("/send-otp")
async def send_otp_route(body: SendOTPRequest):
    """
    Step 1 of login: send OTP to phone number.
    In dev mode: OTP prints in the terminal (no SMS needed).
    """
    phone = body.phone.strip().replace(" ", "").replace("-", "")
    if len(phone) < 10:
        raise HTTPException(status_code=400, detail="Invalid phone number")

    result = await send_otp(phone)
    return result

# ── POST /api/auth/verify-otp ─────────────────────────────
@router.post("/verify-otp", response_model=TokenResponse)
async def verify_otp_route(body: VerifyOTPRequest, db: AsyncSession = Depends(get_db)):
    """
    Step 2 of login: verify OTP and get JWT token.
    Creates a new patient account if first time logging in.
    """
    phone = body.phone.strip().replace(" ", "").replace("-", "")
    otp   = body.otp.strip()

    if not await verify_otp(phone, otp):
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")

    user  = await get_or_create_user(phone, db)
    token = create_access_token(user.id, user.role.value)

    return TokenResponse(
        access_token = token,
        user_id      = user.id,
        name         = user.name,
        role         = user.role.value,
    )

# ── GET /api/auth/me ──────────────────────────────────────
@router.get("/me")
async def get_me(user: User = Depends(get_current_user)):
    """Returns the currently logged-in user's profile."""
    return {
        "id":         user.id,
        "phone":      user.phone,
        "name":       user.name,
        "email":      user.email,
        "role":       user.role.value,
        "hospital_id": user.hospital_id,
    }

# ── PATCH /api/auth/me ────────────────────────────────────
@router.patch("/me")
async def update_me(
    body: UserUpdate,
    user: User = Depends(get_current_user),
    db:   AsyncSession = Depends(get_db),
):
    """Update name and email for the logged-in user."""
    if body.name  is not None: user.name  = body.name
    if body.email is not None: user.email = body.email
    db.add(user)
    return {"message": "Profile updated", "name": user.name, "email": user.email}