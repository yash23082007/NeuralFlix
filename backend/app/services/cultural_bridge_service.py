"""
NeuralFlix — Cultural Bridge Engine

Maps cross-regional cinema connections based on narrative motifs, 
philosophical themes, pacing, and visual atmosphere.
Never uses reductive stereotypes. Curates respectful, illuminating cinema bridges.
"""

from typing import List, Dict, Any, Optional

CULTURAL_BRIDGE_RULES = [
    {
        "source_regions": ["South Korea", "East Asia", "ko"],
        "genre_triggers": ["Thriller", "Crime", "Mystery"],
        "target_bridges": [
            {
                "region": "Scandinavia / Nordic Noir",
                "sample_titles": ["The Hunt", "Insomnia", "The Girl with the Dragon Tattoo"],
                "shared_dna": [
                    "High psychological tension and morally compromised protagonists",
                    "Bleak societal critique beneath institutional calm",
                    "Methodical, slow-reveal narrative structures"
                ],
                "explanation": "If you are captivated by Korean psychological thrillers, Nordic Noir explores similar societal dread, moral ambiguity, and relentless procedural intensity against cold, minimalist landscapes."
            },
            {
                "region": "French Neo-Polar & Courtroom Drama",
                "sample_titles": ["Anatomy of a Fall", "The Beat That My Heart Skipped", "La Haine"],
                "shared_dna": [
                    "Sharp intellect, linguistic tension, and judicial dissection",
                    "Complex character motivations where right and wrong are blurred"
                ],
                "explanation": "French crime cinema and courtroom procedurals match the intricate plot twists and deep character psychology of Korean investigative films."
            },
            {
                "region": "Indian Investigative Realism",
                "sample_titles": ["Kohrra", "Ugly", "Talvar", "Andhadhun"],
                "shared_dna": [
                    "Systemic corruption, complex family burdens, and gritty urban textures",
                    "Dark humor interwoven with serious social commentary"
                ],
                "explanation": "Indian investigative parallel cinema matches the raw urgency and class-conscious realism of Korean crime cinema."
            }
        ]
    },
    {
        "source_regions": ["India", "South Asia", "hi", "ta", "ml", "bn"],
        "genre_triggers": ["Drama", "Romance"],
        "target_bridges": [
            {
                "region": "Iranian Humanist Realism",
                "sample_titles": ["A Separation", "Taste of Cherry", "Children of Heaven"],
                "shared_dna": [
                    "Everyday domestic ethics and familial devotion",
                    "Quiet emotional power without Hollywood melodrama",
                    "Complex negotiations of tradition versus modernity"
                ],
                "explanation": "Indian intimate dramas (like The Lunchbox or Pather Panchali) share a profound spiritual and humanist kinship with Iranian cinema, finding universe-sized emotion in daily kitchen tables and city streets."
            },
            {
                "region": "Japanese Contemporary & Ozu Lineage",
                "sample_titles": ["Shoplifters", "Tokyo Story", "Drive My Car", "After Life"],
                "shared_dna": [
                    "Food as an emotional language and symbol of care",
                    "Unspoken grief and gentle, contemplative rhythms",
                    "Multigenerational households and societal expectations"
                ],
                "explanation": "Both traditions excel at showing human connection through meal preparation, silence, and gentle observation of fleeting everyday beauty."
            },
            {
                "region": "Latin American Melancholy & Realism",
                "sample_titles": ["Roma", "The Secret in Their Eyes", "Central Station"],
                "shared_dna": [
                    "Vibrant community warmth amidst socio-economic hardship",
                    "Lyrical musicality and poetic memory"
                ],
                "explanation": "Connects the rich emotional palette, family bonds, and resilience of South Asian storytelling with Latin American poetic cinema."
            }
        ]
    },
    {
        "source_regions": ["Japan", "East Asia", "ja"],
        "genre_triggers": ["Drama", "Animation", "Fantasy"],
        "target_bridges": [
            {
                "region": "European Poetic & Transcendental Cinema",
                "sample_titles": ["Wings of Desire", "Petite Maman", "Portrait of a Lady on Fire"],
                "shared_dna": [
                    "Animism, quiet moments of wonder, and visual poetry",
                    "Time as an emotional space rather than a ticking clock"
                ],
                "explanation": "Japanese cinema's reverence for space ('Ma'), atmosphere, and emotional memory finds its Western parallel in European slow and poetic cinema."
            }
        ]
    }
]

DEFAULT_GLOBAL_BRIDGE = {
    "region": "International Auteur Cinema",
    "sample_titles": ["Yi Yi", "Past Lives", "In the Mood for Love"],
    "shared_dna": [
        "Cross-cultural human empathy and delicate emotional atmospheres",
        "Visual storytelling prioritized over expository dialogue"
    ],
    "explanation": "Bridges your film with international masterworks that explore subtle interpersonal connection and memory across different cultures."
}


def find_cultural_bridges(movie_region: Optional[str], language: Optional[str], genres: List[str]) -> List[Dict[str, Any]]:
    """Return matching cultural bridge recommendations for a movie."""
    genre_set = set(genres or [])
    matches = []

    for rule in CULTURAL_BRIDGE_RULES:
        # Check region or language match
        region_matched = (
            (movie_region and movie_region in rule["source_regions"]) or
            (language and language in rule["source_regions"])
        )
        if region_matched:
            # Check genre overlap
            if any(g in genre_set for g in rule["genre_triggers"]):
                matches.extend(rule["target_bridges"])

    if not matches:
        matches.append(DEFAULT_GLOBAL_BRIDGE)

    return matches
