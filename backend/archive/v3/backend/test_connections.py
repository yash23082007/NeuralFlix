import os
import asyncio
import requests
from dotenv import load_dotenv
from sqlalchemy import text

# Load environment variables
load_dotenv()

async def test_sql_connection():
    print("Testing SQL Database Connection...")
    try:
        from database import async_engine, async_session_factory
        async with async_session_factory() as session:
            result = await session.execute(text("SELECT 1"))
            val = result.scalar()
            if val == 1:
                print(f"[OK] SQL Database: Connected successfully (Dialect: {async_engine.dialect.name}).")
            else:
                print("[ERROR] SQL Database: Connection returned unexpected result.")
    except Exception as e:
        print(f"[ERROR] SQL Database: Connection failed. Error: {e}")

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
    print("--- Running Backend SQL Connection Diagnostics ---")
    await test_sql_connection()
    test_tmdb()
    print("---------------------------------------------")

if __name__ == "__main__":
    asyncio.run(main())
