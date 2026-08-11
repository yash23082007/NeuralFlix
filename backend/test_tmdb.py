import asyncio
import sys
from app.services.tmdb_service import search_movies, fetch_movie_details

async def test_tmdb():
    print("Testing TMDB Search...")
    try:
        results = await search_movies("Inception", page=1)
        if "results" in results and len(results["results"]) > 0:
            print(f"Search Success! Found {results['total_results']} results.")
            print(f"First result: {results['results'][0]['title']} ({results['results'][0]['id']})")
        else:
            print("Search Success but no results found.")
            sys.exit(1)
    except Exception as e:
        print(f"Search Failed: {e}")
        sys.exit(1)

    print("\nTesting TMDB Details...")
    try:
        details = await fetch_movie_details(27205) # Inception TMDB ID
        if details:
            print(f"Details Success! Title: {details.get('title')}, Tagline: {details.get('tagline')}")
        else:
            print("Details failed: movie not found")
            sys.exit(1)
    except Exception as e:
        print(f"Details Failed: {e}")
        sys.exit(1)

    print("\nTesting OMDb...")
    try:
        from app.services.omdb_service import fetch_omdb_ratings, parse_omdb_ratings
        omdb_data = await fetch_omdb_ratings("tt1375666") # Inception IMDb ID
        if omdb_data:
            ratings = parse_omdb_ratings(omdb_data)
            print(f"OMDb Success! IMDb Rating: {ratings['imdb_rating']}, RT: {ratings['rotten_tomatoes']}%, MC: {ratings['metacritic']}")
        else:
            print("OMDb test skipped or failed (API key might be missing)")
    except Exception as e:
        print(f"OMDb Failed: {e}")

if __name__ == "__main__":
    asyncio.run(test_tmdb())
