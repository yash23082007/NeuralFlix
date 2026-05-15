from fastapi import APIRouter, HTTPException, Request, Response, status
from slowapi import Limiter
from slowapi.util import get_remote_address
from pydantic import BaseModel, EmailStr
from jose import jwt
from datetime import datetime, timedelta
import asyncio
from passlib.context import CryptContext
from database import users_collection
import os
import uuid
import httpx
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
JWT_SECRET = os.getenv("JWT_SECRET", "super-secret-key-change-in-prod")
ALGORITHM = "HS256"
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
GITHUB_CLIENT_ID = os.getenv("GITHUB_CLIENT_ID", "")
GITHUB_CLIENT_SECRET = os.getenv("GITHUB_CLIENT_SECRET", "")

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
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_token(data: dict, expires_minutes: int):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=expires_minutes)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET, algorithm=ALGORITHM)

def verify_google_token(token: str):
    try:
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
            "is_admin": False,
            "created_at": datetime.utcnow()
        }
        users_collection.insert_one(user_doc)
        return user_doc
    
    user = await asyncio.to_thread(_create)
    if not user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    return {"message": "User created successfully", "user_id": user["id"]}

@router.post("/login")
@limiter.limit("10/minute")
async def login(request: Request, response: Response, body: LoginSchema):
    def _get_user():
        return users_collection.find_one({"email": body.email})
    
    user = await asyncio.to_thread(_get_user)
    if not user or not verify_password(body.password, user.get("hashed_password", "")):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    user_id = user["id"]
    access_token = create_token({"sub": user_id, "type": "access", "is_admin": user.get("is_admin", False)}, 60)
    refresh_token = create_token({"sub": user_id, "type": "refresh"}, 60 * 24 * 7) # 7 days
    
    response.set_cookie(
        "refresh_token", 
        refresh_token, 
        httponly=True, 
        secure=True, 
        samesite="lax", 
        max_age=604800
    )
    
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "user": {
            "id": user["id"],
            "email": user["email"],
            "name": user["name"],
            "is_admin": user.get("is_admin", False)
        }
    }

@router.post("/init-admin")
async def init_admin():
    """Internal utility to ensure an admin account exists for the demo."""
    admin_email = "admin@neuralflix.ai"
    def _seed():
        if users_collection.find_one({"email": admin_email}):
            return "Admin already exists"
        
        user_doc = {
            "id": "admin-id-001",
            "email": admin_email,
            "name": "NeuralFlix Admin",
            "hashed_password": get_password_hash("Admin@2025!"),
            "is_admin": True,
            "created_at": datetime.utcnow()
        }
        users_collection.insert_one(user_doc)
        return "Admin created: admin@neuralflix.ai / Admin@2025!"
    
    res = await asyncio.to_thread(_seed)
    return {"message": res}

@router.post("/google")
async def google_login(request: Request, response: Response, body: GoogleLoginSchema):
    idinfo = verify_google_token(body.id_token)
    if not idinfo:
        raise HTTPException(status_code=401, detail="Invalid Google token")
    
    email = idinfo.get("email")
    name = idinfo.get("name", "")
    
    def _get_or_create():
        user = users_collection.find_one({"email": email})
        if not user:
            user = {
                "id": str(uuid.uuid4()),
                "email": email,
                "name": name,
                "hashed_password": "", # No password for Google users
                "is_admin": False,
                "created_at": datetime.utcnow(),
                "auth_type": "google"
            }
            users_collection.insert_one(user)
        return user
    
    user = await asyncio.to_thread(_get_or_create)
    
    user_id = user["id"]
    access_token = create_token({"sub": user_id, "type": "access", "is_admin": user.get("is_admin", False)}, 60)
    refresh_token = create_token({"sub": user_id, "type": "refresh"}, 60 * 24 * 7)
    
    response.set_cookie(
        "refresh_token", 
        refresh_token, 
        httponly=True, 
        secure=True, 
        samesite="lax", 
        max_age=604800
    )
    
    return {
        "access_token": access_token, 
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
    
    def _get_or_create():
        user = users_collection.find_one({"email": email})
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
            users_collection.insert_one(user)
        return user
    
    user = await asyncio.to_thread(_get_or_create)
    
    user_id = user["id"]
    jwt_access_token = create_token({"sub": user_id, "type": "access", "is_admin": user.get("is_admin", False)}, 60)
    jwt_refresh_token = create_token({"sub": user_id, "type": "refresh"}, 60 * 24 * 7)
    
    response.set_cookie(
        "refresh_token", 
        jwt_refresh_token, 
        httponly=True, 
        secure=True, 
        samesite="lax", 
        max_age=604800
    )
    
    return {
        "access_token": jwt_access_token, 
        "token_type": "bearer",
        "user": {
            "id": user["id"],
            "email": user["email"],
            "name": user["name"],
            "is_admin": user.get("is_admin", False)
        }
    }
