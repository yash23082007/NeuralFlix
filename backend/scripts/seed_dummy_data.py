import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import movies_collection, init_db

def seed_dummy_movies():
    print("Initializing Database...")
    init_db()

    dummy_movies = [
        {
            "tmdb_id": 1,
            "title": "Inception",
            "overview": "A thief who steals corporate secrets through the use of dream-sharing technology is given the inverse task of planting an idea into the mind of a C.E.O.",
            "release_date": "2010-07-16",
            "rating": 8.8,
            "popularity_score": 150.5,
            "poster_url": "https://image.tmdb.org/t/p/w500/edv5CZvWj09upOsy2Y6IwObsVNl.jpg",
            "backdrop_url": "https://image.tmdb.org/t/p/w1280/8ZTVqvKDQ8emSGUEMjsS4yHAwrp.jpg",
            "genres": ["Action", "Sci-Fi", "Adventure"],
            "language": "en",
            "year": 2010
        },
        {
            "tmdb_id": 2,
            "title": "Interstellar",
            "overview": "A team of explorers travel through a wormhole in space in an attempt to ensure humanity's survival.",
            "release_date": "2014-11-05",
            "rating": 8.6,
            "popularity_score": 140.2,
            "poster_url": "https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
            "backdrop_url": "https://image.tmdb.org/t/p/w1280/xJHokMbljvjEVAZS3xBBSSn9mG.jpg",
            "genres": ["Adventure", "Drama", "Sci-Fi"],
            "language": "en",
            "year": 2014
        },
        {
            "tmdb_id": 3,
            "title": "The Dark Knight",
            "overview": "When the menace known as the Joker wreaks havoc and chaos on the people of Gotham, Batman must accept one of the greatest psychological and physical tests of his ability to fight injustice.",
            "release_date": "2008-07-18",
            "rating": 9.0,
            "popularity_score": 130.0,
            "poster_url": "https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg",
            "backdrop_url": "https://image.tmdb.org/t/p/w1280/nMKdUUepR0i5zn0y1T4CsSB5chy.jpg",
            "genres": ["Action", "Crime", "Drama", "Thriller"],
            "language": "en",
            "year": 2008
        },
        {
            "tmdb_id": 4,
            "title": "Dune: Part Two",
            "overview": "Paul Atreides unites with Chani and the Fremen while on a warpath of revenge against the conspirators who destroyed his family.",
            "release_date": "2024-02-28",
            "rating": 8.3,
            "popularity_score": 350.0,
            "poster_url": "https://image.tmdb.org/t/p/w500/1pdfLvkbY9ohJlCjQH2TDpiO9JC.jpg",
            "backdrop_url": "https://image.tmdb.org/t/p/w1280/xOMo8BRK7PfcJv9JCnx7s5hj0PX.jpg",
            "genres": ["Science Fiction", "Adventure"],
            "language": "en",
            "year": 2024
        }
    ]

    print("Clearing collection...")
    movies_collection.delete_many({})

    print("Inserting mock movies...")
    movies_collection.insert_many(dummy_movies)
    print(f"Successfully inserted {len(dummy_movies)} mock movies!")

if __name__ == "__main__":
    seed_dummy_movies()
