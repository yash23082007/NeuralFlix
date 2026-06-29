import asyncio
import httpx
import os
import sys

# Ensure we're in the right dir to run
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

async def verify_backend_data():
    print("🚀 Verifying End-to-End Live Data Integration...")
    
    # 1. Check if backend is running
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get("http://localhost:8000/v1/metrics/health")
            if resp.status_code == 200:
                print("✅ Backend is RUNNING")
            else:
                print(f"❌ Backend returned status: {resp.status_code}")
                return
    except Exception as e:
        print("❌ Backend is NOT running. Please start it using: uvicorn main:app --reload")
        print(f"Details: {e}")
        return

    # 2. Check /trending endpoint for real data fallback
    try:
        async with httpx.AsyncClient() as client:
            print("⏳ Fetching /api/v1/movies/trending...")
            resp = await client.get("http://localhost:8000/api/v1/movies/trending")
            
            if resp.status_code == 200:
                data = resp.json()
                results = data.get("results", [])
                total = data.get("total", 0)
                
                print(f"✅ /trending returned {len(results)} movies (Total catalog size: {total})")
                
                if len(results) > 0:
                    first_movie = results[0]
                    print(f"🎬 First Movie: {first_movie.get('title')} ({first_movie.get('year')})")
                    if first_movie.get('tmdb_id'):
                        print("✅ Real TMDB Data successfully fetched (TMDB ID present)!")
                    else:
                        print("⚠️ TMDB ID missing. Data might be mock/dummy.")
                else:
                    print("❌ /trending returned empty results. TMDB API Fallback failed.")
            else:
                print(f"❌ /trending returned error: {resp.status_code}")
                
    except Exception as e:
        print(f"❌ Failed to fetch trending data: {e}")

if __name__ == "__main__":
    asyncio.run(verify_backend_data())
