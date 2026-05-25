from fastapi import APIRouter
from database import movies_collection

router = APIRouter()

@router.get("/")
async def get_genres():
    """Return all unique genres from the movies collection."""
    pipeline = [
        {"$unwind": "$genres"},
        {"$group": {"_id": "$genres"}},
        {"$sort": {"_id": 1}}
    ]
    cursor = movies_collection.aggregate(pipeline)
    result = await cursor.to_list(length=None)
    genres = [doc["_id"] for doc in result if doc["_id"]]
    return {"genres": genres}
