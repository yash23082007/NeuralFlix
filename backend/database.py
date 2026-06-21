import os
import logging
import json
import asyncio
from typing import Any, AsyncGenerator, Dict, List, Optional
from dotenv import load_dotenv

from sqlalchemy import create_engine, select, func, or_, and_, desc, asc, String
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import sessionmaker as sync_sessionmaker
from sqlalchemy.orm.attributes import flag_modified
from sqlalchemy.sql import text

from db.models import Movie, User, WatchEvent, Rating

load_dotenv()
logger = logging.getLogger("DB_FACTORY")

from utils.wsl_resolver import resolve_wsl_url

# Environment Configuration
DATABASE_URL = resolve_wsl_url(os.getenv("DATABASE_URL", ""))
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
if DATABASE_URL:
    os.environ["DATABASE_URL"] = DATABASE_URL

# ─── Fallback Catalog ──────────────────────────────────────────
SAMPLE_MOVIES: List[Dict[str, Any]] = [
    {
        "_id": "872585", "tmdb_id": 872585, "title": "Oppenheimer",
        "overview": "A physicist leads the Manhattan Project and faces the moral cost of invention.",
        "year": 2023, "release_date": "2023-07-19", "runtime": 181,
        "language": "en", "cinema_region": "hollywood",
        "genres": ["Drama", "History"], "rating": 8.1, "votes": 10500,
        "popularity_score": 32.1,
        "poster_url": "https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg",
        "backdrop_url": "https://image.tmdb.org/t/p/original/fm6KqXpk3M2HVveHwCrBSSBaO0V.jpg",
        "platforms": ["Peacock", "Prime Video"], "media_type": "movie",
        "tagline": "The world forever changes.", "director": "Christopher Nolan",
    },
    {
        "_id": "693134", "tmdb_id": 693134, "title": "Dune: Part Two",
        "overview": "Paul Atreides joins the Fremen while confronting destiny, empire, and revenge.",
        "year": 2024, "release_date": "2024-02-27", "runtime": 167,
        "language": "en", "cinema_region": "hollywood",
        "genres": ["Science Fiction", "Adventure", "Drama"],
        "rating": 8.5, "votes": 7800, "popularity_score": 34.8,
        "poster_url": "https://image.tmdb.org/t/p/w500/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg",
        "backdrop_url": "https://image.tmdb.org/t/p/original/xOMo8BRK7PfcJv9JCnx7s5hj0PX.jpg",
        "platforms": ["Max", "Prime Video"], "media_type": "movie",
        "tagline": "Long live the fighters.", "director": "Denis Villeneuve",
    },
    {
        "_id": "496243", "tmdb_id": 496243, "title": "Parasite",
        "overview": "A poor family infiltrates a wealthy household in a thriller about class and survival.",
        "year": 2019, "release_date": "2019-05-30", "runtime": 133,
        "language": "ko", "cinema_region": "korean",
        "genres": ["Thriller", "Drama", "Comedy"], "rating": 8.5, "votes": 18500,
        "popularity_score": 35.9,
        "poster_url": "https://image.tmdb.org/t/p/w500/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg",
        "backdrop_url": "https://image.tmdb.org/t/p/original/TU9NIjwzjoKPwQHoHshkFcQUCG.jpg",
        "platforms": ["Hulu", "Max"], "media_type": "movie",
        "tagline": "Act like you own the place.", "director": "Bong Joon Ho",
    },
    {
        "_id": "670", "tmdb_id": 670, "title": "Oldboy",
        "overview": "After fifteen years of captivity, a man hunts for the truth behind his imprisonment.",
        "year": 2003, "release_date": "2003-11-21", "runtime": 120,
        "language": "ko", "cinema_region": "korean",
        "genres": ["Thriller", "Mystery", "Action"], "rating": 8.3, "votes": 8400,
        "popularity_score": 28.5,
        "poster_url": "https://image.tmdb.org/t/p/w500/pWDtjs568ZfOTMbURQBYuT4Qxka.jpg",
        "backdrop_url": "https://image.tmdb.org/t/p/original/rr7E0NoGKxvbkb89eR1GwfoYjpA.jpg",
        "platforms": ["MUBI"], "media_type": "movie", "director": "Park Chan-wook",
    },
    {
        "_id": "129", "tmdb_id": 129, "title": "Spirited Away",
        "overview": "A young girl enters a spirit world and fights to free her parents.",
        "year": 2001, "release_date": "2001-07-20", "runtime": 125,
        "language": "ja", "cinema_region": "japanese",
        "genres": ["Animation", "Fantasy", "Family"], "rating": 8.5, "votes": 16000,
        "popularity_score": 34.0,
        "poster_url": "https://image.tmdb.org/t/p/w500/39wmItIWsg5sZMyRUHLkWBcuVCM.jpg",
        "backdrop_url": "https://image.tmdb.org/t/p/original/Ab8mkHmkYADjU7wQiOkia9BzGvS.jpg",
        "platforms": ["Netflix", "Max"], "media_type": "movie", "director": "Hayao Miyazaki",
    },
    {
        "_id": "4935", "tmdb_id": 4935, "title": "Howl's Moving Castle",
        "overview": "A young woman cursed into old age finds refuge with a wandering wizard.",
        "year": 2004, "release_date": "2004-09-09", "runtime": 119,
        "language": "ja", "cinema_region": "japanese",
        "genres": ["Animation", "Fantasy", "Romance"], "rating": 8.4, "votes": 9700,
        "popularity_score": 31.1,
        "poster_url": "https://image.tmdb.org/t/p/w500/TkTPELv4kC3u1lkloush8skOjE.jpg",
        "backdrop_url": "https://image.tmdb.org/t/p/original/hjlvbMKhQm7NMLQGR7uO5J6pG7A.jpg",
        "platforms": ["Netflix", "Max"], "media_type": "movie", "director": "Hayao Miyazaki",
    },
    {
        "_id": "238", "tmdb_id": 238, "title": "The Godfather",
        "overview": "The aging patriarch of a crime dynasty transfers control to his reluctant son.",
        "year": 1972, "release_date": "1972-03-14", "runtime": 175,
        "language": "en", "cinema_region": "hollywood",
        "genres": ["Crime", "Drama"], "rating": 8.7, "votes": 20500,
        "popularity_score": 37.5,
        "poster_url": "https://image.tmdb.org/t/p/w500/3bhkrj58Vtu7enYsRolD1fZdja1.jpg",
        "backdrop_url": "https://image.tmdb.org/t/p/original/tmU7GeKVybMWFButWEGl2M4GeiP.jpg",
        "platforms": ["Paramount+", "Prime Video"], "media_type": "movie",
        "director": "Francis Ford Coppola",
    },
    {
        "_id": "27205", "tmdb_id": 27205, "title": "Inception",
        "overview": "A thief who steals secrets through dreams is offered a final impossible job.",
        "year": 2010, "release_date": "2010-07-15", "runtime": 148,
        "language": "en", "cinema_region": "hollywood",
        "genres": ["Science Fiction", "Action", "Thriller"], "rating": 8.4, "votes": 37000,
        "popularity_score": 38.3,
        "poster_url": "https://image.tmdb.org/t/p/w500/oYuLEt3zVCKq57qu2F8dT7NIa6f.jpg",
        "backdrop_url": "https://image.tmdb.org/t/p/original/8ZTVqvKDQ8emSGUEMjsS4yHAwrp.jpg",
        "platforms": ["Netflix", "Prime Video"], "media_type": "movie",
        "director": "Christopher Nolan",
    },
    {
        "_id": "24428", "tmdb_id": 24428, "title": "The Avengers",
        "overview": "Earth's mightiest heroes assemble to stop a global threat.",
        "year": 2012, "release_date": "2012-04-25", "runtime": 143,
        "language": "en", "cinema_region": "hollywood",
        "genres": ["Action", "Adventure", "Science Fiction"], "rating": 7.7, "votes": 31000,
        "popularity_score": 31.2,
        "poster_url": "https://image.tmdb.org/t/p/w500/RYMX2wcKCBAr24UyPD7xwmjaTn.jpg",
        "backdrop_url": "https://image.tmdb.org/t/p/original/9BBTo63ANSmhC4e6r62OJFuK2GL.jpg",
        "platforms": ["Disney+"], "media_type": "movie",
    },
    {
        "_id": "545611", "tmdb_id": 545611, "title": "Everything Everywhere All at Once",
        "overview": "A laundromat owner is pulled into a multiverse fight for her family and identity.",
        "year": 2022, "release_date": "2022-03-24", "runtime": 140,
        "language": "en", "cinema_region": "hollywood",
        "genres": ["Action", "Comedy", "Science Fiction"], "rating": 7.8, "votes": 7200,
        "popularity_score": 29.8,
        "poster_url": "https://image.tmdb.org/t/p/w500/w3LxiVYdWWRvEVdn5RYq6jIqkb1.jpg",
        "backdrop_url": "https://image.tmdb.org/t/p/original/ss0Os3uWJfQAENILHZUdX8Tt1OC.jpg",
        "platforms": ["Paramount+", "Prime Video"], "media_type": "movie",
    },
    {
        "_id": "579974", "tmdb_id": 579974, "title": "RRR",
        "overview": "Two revolutionaries forge a friendship before fighting an empire.",
        "year": 2022, "release_date": "2022-03-24", "runtime": 187,
        "language": "te", "cinema_region": "tollywood", "indian_industry": "tollywood",
        "genres": ["Action", "Drama"], "rating": 7.8, "votes": 1600, "popularity_score": 21.0,
        "poster_url": "https://image.tmdb.org/t/p/w500/nEufeZlyAOLqO2brrs0yeF1lgXO.jpg",
        "backdrop_url": "https://image.tmdb.org/t/p/original/i0Y0wP8H6SRgjr6QmuwbtQbS24D.jpg",
        "platforms": ["Netflix", "ZEE5"], "media_type": "movie", "director": "S. S. Rajamouli",
    },
    {
        "_id": "26022", "tmdb_id": 26022, "title": "My Name Is Khan",
        "overview": "A man with Asperger syndrome travels across America to repair a broken world.",
        "year": 2010, "release_date": "2010-02-10", "runtime": 165,
        "language": "hi", "cinema_region": "bollywood", "indian_industry": "bollywood",
        "genres": ["Drama", "Romance"], "rating": 8.0, "votes": 1200, "popularity_score": 19.6,
        "poster_url": "https://image.tmdb.org/t/p/w500/5Y36lCiNyyV71mjq6LavgiggbhT.jpg",
        "backdrop_url": "https://image.tmdb.org/t/p/original/vU1YxQw6Q0EvkgV4YQGQQpDoM5J.jpg",
        "platforms": ["Prime Video"], "media_type": "movie",
    },
    {
        "_id": "140420", "tmdb_id": 140420, "title": "The Lunchbox",
        "overview": "A mistaken lunch delivery starts an intimate correspondence in Mumbai.",
        "year": 2013, "release_date": "2013-09-20", "runtime": 104,
        "language": "hi", "cinema_region": "indian",
        "genres": ["Drama", "Romance"], "rating": 7.8, "votes": 900, "popularity_score": 17.2,
        "poster_url": "https://image.tmdb.org/t/p/w500/jSOiz1h97i3qwjZJXY8SeLvjPsl.jpg",
        "backdrop_url": "https://image.tmdb.org/t/p/original/fJ5ZSy6V4vgLzHkM5n85jc7vwdN.jpg",
        "platforms": ["Netflix", "Prime Video"], "media_type": "movie",
    },
    {
        "_id": "372058", "tmdb_id": 372058, "title": "Your Name.",
        "overview": "Two teenagers mysteriously swap bodies and search for one another across time.",
        "year": 2016, "release_date": "2016-08-26", "runtime": 106,
        "language": "ja", "cinema_region": "japanese",
        "genres": ["Animation", "Romance", "Drama"], "rating": 8.5, "votes": 11500,
        "popularity_score": 33.4,
        "poster_url": "https://image.tmdb.org/t/p/w500/q719jXXEzOoYaps6babgKnONONX.jpg",
        "backdrop_url": "https://image.tmdb.org/t/p/original/iQlJyRecJeGGzQGT2rEcyAgz89F.jpg",
        "platforms": ["Crunchyroll"], "media_type": "movie",
    },
    {
        "_id": "149870", "tmdb_id": 149870, "title": "The Tale of The Princess Kaguya",
        "overview": "A tiny girl discovered in bamboo grows into a princess with a heartbreaking destiny.",
        "year": 2013, "release_date": "2013-11-23", "runtime": 137,
        "language": "ja", "cinema_region": "japanese",
        "genres": ["Animation", "Drama", "Fantasy"], "rating": 8.1, "votes": 1800,
        "popularity_score": 20.5,
        "poster_url": "https://image.tmdb.org/t/p/w500/mWRQNlWXYYfd2z4FRm99MsgHgiA.jpg",
        "backdrop_url": "https://image.tmdb.org/t/p/original/jLq0ol1f0ZKXni9R9GsPBcyPrNN.jpg",
        "platforms": ["Max"], "media_type": "movie",
    },
    {
        "_id": "77877", "tmdb_id": 77877, "title": "The Intouchables",
        "overview": "An aristocrat and his caregiver build a life-changing friendship.",
        "year": 2011, "release_date": "2011-11-02", "runtime": 113,
        "language": "fr", "cinema_region": "french",
        "genres": ["Drama", "Comedy"], "rating": 8.3, "votes": 17200, "popularity_score": 33.0,
        "poster_url": "https://image.tmdb.org/t/p/w500/1QU7HKgsQbGpzsJbJK4pAVQV9F5.jpg",
        "backdrop_url": "https://image.tmdb.org/t/p/original/h6hZ2wPZVQ8oSHPzja0Tw9v5zNb.jpg",
        "platforms": ["Netflix"], "media_type": "movie",
    },
    {
        "_id": "194", "tmdb_id": 194, "title": "Amelie",
        "overview": "A shy Parisian waitress secretly improves the lives of the people around her.",
        "year": 2001, "release_date": "2001-04-25", "runtime": 122,
        "language": "fr", "cinema_region": "french",
        "genres": ["Comedy", "Romance"], "rating": 7.9, "votes": 11200, "popularity_score": 29.1,
        "poster_url": "https://image.tmdb.org/t/p/w500/nSxDa3M9aMvGVLoItzWTepQ5h5d.jpg",
        "backdrop_url": "https://image.tmdb.org/t/p/original/2qaeDhohq159m3a7DvrnHRl8E5p.jpg",
        "platforms": ["MUBI"], "media_type": "movie",
    },
    {
        "_id": "1417", "tmdb_id": 1417, "title": "Pan's Labyrinth",
        "overview": "A girl in postwar Spain discovers a mythic underworld beside human brutality.",
        "year": 2006, "release_date": "2006-10-10", "runtime": 118,
        "language": "es", "cinema_region": "spanish",
        "genres": ["Fantasy", "Drama", "War"], "rating": 7.8, "votes": 10500,
        "popularity_score": 27.6,
        "poster_url": "https://image.tmdb.org/t/p/w500/s8C4whhKtDaJvMDcyiMvx3BIF5F.jpg",
        "backdrop_url": "https://image.tmdb.org/t/p/original/7PurMm0gUOJZ8Uk0oyuZlt1CKfJ.jpg",
        "platforms": ["Prime Video"], "media_type": "movie",
    },
    {
        "_id": "598", "tmdb_id": 598, "title": "City of God",
        "overview": "Two boys take different paths through crime, ambition, and survival in Rio.",
        "year": 2002, "release_date": "2002-08-30", "runtime": 130,
        "language": "pt", "cinema_region": "brazilian",
        "genres": ["Crime", "Drama"], "rating": 8.4, "votes": 7800, "popularity_score": 29.7,
        "poster_url": "https://image.tmdb.org/t/p/w500/k7eYdWvhYQyRQoU2TB2A2Xu2TfD.jpg",
        "backdrop_url": "https://image.tmdb.org/t/p/original/6P4H9Zs8jU4U7sCP9QQ3F2f8Ygb.jpg",
        "platforms": ["Max"], "media_type": "movie",
    },
    {
        "_id": "60243", "tmdb_id": 60243, "title": "A Separation",
        "overview": "A couple's divorce collides with care, class, law, and truth in Tehran.",
        "year": 2011, "release_date": "2011-02-15", "runtime": 123,
        "language": "fa", "cinema_region": "iranian",
        "genres": ["Drama"], "rating": 8.0, "votes": 2600, "popularity_score": 21.3,
        "poster_url": "https://image.tmdb.org/t/p/w6E34hGiJ5OydZtN9Xn3xU8tG8k.jpg",
        "backdrop_url": "https://image.tmdb.org/t/p/original/9ZlGiEKmcYrrxmiQEJDhjeT2kEW.jpg",
        "platforms": ["Prime Video"], "media_type": "movie",
    },
]

