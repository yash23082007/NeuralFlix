import os
import asyncio
import requests
from dotenv import load_dotenv
from database import get_db, SessionLocal, DatabaseManager
from sqlalchemy import text

# Load environment variables
load_dotenv()

async def test_mongodb():
    print("Testing MongoDB Connection...")
    try:
        client = DatabaseManager.get_mongo_client()
        # Use await command for async motor client
        await client.admin.command('ismaster')
        print("[OK] MongoDB: Connected successfully.")
    except Exception as e:
        print(f"[ERROR] MongoDB: Connection failed. Error: {e}")

def test_postgresql():
    print("\nTesting PostgreSQL (Supabase) Connection...")
    if not SessionLocal:
        print("[ERROR] PostgreSQL: SessionLocal is None (DATABASE_URL might be missing).")
        return
        
    try:
        with SessionLocal() as session:
            result = session.execute(text("SELECT 1")).fetchone()
            if result and result[0] == 1:
                print("[OK] PostgreSQL (Supabase): Connected successfully.")
            else:
                print("[ERROR] PostgreSQL (Supabase): Connection returned unexpected result.")
    except Exception as e:
        print(f"[ERROR] PostgreSQL (Supabase): Connection failed. Error: {e}")

def test_tmdb():
    print("\nTesting TMDB API Connection...")
    api_key = os.getenv("TMDB_API_KEY")
    access_token = os.getenv("TMDB_READ_ACCESS_TOKEN")
    
    if not api_key and not access_token:
        print("[ERROR] TMDB API: Missing API keys in .env")
        return
        
    url = "https://api.tmdb.org/3/authentication"
    headers = {
        "accept": "application/json",
        "Authorization": f"Bearer {access_token}" if access_token else ""
    }
    
    try:
        if access_token:
            response = requests.get(url, headers=headers)
        else:
            response = requests.get(f"https://api.tmdb.org/3/movie/popular?api_key={api_key}&language=en-US&page=1")
            
        if response.status_code == 200:
            print("[OK] TMDB API: Connected successfully. Authentication valid.")
        else:
            print(f"[ERROR] TMDB API: Failed. Status Code: {response.status_code}, Response: {response.text}")
    except Exception as e:
        print(f"[ERROR] TMDB API: Connection failed. Error: {e}")

async def main():
    print("--- Running Backend Connection Diagnostics ---")
    await test_mongodb()
    test_postgresql()
    test_tmdb()
    print("--------------------------------------------")

if __name__ == "__main__":
    asyncio.run(main())

