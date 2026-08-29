"""
NeuralFlix — Query Parser
Rule-based deterministic intent extractor for natural language movie discovery queries.

Examples:
- "dark sci-fi under 2 hours" -> {genres: ["Science Fiction"], tone: "dark", runtime_max: 120}
- "funny movies under 100 minutes" -> {genres: ["Comedy"], tone: "funny", runtime_max: 100}
- "korean thrillers from the 2010s" -> {region: "korean", genres: ["Thriller"], year_min: 2010, year_max: 2019}
"""

import re
from typing import Any, Dict, List, Optional


GENRE_SYNONYMS: Dict[str, str] = {
    "sci-fi": "Science Fiction",
    "scifi": "Science Fiction",
    "science fiction": "Science Fiction",
    "thriller": "Thriller",
    "action": "Action",
    "comedy": "Comedy",
    "drama": "Drama",
    "horror": "Horror",
    "romance": "Romance",
    "romantic": "Romance",
    "animation": "Animation",
    "anime": "Animation",
    "documentary": "Documentary",
    "crime": "Crime",
    "mystery": "Mystery",
    "fantasy": "Fantasy",
    "adventure": "Adventure",
    "western": "Western",
    "war": "War",
    "family": "Family",
}

REGION_KEYWORDS: Dict[str, str] = {
    "korean": "korean",
    "korea": "korean",
    "japanese": "japanese",
    "japan": "japanese",
    "indian": "indian",
    "bollywood": "bollywood",
    "tollywood": "tollywood",
    "tamil": "tamil",
    "french": "french",
    "france": "french",
    "spanish": "spanish",
    "spain": "spanish",
    "hollywood": "hollywood",
    "british": "hollywood",
    "iranian": "iranian",
    "iran": "iranian",
}

TONE_MAP: Dict[str, Dict[str, Any]] = {
    "dark": {"genres": ["Thriller", "Crime", "Mystery", "Drama"], "tone": "dark"},
    "funny": {"genres": ["Comedy", "Family"], "tone": "funny"},
    "cozy": {"genres": ["Comedy", "Romance", "Family", "Animation"], "tone": "cozy"},
    "intense": {"genres": ["Action", "Thriller", "Crime"], "tone": "intense"},
    "chill": {"genres": ["Comedy", "Animation", "Romance"], "tone": "chill"},
    "scary": {"genres": ["Horror", "Thriller"], "tone": "scary"},
    "epic": {"genres": ["Adventure", "Fantasy", "Science Fiction", "Action"], "tone": "epic"},
}


def parse_search_query(raw_query: str) -> Dict[str, Any]:
    """Parse raw search query into structured filter constraints and keywords."""
    clean_q = raw_query.strip().lower()
    parsed: Dict[str, Any] = {
        "raw": raw_query,
        "keywords": [],
        "genres": [],
        "region": None,
        "runtime_max": None,
        "year_min": None,
        "year_max": None,
        "tone": None,
    }

    # 1. Parse runtime constraints: e.g. "under 2 hours", "under 100 minutes", "< 90 min"
    runtime_match_hours = re.search(r"under\s+(\d+(?:\.\d+)?)\s*(?:hours|hrs|hr|h)", clean_q)
    if runtime_match_hours:
        hours = float(runtime_match_hours.group(1))
        parsed["runtime_max"] = int(hours * 60)
        clean_q = clean_q.replace(runtime_match_hours.group(0), "")

    runtime_match_mins = re.search(r"under\s+(\d+)\s*(?:minutes|mins|min|m)", clean_q)
    if runtime_match_mins:
        parsed["runtime_max"] = int(runtime_match_mins.group(1))
        clean_q = clean_q.replace(runtime_match_mins.group(0), "")

    # 2. Parse decade constraints: e.g. "from the 2010s", "1990s", "90s"
    decade_match = re.search(r"(?:from the\s+)?(\d{4})s", clean_q)
    if decade_match:
        decade = int(decade_match.group(1))
        parsed["year_min"] = decade
        parsed["year_max"] = decade + 9
        clean_q = clean_q.replace(decade_match.group(0), "")

    # 3. Parse specific year: e.g. "from 2022", "in 1994"
    year_match = re.search(r"(?:from|in)\s+(\d{4})", clean_q)
    if year_match:
        y = int(year_match.group(1))
        parsed["year_min"] = y
        parsed["year_max"] = y
        clean_q = clean_q.replace(year_match.group(0), "")

    # 4. Parse regions
    for word, reg in REGION_KEYWORDS.items():
        pattern = r"\b" + re.escape(word) + r"\b"
        if re.search(pattern, clean_q):
            parsed["region"] = reg
            clean_q = re.sub(pattern, "", clean_q)

    # 5. Parse tones
    for tone_word, tone_info in TONE_MAP.items():
        pattern = r"\b" + re.escape(tone_word) + r"\b"
        if re.search(pattern, clean_q):
            parsed["tone"] = tone_info["tone"]
            clean_q = re.sub(pattern, "", clean_q)

    # 6. Parse genres
    matched_genres = []
    for syn, gname in GENRE_SYNONYMS.items():
        pattern = r"\b" + re.escape(syn) + r"\b"
        if re.search(pattern, clean_q):
            if gname not in matched_genres:
                matched_genres.append(gname)
            clean_q = re.sub(pattern, "", clean_q)
    parsed["genres"] = matched_genres

    # 7. Remaining clean search terms
    tokens = [t.strip() for t in clean_q.split() if t.strip() and t not in {"movies", "films", "movie", "film", "show", "watch", "like", "something"}]
    parsed["clean_query"] = " ".join(tokens)

    return parsed
