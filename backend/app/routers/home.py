from fastapi import APIRouter

router = APIRouter(prefix="/api/v1/home", tags=["Home"])

@router.get("")
async def get_home():
    """Return simplified home data to avoid triggering too many API requests."""
    return {
        "featured": {},
        "trending": [],
        "topRated": [],
        "regions": {},
        "coldStartCollections": []
    }
