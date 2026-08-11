"""
NeuralFlix Server-Side Authorization — core/authorization.py

Provides FastAPI dependencies for role-based access control.
Admin checks are performed server-side, never trusting frontend middleware alone.

Usage:
    from core.authorization import require_admin

    @router.get("/admin/metrics")
    async def admin_metrics(admin=Depends(require_admin)):
        ...
"""

from fastapi import Depends, HTTPException, status
from core.security import get_current_user_id
from database import users_collection


async def require_admin(user_id: str = Depends(get_current_user_id)):
    """
    FastAPI dependency that verifies the current user has admin privileges.
    Returns the full user document if admin, raises 403 otherwise.
    """
    user = await users_collection.find_one({"id": user_id})

    if not user or not user.get("is_admin", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrator access required"
        )

    return user