# Database Engine Init
async_engine = None
async_session_factory = None
sync_engine = None
sync_session_factory = None
_init_lock = asyncio.Lock()

def init_engines():
    global async_engine, async_session_factory, sync_engine, sync_session_factory
    if async_engine is not None:
        return

    if not DATABASE_URL or not DATABASE_URL.startswith("postgresql"):
        raise RuntimeError("Database: Postgres strictly required. Please set a valid DATABASE_URL starting with postgresql://")
        
    try:
        # Sync connection check with 3s timeout
        temp_engine = create_engine(DATABASE_URL, connect_args={"connect_timeout": 3})
        with temp_engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        logger.info("Database: Postgres active connection verified.")
    except Exception as e:
        logger.error(f"Database: Postgres connection failed ({e}). Aborting.")
        raise RuntimeError(f"Failed to connect to PostgreSQL: {e}")

    pg_url = DATABASE_URL
    async_pg_url = pg_url.replace("postgresql://", "postgresql+asyncpg://")
    sync_engine = create_engine(pg_url, pool_size=10, max_overflow=20, pool_pre_ping=True)
    async_engine = create_async_engine(async_pg_url, pool_size=10, max_overflow=20, pool_pre_ping=True)

    sync_session_factory = sync_sessionmaker(bind=sync_engine, autocommit=False, autoflush=False)
    async_session_factory = async_sessionmaker(bind=async_engine, expire_on_commit=False)


