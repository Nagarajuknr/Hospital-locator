# backend/src/schemas/auth.py
from pydantic import BaseModel
from typing import Optional

class SendOTPRequest(BaseModel):
    phone: str           # e.g. "9876543210"

class VerifyOTPRequest(BaseModel):
    phone: str
    otp:   str           # 6-digit code

class TokenResponse(BaseModel):
    access_token: str
    token_type:   str = "bearer"
    user_id:      str
    name:         Optional[str] = None
    role:         str

class UserUpdate(BaseModel):
    name:  Optional[str] = None
    email: Optional[str] = None