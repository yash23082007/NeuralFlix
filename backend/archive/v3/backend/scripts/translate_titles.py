import os
import sys
import asyncio
import sqlite3
from dotenv import load_dotenv

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from utils.tmdb_api import fetch_movie_details

load_dotenv()

async def translate_movie(sem, movie_id, tmdb_id, current_title):
    async with sem:
        try:
            details = await fetch_movie_details(tmdb_id)
            if details and details.get("title"):
                english_title = details["title"]
                if english_title != current_title:
                    print(f"[+] Translating: '{current_title}' -> '{english_title}'")
                    return movie_id, english_title, details.get("overview")
            return None
        except Exception as e:
            print(f"[-] Error fetching TMDB {tmdb_id}: {e}")
            return None

async def main():
    db_path = "backend/neuralflix.db"
    if not os.path.exists(db_path):
        db_path = "neuralflix.db"
        if not os.path.exists(db_path):
            print("❌ SQLite database file not found.")
            return

    print("📖 Querying SQLite database for movies to translate...")
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    
    # Select all movies
    cur.execute("SELECT id, tmdb_id, title FROM movies")
    rows = cur.fetchall()
    print(f"🎬 Found {len(rows)} movies in database.")

    sem = asyncio.Semaphore(30) # limit concurrency
    tasks = []
    for row in rows:
        movie_id, tmdb_id, title = row
        tasks.append(translate_movie(sem, movie_id, tmdb_id, title))

    print("⏳ Querying TMDB for English titles (concurrently)...")
    results = await asyncio.gather(*tasks)

    # Filter out None results
    updates = [r for r in results if r is not None]
    print(f"✅ Found {len(updates)} updates to apply.")

    # Apply updates to SQLite
    if updates:
        print("💾 Saving updates to SQLite database...")
        for movie_id, english_title, overview in updates:
            if overview:
                cur.execute("UPDATE movies SET title = ?, overview = ? WHERE id = ?", (english_title, overview, movie_id))
            else:
                cur.execute("UPDATE movies SET title = ? WHERE id = ?", (english_title, movie_id))
        conn.commit()
        print("✅ SQLite updates applied successfully.")
    
    conn.close()

    # Also update Postgres if active
    DATABASE_URL = os.getenv("DATABASE_URL")
    if DATABASE_URL and DATABASE_URL.startswith("postgresql"):
        print("🐘 Postgres detected! Updating Postgres records...")
        try:
            from sqlalchemy import create_engine, text
            engine = create_engine(DATABASE_URL)
            with engine.connect() as pg_conn:
                for movie_id, english_title, overview in updates:
                    # Map tmdb_id or title
                    if overview:
                        pg_conn.execute(
                            text("UPDATE movies SET title = :title, overview = :overview WHERE id = :id"),
                            {"title": english_title, "overview": overview, "id": movie_id}
                        )
                    else:
                        pg_conn.execute(
                            text("UPDATE movies SET title = :title WHERE id = :id"),
                            {"title": english_title, "id": movie_id}
                        )
                pg_conn.commit()
            print("✅ Postgres database updated successfully.")
        except Exception as e:
            print(f"❌ Failed to update Postgres: {e}")

if __name__ == "__main__":
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="ignore")
    asyncio.run(main())