# Query builder to convert MongoDB dict filters to SQLAlchemy filters
def build_sqlalchemy_filters(model, mongo_query):
    filters = []
    if not mongo_query:
        return filters

    # Copy to avoid side-effects
    query_copy = dict(mongo_query)

    if "$or" in query_copy:
        or_filters = []
        for sub_query in query_copy["$or"]:
            sub_filters = build_sqlalchemy_filters(model, sub_query)
            if sub_filters:
                or_filters.append(and_(*sub_filters))
        if or_filters:
            filters.append(or_(*or_filters))
        del query_copy["$or"]

    if "$text" in query_copy:
        search_query = query_copy["$text"].get("$search", "")
        filters.append(or_(
            model.title.ilike(f"%{search_query}%") if hasattr(model, 'title') else False,
            model.overview.ilike(f"%{search_query}%") if hasattr(model, 'overview') else False,
            model.director.ilike(f"%{search_query}%") if hasattr(model, 'director') else False,
        ))
        del query_copy["$text"]

    for key, value in query_copy.items():
        sql_key = key
        if key in ("_id", "id"):
            sql_key = "id"
        elif key == "rating" and hasattr(model, "tmdb_rating"):
            sql_key = "tmdb_rating"
        elif key == "votes" and hasattr(model, "tmdb_votes"):
            sql_key = "tmdb_votes"
        elif key == "cast" and hasattr(model, "cast_members"):
            sql_key = "cast_members"

        if not hasattr(model, sql_key):
            if sql_key == "id" and hasattr(model, "tmdb_id"):
                sql_key = "tmdb_id"
            else:
                continue

        col = getattr(model, sql_key)
        col_type_name = str(col.type).lower()

        if isinstance(value, dict):
            if "$in" in value:
                val_list = value["$in"]
                if "int" in col_type_name or "num" in col_type_name:
                    cleaned_val_list = []
                    for v in val_list:
                        if isinstance(v, (int, float)):
                            cleaned_val_list.append(int(v))
                        elif isinstance(v, str) and v.isdigit():
                            cleaned_val_list.append(int(v))
                    val_list = cleaned_val_list
                else:
                    val_list = [str(v) for v in val_list]
                
                if val_list:
                    filters.append(col.in_(val_list))
            elif "$regex" in value:
                regex_str = value["$regex"]
                filters.append(col.ilike(f"%{regex_str}%"))
            elif "$gte" in value:
                filters.append(col >= value["$gte"])
            elif "$lte" in value:
                filters.append(col <= value["$lte"])
            elif "$ne" in value:
                filters.append(col != value["$ne"])
        else:
            if "array" in col_type_name or "json" in col_type_name:
                filters.append(col.cast(String).ilike(f"%{value}%"))
            else:
                if "int" in col_type_name and isinstance(value, str) and value.isdigit():
                    value = int(value)
                filters.append(col == value)

    return filters


