"""
NeuralFlix Central Authentication — core/security.py

Provides FastAPI dependencies for extracting and verifying user identity
from HttpOnly cookies or Authorization headers (backward compatibility).

Usage:
    from core.security import get_current_user_id

    @router.get("/protected")
    async def protected_route(user_id: str = Depends(get_current_user_id)):
        ...
"""

from fastapi import HTTPException, Request, status
from jose import jwt, JWTError
import os

JWT_SECRET = os.getenv("JWT_SECRET", "super-secret-key-change-in-prod")
ALGORITHM = "HS256"


def get_access_token(request: Request) -> str:
    """
    Extract access token from request.
    Priority: Authorization header > HttpOnly cookie.
    This allows backward compatibility during migration.
    """
    # 1. Check Authorization header (for API clients, testing)
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        return auth_header[7:]

    # 2. Check HttpOnly cookie (primary method for browser clients)
    token = request.cookies.get("access_token")
    if token:
        return token

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Authentication required"
    )


def get_current_user_id(request: Request) -> str:
    """
    FastAPI dependency that returns the authenticated user's ID.
    Decodes the JWT from the access token and validates the token type.
    """
    token = get_access_token(request)

    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[ALGORITHM])

        if payload.get("type") != "access":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token type"
            )

        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token: missing subject"
            )

        return user_id

    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )
