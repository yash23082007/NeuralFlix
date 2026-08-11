from fastapi import APIRouter, HTTPException, Request, Response, Depends, status
from slowapi import Limiter
from slowapi.util import get_remote_address
from pydantic import BaseModel, EmailStr
from jose import jwt
from datetime import datetime, timedelta
import asyncio
import bcrypt
from database import users_collection
import os
import uuid
import httpx

from core.security import get_current_user_id, JWT_SECRET, ALGORITHM


router = APIRouter()
limiter = Limiter(key_func=get_remote_address)

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
GITHUB_CLIENT_ID = os.getenv("GITHUB_CLIENT_ID", "")
GITHUB_CLIENT_SECRET = os.getenv("GITHUB_CLIENT_SECRET", "")

# Cookie configuration — configurable for dev vs production
COOKIE_SECURE = os.getenv("COOKIE_SECURE", "true").lower() == "true"
COOKIE_SAMESITE = os.getenv("COOKIE_SAMESITE", "none")

class RegisterSchema(BaseModel):
    email: EmailStr
    password: str
    name: str = ""

class LoginSchema(BaseModel):
    email: EmailStr
    password: str

class GoogleLoginSchema(BaseModel):
    id_token: str

class GithubLoginSchema(BaseModel):
    code: str

def verify_password(plain_password, hashed_password):
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception:
        return False

def get_password_hash(password):
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

def create_token(data: dict, expires_minutes: int):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=expires_minutes)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET, algorithm=ALGORITHM)

def verify_google_token(token: str):
    try:
        from google.oauth2 import id_token
        from google.auth.transport import requests as google_requests
        idinfo = id_token.verify_oauth2_token(token, google_requests.Request(), GOOGLE_CLIENT_ID)
        return idinfo
    except Exception as e:
        print(f"Google token verification failed: {e}")
        return None

class UserSchema(BaseModel):
    id: str
    email: EmailStr
    name: str
    is_admin: bool = False
    created_at: datetime


def _set_auth_cookies(response: Response, access_token: str, refresh_token: str):
    """Set HttpOnly cookies for both access and refresh tokens."""
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
        max_age=3600,
        path="/",
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
        max_age=604800,
        path="/",
    )


def _clear_auth_cookies(response: Response):
    """Clear both auth cookies."""
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")