class SQLCursorAdapter:
    def __init__(self, query_exec_fn):
        self.query_exec_fn = query_exec_fn
        self._sort_key = None
        self._sort_direction = 1
        self._skip = 0
        self._limit = None

    def sort(self, key, direction=1):
        if isinstance(key, list) and len(key) > 0:
            self._sort_key = key[0][0]
            self._sort_direction = key[0][1]
        else:
            self._sort_key = key
            self._sort_direction = direction
        return self

    def skip(self, count):
        self._skip = count
        return self

    def limit(self, count):
        self._limit = count
        return self

    async def to_list(self, length=None):
        return await self.query_exec_fn(
            sort_key=self._sort_key,
            sort_direction=self._sort_direction,
            skip=self._skip,
            limit=self._limit or length
        )

    def __aiter__(self):
        self._iter = None
        return self

    async def __anext__(self):
        if self._iter is None:
            docs = await self.to_list()
            self._iter = iter(docs)
        try:
            return next(self._iter)
        except StopIteration:
            raise StopAsyncIteration


class SQLCollectionAdapter:
    def __init__(self, model_class):
        self.model_class = model_class

    def _serialize_to_dict(self, obj):
        if not obj:
            return None
        d = {}
        for col in obj.__table__.columns:
            if col.name == "embedding":
                continue
            val = getattr(obj, col.name)
            d[col.name] = val
        if "id" in d:
            d["_id"] = str(d["id"])
        # MongoDB/JSON key compatibility mapping
        if "tmdb_rating" in d and d["tmdb_rating"] is not None:
            d["rating"] = d["tmdb_rating"]
        if "tmdb_votes" in d and d["tmdb_votes"] is not None:
            d["votes"] = d["tmdb_votes"]
        if "cast_members" in d and d["cast_members"] is not None:
            d["cast"] = d["cast_members"]
        # Merge preferences_json keys to the root dict for User objects
        if self.model_class.__name__ == "User":
            prefs = d.get("preferences_json")
            if isinstance(prefs, dict):
                for k, v in prefs.items():
                    d[k] = v
        return d

    def _deserialize_to_model(self, doc):
        data = {}
        col_names = {col.name for col in self.model_class.__table__.columns}
        
        # Gather non-column keys for User objects to store in preferences_json
        if self.model_class.__name__ == "User":
            prefs = dict(doc.get("preferences_json") or {})
            for k, v in doc.items():
                if k not in col_names and k != "_id" and not k.startswith("$"):
                    prefs[k] = v
            data["preferences_json"] = prefs

        for col in self.model_class.__table__.columns:
            if col.name == "preferences_json" and self.model_class.__name__ == "User":
                continue
            val = None
            col_type_name = str(col.type).lower()
            
            if col.name in doc:
                val = doc[col.name]
            elif col.name == "id" and "_id" in doc:
                val = doc["_id"]
            elif col.name == "tmdb_rating" and "rating" in doc:
                val = doc["rating"]
            elif col.name == "tmdb_votes" and "votes" in doc:
                val = doc["votes"]
            elif col.name == "cast_members" and "cast" in doc:
                val = doc["cast"]
            else:
                continue

            # Strict SQL type-casting for target column
            if val is not None:
                if "int" in col_type_name:
                    if isinstance(val, str) and (val.isdigit() or (val.startswith("-") and val[1:].isdigit())):
                        val = int(val)
                    elif isinstance(val, float):
                        val = int(val)
                elif "float" in col_type_name or "numeric" in col_type_name:
                    if isinstance(val, str):
                        try:
                            val = float(val)
                        except ValueError:
                            pass
                elif "str" in col_type_name or "varchar" in col_type_name:
                    if not isinstance(val, str):
                        val = str(val)
                        
            data[col.name] = val

        # SQL constraint safety harness for seeders and mock data
        if self.model_class.__name__ == "User":
            if not data.get("email"):
                user_id = data.get("id") or doc.get("_id") or "unknown"
                data["email"] = f"{user_id}@neuralflix.ai"
            if not data.get("hashed_password"):
                data["hashed_password"] = "no-password-seeded"

        return self.model_class(**data)

    async def create_index(self, keys, name=None, unique=False, sparse=False, weights=None):
        logger.info(f"create_index stub called on {self.model_class.__name__} for index name: {name}")
        return None

    async def find_one(self, query=None, projection=None):
        init_engines()
        filters = build_sqlalchemy_filters(self.model_class, query or {})
        async with async_session_factory() as session:
            stmt = select(self.model_class)
            if filters:
                stmt = stmt.where(*filters)
            result = await session.execute(stmt)
            obj = result.scalars().first()
            return self._serialize_to_dict(obj)

    def find(self, query=None, projection=None):
        async def _query_exec(sort_key=None, sort_direction=1, skip=0, limit=None):
            init_engines()
            filters = build_sqlalchemy_filters(self.model_class, query or {})
            async with async_session_factory() as session:
                stmt = select(self.model_class)
                if filters:
                    stmt = stmt.where(*filters)

                if sort_key:
                    if sort_key == "_id":
                        sort_key = "id"
                    elif sort_key == "rating" and hasattr(self.model_class, "tmdb_rating"):
                        sort_key = "tmdb_rating"
                    elif sort_key == "votes" and hasattr(self.model_class, "tmdb_votes"):
                        sort_key = "tmdb_votes"
                    elif sort_key == "cast" and hasattr(self.model_class, "cast_members"):
                        sort_key = "cast_members"

                    if hasattr(self.model_class, sort_key):
                        col = getattr(self.model_class, sort_key)
                        stmt = stmt.order_by(desc(col) if sort_direction < 0 else asc(col))

                if skip:
                    stmt = stmt.offset(skip)
                if limit:
                    stmt = stmt.limit(limit)
                else:
                    stmt = stmt.limit(1000)

                result = await session.execute(stmt)
                objs = result.scalars().all()
                return [self._serialize_to_dict(o) for o in objs]

        return SQLCursorAdapter(_query_exec)

    async def insert_one(self, doc):
        init_engines()
        obj = self._deserialize_to_model(doc)
        async with async_session_factory() as session:
            session.add(obj)
            await session.commit()
            await session.refresh(obj)
            inserted_id = getattr(obj, "id", None)
            return type("InsertOneResult", (), {"inserted_id": str(inserted_id)})()

    async def insert_many(self, documents, ordered=False):
        init_engines()
        objs = [self._deserialize_to_model(doc) for doc in documents]
        async with async_session_factory() as session:
            session.add_all(objs)
            await session.commit()
            inserted_ids = [str(getattr(obj, "id", None)) for obj in objs]
            return type("InsertManyResult", (), {"inserted_ids": inserted_ids})()

    async def delete_many(self, query):
        init_engines()
        filters = build_sqlalchemy_filters(self.model_class, query or {})
        async with async_session_factory() as session:
            stmt = select(self.model_class)
            if filters:
                stmt = stmt.where(*filters)
            result = await session.execute(stmt)
            objs = result.scalars().all()
            deleted_count = len(objs)
            for obj in objs:
                await session.delete(obj)
            await session.commit()
            return type("DeleteResult", (), {"deleted_count": deleted_count})()

    async def update_one(self, query, update, upsert=False):
        init_engines()
        filters = build_sqlalchemy_filters(self.model_class, query or {})
        async with async_session_factory() as session:
            stmt = select(self.model_class)
            if filters:
                stmt = stmt.where(*filters)
            result = await session.execute(stmt)
            obj = result.scalars().first()

            set_fields = {}
            add_to_set_fields = {}
            pull_fields = {}

            if isinstance(update, dict):
                set_fields = update.get("$set", {})
                add_to_set_fields = update.get("$addToSet", {})
                pull_fields = update.get("$pull", {})
                # If there are no operator keys at all, treat the whole dictionary as set fields
                if not any(k.startswith("$") for k in update.keys()):
                    set_fields = update
            else:
                set_fields = update

            if obj:
                # 1. Handle standard $set / set fields
                for k, v in set_fields.items():
                    sql_k = k
                    if k in ("_id", "id"):
                        sql_k = "id"
                    elif k == "rating":
                        sql_k = "tmdb_rating"
                    elif k == "votes":
                        sql_k = "tmdb_votes"
                    elif k == "cast":
                        sql_k = "cast_members"
                        
                    if hasattr(obj, sql_k):
                        col = self.model_class.__table__.columns.get(sql_k)
                        if col is not None and hasattr(col, "type"):
                            col_type_name = str(col.type).lower()
                            if v is not None:
                                if "int" in col_type_name:
                                    if isinstance(v, str) and (v.isdigit() or (v.startswith("-") and v[1:].isdigit())):
                                        v = int(v)
                                    elif isinstance(v, float):
                                        v = int(v)
                                elif "float" in col_type_name or "numeric" in col_type_name:
                                    if isinstance(v, str):
                                        try:
                                            v = float(v)
                                        except ValueError:
                                            pass
                                elif "str" in col_type_name or "varchar" in col_type_name:
                                    if not isinstance(v, str):
                                        v = str(v)
                        if sql_k == "id" and getattr(obj, "id") == v:
                            continue
                        setattr(obj, sql_k, v)
                    elif self.model_class.__name__ == "User":
                        if obj.preferences_json is None:
                            obj.preferences_json = {}
                        if "." in k:
                            parts = k.split(".")
                            current = obj.preferences_json
                            for part in parts[:-1]:
                                if part not in current or not isinstance(current[part], dict):
                                    current[part] = {}
                                current = current[part]
                            current[parts[-1]] = v
                        else:
                            obj.preferences_json[k] = v
                        flag_modified(obj, "preferences_json")

                # 2. Handle $addToSet
                for k, v in add_to_set_fields.items():
                    if self.model_class.__name__ == "User":
                        if obj.preferences_json is None:
                            obj.preferences_json = {}
                        if k not in obj.preferences_json or not isinstance(obj.preferences_json[k], list):
                            obj.preferences_json[k] = []
                        if v not in obj.preferences_json[k]:
                            obj.preferences_json[k].append(v)
                        flag_modified(obj, "preferences_json")
                    elif hasattr(obj, k) and isinstance(getattr(obj, k), list):
                        arr = getattr(obj, k) or []
                        if v not in arr:
                            setattr(obj, k, arr + [v])

                # 3. Handle $pull
                for k, v in pull_fields.items():
                    if self.model_class.__name__ == "User":
                        if obj.preferences_json and k in obj.preferences_json and isinstance(obj.preferences_json[k], list):
                            if v in obj.preferences_json[k]:
                                obj.preferences_json[k].remove(v)
                                flag_modified(obj, "preferences_json")
                    elif hasattr(obj, k) and isinstance(getattr(obj, k), list):
                        arr = getattr(obj, k) or []
                        if v in arr:
                            setattr(obj, k, [x for x in arr if x != v])

                await session.commit()
                return type("UpdateResult", (), {"modified_count": 1, "matched_count": 1})()
            elif upsert:
                new_doc = {}
                for k, v in query.items():
                    if not k.startswith("$"):
                        new_doc[k] = v
                for k, v in set_fields.items():
                    new_doc[k] = v
                for k, v in add_to_set_fields.items():
                    if k not in new_doc:
                        new_doc[k] = [v]
                    elif isinstance(new_doc[k], list) and v not in new_doc[k]:
                        new_doc[k].append(v)

                new_obj = self._deserialize_to_model(new_doc)
                session.add(new_obj)
                await session.commit()
                await session.refresh(new_obj)
                inserted_id = getattr(new_obj, "id", None)
                return type("UpdateResult", (), {
                    "modified_count": 0,
                    "matched_count": 0,
                    "upserted_id": str(inserted_id)
                })()

            return type("UpdateResult", (), {"modified_count": 0, "matched_count": 0})()

    async def count_documents(self, query=None):
        init_engines()
        filters = build_sqlalchemy_filters(self.model_class, query or {})
        async with async_session_factory() as session:
            stmt = select(func.count()).select_from(self.model_class)
            if filters:
                stmt = stmt.where(*filters)
            result = await session.execute(stmt)
            count = result.scalar() or 0
            return count

    def aggregate(self, pipeline):
        async def _query_exec(sort_key=None, sort_direction=1, skip=0, limit=None):
            init_engines()
            async with async_session_factory() as session:
                stmt = select(self.model_class.genres)
                result = await session.execute(stmt)
                genres_lists = result.scalars().all()
                unique_genres = set()
                for genres in genres_lists:
                    if not genres:
                        continue
                    if isinstance(genres, list):
                        for g in genres:
                            if g:
                                unique_genres.add(g)
                    elif isinstance(genres, str):
                        try:
                            lst = json.loads(genres)
                            if isinstance(lst, list):
                                for g in lst:
                                    if g:
                                        unique_genres.add(g)
                            else:
                                unique_genres.add(genres)
                        except Exception:
                            for g in genres.split(","):
                                if g.strip():
                                    unique_genres.add(g.strip())
                sorted_genres = sorted(list(unique_genres))
                return [{"_id": g} for g in sorted_genres]

        return SQLCursorAdapter(_query_exec)

    def drop(self):
        # Seed and test scripts use drop() to clear collections.
        # We can implement this via truncate or delete all rows.
        init_engines()
        sync_session = sync_session_factory()
        try:
            sync_session.query(self.model_class).delete()
            sync_session.commit()
        except Exception as e:
            sync_session.rollback()
            logger.warning(f"Error dropping database table for model {self.model_class.__name__}: {e}")
        finally:
            sync_session.close()


