"""
NeuralFlix — Auth Schemas
"""

from typing import Optional
from pydantic import BaseModel, EmailStr


class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str
    name: Optional[str] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str


class UserResponse(BaseModel):
    id: str
    username: str
    email: EmailStr
    name: str
    onboarded: bool
    is_admin: bool

    model_config = {"from_attributes": True}
