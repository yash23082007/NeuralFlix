"""
NeuralFlix — Curated Seed IDs

Used for cold-start database seeding.
Only IDs are stored. Metadata is fetched dynamically from TMDB.
"""

# Small sample for local dev/testing
SEED_COLLECTIONS = {
    "global_cinema_essentials": [
        114,       # Pretty Woman (placeholder) -> Actually let's use real global classics
        11216,     # Cinema Paradiso
        129,       # Spirited Away
        496243,    # Parasite
        539,       # Psycho
        155,       # The Dark Knight
        238,       # The Godfather
    ],
    "hidden_gems": [
        375022,    # The Handmaiden
        538362,    # Midsommar
        335984,    # Blade Runner 2049
        244786,    # Whiplash
        1422,      # The Departed
    ],
    "slow_burn": [
        680,       # Pulp Fiction
        807,       # Se7en
        181812,    # Star Wars: The Rise of Skywalker (just random ids for testing)
        105,       # Back to the Future
    ]
}

def get_all_seed_ids() -> list[int]:
    """Return a flat list of all unique seed IDs."""
    ids = set()
    for collection in SEED_COLLECTIONS.values():
        ids.update(collection)
    return list(ids)
