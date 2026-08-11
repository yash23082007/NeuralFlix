"""
NeuralFlix — Explanation Service

Generates human-readable explanations for why a movie was recommended.
No ML black-boxes — 100% deterministic and transparent.
"""

from app.models.movie import Movie
from app.models.taste_control import TasteControl


def generate_explanation(movie: Movie, taste: TasteControl, score: float) -> str:
    """Generate a single sentence explaining why this movie was recommended."""
    reasons = []

    # Check Taste Constellation matches
    if taste.global_taste > 70 and movie.cinema_region not in ["US", "UK", None]:
        reasons.append(f"aligns with your global taste ({movie.cinema_region})")
    
    if taste.discovery > 70 and (movie.popularity_score or 0) < 50:
        reasons.append("is an adventurous discovery")
        
    if taste.pace < 30 and "Drama" in (movie.genres or []):
        reasons.append("matches your preference for slow-burn storytelling")
        
    if taste.pace > 70 and "Action" in (movie.genres or []):
        reasons.append("matches your preference for fast-paced action")
        
    if taste.hidden_gems > 70 and (movie.tmdb_votes or 0) < 1000:
        reasons.append("is a highly-rated hidden gem")
        
    # Check simple genre matches if no specific taste sliders strongly matched
    if not reasons and movie.genres:
        genre = movie.genres[0]
        reasons.append(f"is a highly-rated {genre}")

    # Fallback
    if not reasons:
        return "Recommended based on your general profile."
        
    # Combine reasons gracefully
    if len(reasons) == 1:
        return f"This movie {reasons[0]}."
    
    return f"This movie {reasons[0]} and {reasons[1]}."