@router.post("/register", status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
async def register(request: Request, body: RegisterSchema):
    existing_user = await users_collection.find_one({"email": body.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
        
    user_doc = {
        "id": str(uuid.uuid4()),
        "email": body.email,
        "name": body.name,
        "hashed_password": get_password_hash(body.password),
        "is_admin": False,
        "created_at": datetime.utcnow()
    }
    await users_collection.insert_one(user_doc)
    return {"message": "User created successfully", "user_id": user_doc["id"]}

@router.post("/login")
@limiter.limit("10/minute")
async def login(request: Request, response: Response, body: LoginSchema):
    user = await users_collection.find_one({"email": body.email})
    if not user or not verify_password(body.password, user.get("hashed_password", "")):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    user_id = user["id"]
    access_token = create_token({"sub": user_id, "type": "access", "is_admin": user.get("is_admin", False)}, 60)
    refresh_token = create_token({"sub": user_id, "type": "refresh"}, 60 * 24 * 7)  # 7 days
    
    _set_auth_cookies(response, access_token, refresh_token)
    
    return {
        "token_type": "bearer",
        "user": {
            "id": user["id"],
            "email": user["email"],
            "name": user["name"],
            "is_admin": user.get("is_admin", False)
        }
    }

# NOTE: POST /init-admin has been removed.
# Use backend/scripts/create_admin.py instead:
#   ADMIN_EMAIL=... ADMIN_PASSWORD=... python scripts/create_admin.py

@router.post("/google")
async def google_login(request: Request, response: Response, body: GoogleLoginSchema):
    idinfo = verify_google_token(body.id_token)
    if not idinfo:
        raise HTTPException(status_code=401, detail="Invalid Google token")
    
    email = idinfo.get("email")
    name = idinfo.get("name", "")
    
    user = await users_collection.find_one({"email": email})
    if not user:
        user = {
            "id": str(uuid.uuid4()),
            "email": email,
            "name": name,
            "hashed_password": "",  # No password for Google users
            "is_admin": False,
            "created_at": datetime.utcnow(),
            "auth_type": "google"
        }
        await users_collection.insert_one(user)
    
    user_id = user["id"]
    access_token = create_token({"sub": user_id, "type": "access", "is_admin": user.get("is_admin", False)}, 60)
    refresh_token = create_token({"sub": user_id, "type": "refresh"}, 60 * 24 * 7)
    
    _set_auth_cookies(response, access_token, refresh_token)
    
    return {
        "token_type": "bearer",
        "user": {
            "id": user["id"],
            "email": user["email"],
            "name": user["name"],
            "is_admin": user.get("is_admin", False)
        }
    }

@router.post("/github")
async def github_login(request: Request, response: Response, body: GithubLoginSchema):
    # 1. Exchange code for access token
    async with httpx.AsyncClient() as client:
        token_res = await client.post(
            "https://github.com/login/oauth/access_token",
            data={
                "client_id": GITHUB_CLIENT_ID,
                "client_secret": GITHUB_CLIENT_SECRET,
                "code": body.code,
            },
            headers={"Accept": "application/json"}
        )
        token_data = token_res.json()
        access_token = token_data.get("access_token")
        
        if not access_token:
            raise HTTPException(status_code=400, detail=f"Failed to get GitHub access token: {token_data.get('error_description', 'Unknown error')}")
        
        # 2. Get user info
        user_res = await client.get(
            "https://api.github.com/user",
            headers={"Authorization": f"token {access_token}"}
        )
        user_info = user_res.json()
        
        # 3. Get email (might be private)
        email = user_info.get("email")
        if not email:
            emails_res = await client.get(
                "https://api.github.com/user/emails",
                headers={"Authorization": f"token {access_token}"}
            )
            emails = emails_res.json()
            if isinstance(emails, list):
                primary_email = next((e["email"] for e in emails if e["primary"]), emails[0]["email"])
                email = primary_email
            else:
                raise HTTPException(status_code=400, detail="Could not retrieve email from GitHub")

    name = user_info.get("name") or user_info.get("login", "")
    
    user = await users_collection.find_one({"email": email})
    if not user:
        user = {
            "id": str(uuid.uuid4()),
            "email": email,
            "name": name,
            "hashed_password": "",
            "is_admin": False,
            "created_at": datetime.utcnow(),
            "auth_type": "github"
        }
        await users_collection.insert_one(user)
    
    user_id = user["id"]
    jwt_access_token = create_token({"sub": user_id, "type": "access", "is_admin": user.get("is_admin", False)}, 60)
    jwt_refresh_token = create_token({"sub": user_id, "type": "refresh"}, 60 * 24 * 7)
    
    _set_auth_cookies(response, jwt_access_token, jwt_refresh_token)
    
    return {
        "token_type": "bearer",
        "user": {
            "id": user["id"],
            "email": user["email"],
            "name": user["name"],
            "is_admin": user.get("is_admin", False)
        }
    }


@router.post("/refresh")
async def refresh_token(request: Request, response: Response):
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status_code=401, detail="No refresh token")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user_id = payload.get("sub")
        
        user = await users_collection.find_one({"id": user_id})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
            
        new_access = create_token({"sub": user_id, "type": "access", "is_admin": user.get("is_admin", False)}, 60)
        
        # Set the new access token as HttpOnly cookie
        response.set_cookie(
            key="access_token",
            value=new_access,
            httponly=True,
            secure=COOKIE_SECURE,
            samesite=COOKIE_SAMESITE,
            max_age=3600,
            path="/",
        )
        
        return {"token_type": "bearer", "message": "Token refreshed"}
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")


@router.get("/me")
async def get_current_user(user_id: str = Depends(get_current_user_id)):
    user = await users_collection.find_one({"id": user_id}, {"hashed_password": 0, "_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.post("/logout")
async def logout(response: Response):
    _clear_auth_cookies(response)
    return {"message": "Logged out"}


@router.put("/me")
async def update_profile(request: Request, body: dict, user_id: str = Depends(get_current_user_id)):
    allowed_keys = {"name", "avatar_url", "preferred_language", "region"}
    updates = {k: v for k, v in body.items() if k in allowed_keys}
    if updates:
        await users_collection.update_one({"id": user_id}, {"$set": updates})
        
    return {"message": "Profile updated"}
