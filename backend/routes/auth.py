from fastapi import APIRouter, HTTPException, Request, Response, status
from slowapi import Limiter
from slowapi.util import get_remote_address
from pydantic import BaseModel, EmailStr
import jwt
from datetime import datetime, timedelta
import asyncio
from passlib.context import CryptContext
from database import users_collection
import os
import uuid

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
JWT_SECRET = os.getenv("JWT_SECRET", "super-secret-key-change-in-prod")
ALGORITHM = "HS256"

class RegisterSchema(BaseModel):
    email: EmailStr
    password: str
    name: str = ""

class LoginSchema(BaseModel):
    email: EmailStr
    password: str

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_token(data: dict, expires_minutes: int):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=expires_minutes)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET, algorithm=ALGORITHM)

@router.post("/register", status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
async def register(request: Request, body: RegisterSchema):
    def _create():
        if users_collection.find_one({"email": body.email}):
            return None
        user_doc = {
            "id": str(uuid.uuid4()),
            "email": body.email,
            "name": body.name,
            "hashed_password": get_password_hash(body.password),
            "created_at": datetime.utcnow()
        }
        users_collection.insert_one(user_doc)
        return user_doc["id"]
    
    user_id = await asyncio.to_thread(_create)
    if not user_id:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    return {"message": "User created successfully", "user_id": user_id}

@router.post("/login")
@limiter.limit("5/minute")
async def login(request: Request, response: Response, body: LoginSchema):
    def _get_user():
        return users_collection.find_one({"email": body.email})
    
    user = await asyncio.to_thread(_get_user)
    if not user or not verify_password(body.password, user.get("hashed_password", "")):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    user_id = user["id"]
    access_token = create_token({"sub": user_id, "type": "access"}, 15)
    refresh_token = create_token({"sub": user_id, "type": "refresh"}, 60 * 24 * 7) # 7 days
    
    # Store refresh token in secure cookie
    response.set_cookie(
        "refresh_token", 
        refresh_token, 
        httponly=True, 
        secure=True, 
        samesite="lax", 
        max_age=604800
    )
    
    return {"access_token": access_token, "token_type": "bearer"}
