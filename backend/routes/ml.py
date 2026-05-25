from collections import Counter

from fastapi import APIRouter

from database import movies_collection

router = APIRouter()


@router.get("/overview")
async def ml_overview():
    movies = await movies_collection.find({}, {"_id": 0}).limit(500).to_list(length=None)
    genres = Counter()
    regions = Counter()
    ratings = []

    for movie in movies:
        genres.update(movie.get("genres", []))
        region = movie.get("cinema_region") or movie.get("language") or "unknown"
        regions.update([region])
        rating = movie.get("rating")
        if isinstance(rating, (int, float)) and rating > 0:
            ratings.append(rating)

    avg_rating = round(sum(ratings) / len(ratings), 2) if ratings else 0

    return {
        "catalog_size": len(movies),
        "average_rating": avg_rating,
        "top_genres": [{"name": name, "count": count} for name, count in genres.most_common(8)],
        "top_regions": [{"name": name, "count": count} for name, count in regions.most_common(8)],
        "pipeline": [
            {"stage": "Candidate recall", "method": "content, collaborative, popularity"},
            {"stage": "Feature scoring", "method": "rating, recency, popularity"},
            {"stage": "Diversity pass", "method": "genre-aware MMR-lite reranking"},
            {"stage": "Serving", "method": "Redis cache with local fallback catalog"},
        ],
        "model_cards": [
            {
                "name": "Content similarity",
                "type": "TF-IDF cosine baseline",
                "status": "active",
                "purpose": "Finds films with overlapping plot and genre signals.",
            },
            {
                "name": "Collaborative filter",
                "type": "implicit feedback ranker",
                "status": "ready",
                "purpose": "Uses watch, click, and rating events when user history exists.",
            },
            {
                "name": "Hybrid ranker",
                "type": "multi-stage recommender",
                "status": "active",
                "purpose": "Combines recall candidates and scores the final shelf.",
            },
        ],
    }
