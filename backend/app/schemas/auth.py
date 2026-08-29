"""
NeuralFlix — Auth Schemas
"""

from typing import Optional
from pydantic import BaseModel, EmailStr, Field, field_validator


class UserCreate(BaseModel):
    username: str = Field(min_length=3, max_length=50, pattern=r"^[A-Za-z0-9_.-]+$")
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)
    name: Optional[str] = None

    @field_validator("password")
    @classmethod
    def validate_password_bytes(cls, value: str) -> str:
        if len(value.encode("utf-8")) > 72:
            raise ValueError("Password must be at most 72 UTF-8 bytes")
        return value



class UserLogin(BaseModel):
    email: EmailStr
    password: str = Field(max_length=72)


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
