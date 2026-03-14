import sys
import os
import math
import random
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import movies_collection, init_db

# Simulated lightweight movie data to stay well under 512MB limits.
# In a real scenario, this would read from a CSV and insert in batches.
MOCK_MOVIES = [
    {
        "_id": "tt1375666",
        "title": "Inception",
        "year": 2010,
        "language": "en",
        "genres": ["Action", "Sci-Fi", "Thriller"],
        "rating": 8.8,
        "votes": 2300000,
        "platforms": ["Netflix", "Amazon Prime Video"],
        "poster_url": "/9gk7adZA28wvK2503a494jk0693.jpg",
        "overview": "A thief who steals corporate secrets through the use of dream-sharing technology is given the inverse task of planting an idea into the mind of a C.E.O."
    },
    {
        "_id": "tt0133093",
        "title": "The Matrix",
        "year": 1999,
        "language": "en",
        "genres": ["Action", "Sci-Fi"],
        "rating": 8.7,
        "votes": 1900000,
        "platforms": ["Hulu", "Amazon Prime Video"],
        "poster_url": "/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg",
        "overview": "When a beautiful stranger leads computer hacker Neo to a forbidding underworld, he discovers the shocking truth--the life he knows is the elaborate deception of an evil cyber-intelligence."
    },
    {
        "_id": "tt0816692",
        "title": "Interstellar",
        "year": 2014,
        "language": "en",
        "genres": ["Adventure", "Drama", "Sci-Fi"],
        "rating": 8.6,
        "votes": 1700000,
        "platforms": ["Paramount+", "Amazon Prime Video"],
        "poster_url": "/gEU2QniE6E77NI6lCU6MvrId2wK.jpg",
        "overview": "A team of explorers travel through a wormhole in space in an attempt to ensure humanity's survival."
    },
    {
        "_id": "tt0468569",
        "title": "The Dark Knight",
        "year": 2008,
        "language": "en",
        "genres": ["Action", "Crime", "Drama"],
        "rating": 9.0,
        "votes": 2600000,
        "platforms": ["HBO Max", "Netflix"],
        "poster_url": "/qJ2tW6WMUDux911r6m7haRef0WH.jpg",
        "overview": "When the menace known as the Joker wreaks havoc and chaos on the people of Gotham, Batman must accept one of the greatest psychological and physical tests of his ability to fight injustice."
    },
    {
        "_id": "tt0111161",
        "title": "The Shawshank Redemption",
        "year": 1994,
        "language": "en",
        "genres": ["Drama"],
        "rating": 9.3,
        "votes": 2700000,
        "platforms": ["HBO Max"],
        "poster_url": "/q6y0Go1tsGEsmtFryDOJo3dEmqu.jpg",
        "overview": "Two imprisoned men bond over a number of years, finding solace and eventual redemption through acts of common decency."
    }
]

def calculate_popularity(rating: float, votes: int) -> float:
    """ Popularity Score = Average Rating * log10(Total Votes) """
    if votes <= 0:
        return 0.0
    return round(rating * math.log10(votes), 2)

def seed():
    print("Initializing Database...")
    init_db()
    
    print("Dropping existing movies collection for clean seed...")
    movies_collection.drop()

    print("Generating popularity scores and preparing documents...")
    documents = []
    
    # We duplicate the mock data slightly to simulate a larger set, modifying IDs and titles
    # In a real test, you would parse a 100k line CSV here. We'll generate 1000 records.
    base_len = len(MOCK_MOVIES)
    
    for i in range(100):
        for j, base_movie in enumerate(MOCK_MOVIES):
            movie = base_movie.copy()
            
            # Keep original IDs for the first batch
            if i > 0:
                movie["_id"] = f"tt{1000000 + (i * base_len) + j}"
                movie["title"] = f"{base_movie['title']} - Variant {i}"
                movie["votes"] = random.randint(1000, 2000000)
                movie["rating"] = round(random.uniform(5.0, 9.5), 1)
                
            movie["popularity_score"] = calculate_popularity(movie["rating"], movie["votes"])
            documents.append(movie)

    print(f"Executing batch insert for {len(documents)} records...")
    result = movies_collection.insert_many(documents)
    print(f"Successfully inserted {len(result.inserted_ids)} highly optimized movie documents.")
    
    # Generate some mock users and watch history to support Collaborative Filtering
    from database import users_collection, watch_history_collection
    
    users_collection.drop()
    watch_history_collection.drop()
    
    users = [{"_id": f"usr{i}", "name": f"User {i}"} for i in range(1, 11)]
    users_collection.insert_many(users)
    
    history = []
    import time
    for u in users:
        # Each user watches 5-20 random movies
        watched_count = random.randint(5, 20)
        watched_movies = random.sample(documents, watched_count)
        for m in watched_movies:
            history.append({
                "user_id": u["_id"],
                "movie_id": m["_id"],
                "rating": round(random.uniform(3.0, 5.0), 1), # Simulated high ratings
                "timestamp": time.time() - random.randint(0, 1000000)
            })
            
    watch_history_collection.insert_many(history)
    print(f"Seeded {len(users)} users and {len(history)} watch history records for collaborative filtering.")

if __name__ == "__main__":
    seed()
