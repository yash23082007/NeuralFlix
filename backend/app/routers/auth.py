"""
Movie Intelligence Platform — Auth Endpoints
Secure cookie-based authentication with rotating refresh tokens and PyJWT.
"""

import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import jwt
from jwt.exceptions import PyJWTError
import bcrypt

from app.main import limiter

from app.config import get_settings
from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.taste_control import TasteControl
from app.schemas.auth import UserCreate, UserLogin, UserResponse

settings = get_settings()
router = APIRouter(prefix="/api/v1/auth", tags=["Auth"])


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))


def get_password_hash(password: str) -> str:
    if len(password.encode("utf-8")) > 72:
        raise ValueError("Password exceeds bcrypt's 72-byte limit")
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def create_token(data: dict, expires_delta: timedelta, token_type: str = "access") -> str:
    to_encode = data.copy()
    now = datetime.now(timezone.utc)
    expire = now + expires_delta
    to_encode.update({
        "exp": expire,
        "iat": now,
        "jti": str(uuid.uuid4()),
        "type": token_type,
    })
    return jwt.encode(to_encode, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def set_auth_cookies(response: Response, user_id: str) -> tuple[str, str, str]:
    """Generate and set access and refresh cookies with proper expiry and paths."""
    access_token = create_token(
        data={"sub": user_id},
        expires_delta=timedelta(minutes=settings.access_token_expire_minutes),
        token_type="access",
    )
    refresh_jti = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    expire = now + timedelta(days=settings.refresh_token_expire_days)
    to_encode = {"sub": user_id, "exp": expire, "iat": now, "jti": refresh_jti, "type": "refresh"}
    refresh_token = jwt.encode(to_encode, settings.jwt_secret, algorithm=settings.jwt_algorithm)

    # 15-minute access token cookie
    response.set_cookie(
        key="nf_access_token",
        value=access_token,
        httponly=True,
        secure=settings.cookie_secure,
        domain=settings.cookie_domain,
        samesite=settings.cookie_samesite,  # type: ignore
        max_age=15 * 60,
        path="/",
    )

    # 30-day refresh token cookie restricted to auth endpoints
    response.set_cookie(
        key="nf_refresh_token",
        value=refresh_token,
        httponly=True,
        secure=settings.cookie_secure,
        domain=settings.cookie_domain,
        samesite=settings.cookie_samesite,  # type: ignore
        max_age=settings.refresh_token_expire_days * 86400,
        path="/api/v1/auth",
    )

    return access_token, refresh_token, refresh_jti


def clear_auth_cookies(response: Response) -> None:
    """Clear both access and refresh cookies."""
    response.delete_cookie(
        key="nf_access_token",
        domain=settings.cookie_domain,
        secure=settings.cookie_secure,
        httponly=True,
        samesite=settings.cookie_samesite,  # type: ignore
        path="/",
    )
    response.delete_cookie(
        key="nf_refresh_token",
        domain=settings.cookie_domain,
        secure=settings.cookie_secure,
        httponly=True,
        samesite=settings.cookie_samesite,  # type: ignore
        path="/api/v1/auth",
    )


@router.post("/register", response_model=UserResponse)
@limiter.limit("10/minute")
async def register(request: Request, user_in: UserCreate, response: Response, db: AsyncSession = Depends(get_db)):
    """Register a new user and set HttpOnly session cookies."""
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

    access_token, refresh_token, refresh_jti = set_auth_cookies(response, user_id)
    new_user.refresh_jti = refresh_jti
    await db.commit()
    
    return new_user


@router.post("/login", response_model=UserResponse)
@limiter.limit("5/minute")
async def login(request: Request, user_in: UserLogin, response: Response, db: AsyncSession = Depends(get_db)):
    """Login with credentials and set HttpOnly session cookies."""
    result = await db.execute(select(User).where(User.email == user_in.email))
    user = result.scalar_one_or_none()

    valid_pwd = False
    if user:
        try:
            valid_pwd = verify_password(user_in.password, user.hashed_password)
        except ValueError:
            valid_pwd = False

    if not user or not valid_pwd:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )

    access_token, refresh_token, refresh_jti = set_auth_cookies(response, user.id)
    user.refresh_jti = refresh_jti
    await db.commit()
    return user


@router.post("/refresh")
@limiter.limit("30/minute")
async def refresh_session(request: Request, response: Response, db: AsyncSession = Depends(get_db)):
    """Rotate session tokens using valid HttpOnly refresh cookie."""
    refresh_token = request.cookies.get("nf_refresh_token")
    if not refresh_token:
        # Check authorization header fallback
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            refresh_token = auth_header.split(" ")[1]

    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token missing",
        )

    try:
        payload = jwt.decode(
            refresh_token,
            settings.jwt_secret,
            algorithms=[settings.jwt_algorithm],
        )
        if payload.get("type") != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token type for refresh",
            )
        user_id: Optional[str] = payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token payload",
            )
    except PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )

    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    if user.refresh_jti != payload.get("jti"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token has been revoked",
        )

    access_token, refresh_token, refresh_jti = set_auth_cookies(response, user.id)
    user.refresh_jti = refresh_jti
    await db.commit()
    return {"status": "success", "message": "Token refreshed successfully"}


@router.post("/logout")
async def logout(response: Response):
    """Clear HttpOnly authentication cookies."""
    clear_auth_cookies(response)
    return {"status": "success", "message": "Logged out successfully"}


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    """Get current logged in user."""
    return current_user
