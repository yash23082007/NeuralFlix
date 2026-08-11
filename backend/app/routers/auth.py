"""
NeuralFlix v4 — Auth Endpoints
"""

import uuid
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from jose import jwt
import bcrypt

from app.config import get_settings
from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.taste_control import TasteControl
from app.schemas.auth import UserCreate, UserLogin, UserResponse

settings = get_settings()
router = APIRouter(prefix="/api/v1/auth", tags=["Auth"])


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))


def get_password_hash(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')


def create_access_token(data: dict, expires_delta: timedelta):
    to_encode = data.copy()
    expire = datetime.utcnow() + expires_delta
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.jwt_secret, algorithm=settings.jwt_algorithm)


@router.post("/register", response_model=UserResponse)
async def register(user_in: UserCreate, response: Response, db: AsyncSession = Depends(get_db)):
    """Register a new user and set HttpOnly cookie."""
    
    # Check email exists
    result = await db.execute(select(User).where(User.email == user_in.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")
        
    # Check username exists
    result = await db.execute(select(User).where(User.username == user_in.username))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Username already taken")
        
    # Create user
    user_id = str(uuid.uuid4())
    hashed_password = get_password_hash(user_in.password)
    new_user = User(
        id=user_id,
        email=user_in.email,
        username=user_in.username,
        hashed_password=hashed_password,
        name=user_in.name or user_in.username,
    )
    
    # Create taste profile
    taste_profile = TasteControl(user_id=user_id)
    
    db.add(new_user)
    db.add(taste_profile)
    await db.commit()
    await db.refresh(new_user)
    
    # Generate token
    access_token = create_access_token(
        data={"sub": user_id},
        expires_delta=timedelta(minutes=settings.access_token_expire_minutes)
    )
    
    # Set cookie
    response.set_cookie(
        key="nf_access_token",
        value=access_token,
        httponly=True,
        secure=settings.cookie_secure,
        domain=settings.cookie_domain,
        samesite=settings.cookie_samesite,
        max_age=settings.access_token_expire_minutes * 60,
    )
    
    return new_user


@router.post("/login", response_model=UserResponse)
async def login(user_in: UserLogin, response: Response, db: AsyncSession = Depends(get_db)):
    """Login and set HttpOnly cookie."""
    result = await db.execute(select(User).where(User.email == user_in.email))
    user = result.scalar_one_or_none()
    
    if not user or not verify_password(user_in.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
        
    access_token = create_access_token(
        data={"sub": user.id},
        expires_delta=timedelta(minutes=settings.access_token_expire_minutes)
    )
    
    response.set_cookie(
        key="nf_access_token",
        value=access_token,
        httponly=True,
        secure=settings.cookie_secure,
        domain=settings.cookie_domain,
        samesite=settings.cookie_samesite,
        max_age=settings.access_token_expire_minutes * 60,
    )
    
    return user


@router.post("/logout")
async def logout(response: Response):
    """Clear HttpOnly cookie."""
    response.delete_cookie(
        key="nf_access_token",
        domain=settings.cookie_domain,
        secure=settings.cookie_secure,
        httponly=True,
        samesite=settings.cookie_samesite,
    )
    return {"status": "success", "message": "Logged out successfully"}


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    """Get current logged in user."""
    return current_user