# Instantiate Adapters
movies_collection = SQLCollectionAdapter(Movie)
users_collection = SQLCollectionAdapter(User)
watch_history_collection = SQLCollectionAdapter(WatchEvent)
recommendations_collection = SQLCollectionAdapter(Rating)  # Simple fallback map

def get_db():
    return None  # No longer returns Mongo DB object

async def get_async_session() -> AsyncGenerator[AsyncSession, None]:
    init_engines()
    async with async_session_factory() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()

def get_movies_collection():
    return movies_collection

def get_users_collection():
    return users_collection

def get_recommendations_collection():
    return recommendations_collection

def get_watch_history_collection():
    return watch_history_collection


# SessionLocal sync helper
SessionLocal = None

def init_sync_session_local():
    global SessionLocal
    init_engines()
    SessionLocal = sync_session_factory

# Run init at import
init_engines()
init_sync_session_local()


async def auto_seed_if_empty():
    async with async_session_factory() as session:
        count_stmt = select(func.count(Movie.id))
        count_result = await session.execute(count_stmt)
        count = count_result.scalar() or 0
        if count == 0:
            logger.info("Movies table is empty. Seeding fallback SAMPLE_MOVIES...")
            db_movies = []
            for m in SAMPLE_MOVIES:
                db_movies.append(Movie(
                    tmdb_id=m["tmdb_id"],
                    title=m["title"],
                    overview=m.get("overview", ""),
                    tagline=m.get("tagline", ""),
                    genres=m.get("genres", []),
                    language=m.get("language", "en"),
                    release_date=m.get("release_date"),
                    runtime=m.get("runtime"),
                    poster_url=m.get("poster_url"),
                    backdrop_url=m.get("backdrop_url"),
                    tmdb_rating=m.get("rating", 0.0),
                    tmdb_votes=m.get("votes", 0),
                    popularity_score=m.get("popularity_score", 0.0),
                    platforms=m.get("platforms", []),
                    director=m.get("director", ""),
                    year=m.get("year"),
                    cinema_region=m.get("cinema_region")
                ))
            session.add_all(db_movies)
            await session.commit()
            logger.info(f"Seeded {len(db_movies)} movies successfully.")


async def init_db():
    """Create all SQL tables and indexes if they do not exist."""
    from db.models import Base
    init_engines()
    # Create all tables in the bound database (PostgreSQL/SQLite)
    Base.metadata.create_all(bind=sync_engine)
    logger.info("All SQL database tables and indexes verified/created")

