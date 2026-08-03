import pytest

def test_recommendation_reason_structure():
    """Verify that reasons have correct types and evidence arrays."""
    from routes.why_recommended import _build_structured_reasons
    
    movie = {"genres": ["Drama", "Mystery"], "language": "ko", "popularity_score": 150}
    taste = {"hiddenGems": 30, "global": 70, "diversityBoost": True}
    pref_genres = ["Drama"]
    pref_langs = ["en"]
    
    reasons = _build_structured_reasons(movie, taste, pref_genres, pref_langs)
    
    assert len(reasons) > 0, "Should generate at least one reason"
    
    has_genre = False
    has_diversity_or_global = False
    
    for r in reasons:
        assert "type" in r
        assert "label" in r
        assert "evidence" in r
        assert isinstance(r["evidence"], list)
        
        if r["type"] == "genre_overlap":
            has_genre = True
        if r["type"] in ("country_discovery", "diversity_boost"):
            has_diversity_or_global = True
            
    assert has_genre, "Genre overlap reason should be present"
    assert has_diversity_or_global, "Global/Diversity reason should be present for Korean film"
    
def test_taste_controls_influence_score():
    """Verify that taste sliders actually change the recommendation score."""
    from ml.taste_reranker import rerank_with_taste
    
    candidates = [
        {"id": 1, "genres": ["Drama"], "language": "ko", "popularity_score": 10},
        {"id": 2, "genres": ["Action"], "language": "en", "popularity_score": 150}
    ]
    
    # Taste profile 1: Loves hidden gems and global cinema
    taste1 = {"hiddenGems": 90, "global": 90, "challenge": 50, "pace": 50, "discovery": 80}
    res1 = rerank_with_taste(candidates, taste1)
    
    # Taste profile 2: Loves popular English action
    taste2 = {"hiddenGems": 10, "global": 10, "challenge": 50, "pace": 50, "discovery": 20}
    res2 = rerank_with_taste(candidates, taste2)
    
    assert res1[0]["id"] == 1, "Global/Hidden gem profile should rank Korean indie higher"
    assert res2[0]["id"] == 2, "Popular profile should rank English blockbuster higher"
