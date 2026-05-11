import copy
import logging
import os
from typing import Any, AsyncGenerator, Dict, Iterable, List, Optional

from dotenv import load_dotenv
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from tenacity import retry, stop_after_attempt, wait_exponential

load_dotenv()

logger = logging.getLogger("DB_FACTORY")

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DATABASE_URL = os.getenv("DATABASE_URL", "")
ASYNC_DATABASE_URL = (
    DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://")
    if DATABASE_URL else ""
)
MONGO_TIMEOUT_MS = int(os.getenv("MONGO_TIMEOUT_MS", "1000"))
MONGO_CONNECT_ATTEMPTS = int(os.getenv("MONGO_CONNECT_ATTEMPTS", "1"))
DEMO_MODE = os.getenv("NEURALFLIX_DEMO_MODE", "true").lower()
ALLOW_EMPTY_MONGO = os.getenv("NEURALFLIX_ALLOW_EMPTY_MONGO", "false").lower() == "true"


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
        "poster_url": "https://image.tmdb.org/t/p/w500/w6E34hGiJ5OydZtN9Xn3xU8tG8k.jpg",
        "backdrop_url": "https://image.tmdb.org/t/p/original/9ZlGiEKmcYrrxmiQEJDhjeT2kEW.jpg",
        "platforms": ["Prime Video"], "media_type": "movie",
    },
]


class _InMemoryCursor:
    __slots__ = ("_docs",)
    def __init__(self, docs: Iterable[Dict[str, Any]]):
        self._docs = list(docs)

    def sort(self, key: str, direction: int):
        reverse = direction < 0
        self._docs.sort(key=lambda item: item.get(key) or 0, reverse=reverse)
        return self

    def skip(self, count: int):
        self._docs = self._docs[count:]
        return self

    def limit(self, count: int):
        self._docs = self._docs[:count]
        return self

    def __iter__(self):
        return iter(self._docs)

    def __len__(self):
        return len(self._docs)


def _field_matches(value: Any, condition: Any) -> bool:
    if isinstance(condition, dict):
        if "$in" in condition:
            options = condition["$in"]
            if isinstance(value, list):
                return any(item in options for item in value)
            return value in options
        if "$regex" in condition:
            needle = str(condition["$regex"]).lower()
            if isinstance(value, list):
                return any(needle in str(item).lower() for item in value)
            return needle in str(value or "").lower()
        if "$gte" in condition and not (value is not None and value >= condition["$gte"]):
            return False
        if "$lte" in condition and not (value is not None and value <= condition["$lte"]):
            return False
        return True
    if isinstance(value, list):
        return condition in value
    return value == condition


def _matches(doc: Dict[str, Any], query: Optional[Dict[str, Any]]) -> bool:
    if not query:
        return True
    if "$or" in query:
        return any(_matches(doc, sub) for sub in query["$or"])
    if "$text" in query:
        needle = str(query["$text"].get("$search", "")).lower()
        haystack = " ".join([
            str(doc.get("title", "")), str(doc.get("overview", "")),
            " ".join(doc.get("genres", [])), str(doc.get("cinema_region", "")),
        ]).lower()
        return needle in haystack
    for key, condition in query.items():
        if key.startswith("$"):
            continue
        if not _field_matches(doc.get(key), condition):
            return False
    return True


def _project(doc: Dict[str, Any], projection: Optional[Dict[str, int]] = None):
    if not projection:
        return copy.deepcopy(doc)

    include_keys = {key for key, value in projection.items() if value}
    exclude_keys = {key for key, value in projection.items() if not value}

    if include_keys:
        projected = {key: copy.deepcopy(doc[key]) for key in include_keys if key in doc}
        if "_id" in doc and "_id" not in exclude_keys and "_id" not in projected:
            projected["_id"] = copy.deepcopy(doc["_id"])
        return projected

    return {key: copy.deepcopy(value) for key, value in doc.items() if key not in exclude_keys}


class _InMemoryCollection:
    def __init__(self, name: str, docs: Optional[List[Dict[str, Any]]] = None):
        self.name = name
        self._docs = copy.deepcopy(docs or [])
        self._by_id = {}
        self._by_tmdb_id = {}
        for doc in self._docs:
            self._index_doc(doc)

    def _index_doc(self, doc):
        if doc.get("_id"):
            self._by_id[str(doc["_id"])] = doc
        if doc.get("tmdb_id") is not None:
            self._by_tmdb_id[int(doc["tmdb_id"])] = doc

    def find(self, query: Optional[Dict[str, Any]] = None, projection: Optional[Dict[str, int]] = None):
        docs = self._docs
        if query:
            docs = [d for d in docs if _matches(d, query)]
        if projection:
            docs = [_project(d, projection) for d in docs]
        return _InMemoryCursor(docs)

    def find_one(self, query: Optional[Dict[str, Any]] = None, projection: Optional[Dict[str, int]] = None):
        # Quick O(1) lookup for common _id queries
        if query and "_id" in query and not isinstance(query["_id"], dict):
            doc = self._by_id.get(str(query["_id"]))
            if doc:
                return _project(doc, projection)
        if query and "tmdb_id" in query and not isinstance(query["tmdb_id"], dict):
            doc = self._by_tmdb_id.get(int(query["tmdb_id"]))
            if doc:
                return _project(doc, projection)
        if query and "$or" in query:
            for sub in query["$or"]:
                for doc in self._docs:
                    if all(_field_matches(doc.get(k), v) for k, v in sub.items()):
                        return _project(doc, projection)
            return None
        for doc in self._docs:
            if _matches(doc, query):
                return _project(doc, projection)
        return None

    def insert_one(self, doc: Dict[str, Any]):
        stored = copy.deepcopy(doc)
        stored.setdefault("_id", stored.get("id") or str(len(self._docs) + 1))
        self._docs.append(stored)
        self._index_doc(stored)
        return type("InsertOneResult", (), {"inserted_id": stored["_id"]})()

    def create_index(self, *args, **kwargs):
        return None

    def count_documents(self, query: Optional[Dict[str, Any]] = None):
        return len([doc for doc in self._docs if _matches(doc, query)])

    def aggregate(self, pipeline: List[Dict[str, Any]]):
        docs = [copy.deepcopy(doc) for doc in self._docs]
        for stage in pipeline:
            if "$unwind" in stage:
                field = str(stage["$unwind"]).lstrip("$")
                unwound = []
                for doc in docs:
                    values = doc.get(field, [])
                    if not isinstance(values, list):
                        values = [values]
                    for value in values:
                        item = copy.deepcopy(doc)
                        item[field] = value
                        unwound.append(item)
                docs = unwound
            elif "$group" in stage:
                group_id = str(stage["$group"].get("_id", "")).lstrip("$")
                seen = {}
                for doc in docs:
                    key = doc.get(group_id)
                    seen[key] = {"_id": key}
                docs = list(seen.values())
            elif "$sort" in stage:
                for key, direction in reversed(stage["$sort"].items()):
                    reverse = direction < 0
                    docs.sort(key=lambda item: item.get(key) or "", reverse=reverse)
        return docs


class _InMemoryDatabase:
    def __init__(self):
        self.movies = _InMemoryCollection("movies", SAMPLE_MOVIES)
        self.users = _InMemoryCollection("users")
        self.recommendations = _InMemoryCollection("recommendations")
        self.watch_history = _InMemoryCollection("watch_history")

    def __getitem__(self, name: str):
        return getattr(self, name)


_fallback_db = _InMemoryDatabase()


class DatabaseManager:
    _mongo_client: Optional[MongoClient] = None
    _mongo_failed = False
    _use_fallback_catalog = False
    _pg_engine = None
    _pg_session_factory = None

    @classmethod
    @retry(
        stop=stop_after_attempt(MONGO_CONNECT_ATTEMPTS),
        wait=wait_exponential(multiplier=1, min=1, max=2),
    )
    def get_mongo_client(cls) -> MongoClient:
        if cls._mongo_client is None:
            cls._mongo_client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=MONGO_TIMEOUT_MS)
            cls._mongo_client.admin.command("ping")
            logger.info("MongoDB connection established")
        return cls._mongo_client

    @classmethod
    def get_mongo_db(cls):
        if DEMO_MODE == "true" or cls._mongo_failed or cls._use_fallback_catalog:
            return _fallback_db
        try:
            client = cls.get_mongo_client()
            db = client.neuralflix
            if DEMO_MODE == "auto" and not ALLOW_EMPTY_MONGO:
                try:
                    if db.movies.count_documents({}) == 0:
                        cls._use_fallback_catalog = True
                        logger.warning("MongoDB is empty; using bundled demo catalog")
                        return _fallback_db
                except Exception as exc:
                    cls._mongo_failed = True
                    logger.warning("MongoDB check failed; using bundled demo catalog: %s", exc)
                    return _fallback_db
            return db
        except (ConnectionFailure, ServerSelectionTimeoutError, Exception) as exc:
            cls._mongo_failed = True
            logger.warning("MongoDB unavailable; using bundled demo catalog: %s", exc)
            return _fallback_db

    @classmethod
    def get_pg_engine(cls):
        if cls._pg_engine is None and ASYNC_DATABASE_URL:
            try:
                cls._pg_engine = create_async_engine(
                    ASYNC_DATABASE_URL, pool_size=20, max_overflow=10, pool_pre_ping=True,
                )
                cls._pg_session_factory = sessionmaker(
                    autocommit=False, autoflush=False,
                    bind=cls._pg_engine, class_=AsyncSession,
                )
                logger.info("PostgreSQL engine initialized")
            except Exception as exc:
                logger.error("PostgreSQL initialization error: %s", exc)
                cls._pg_engine = None
        return cls._pg_engine

    @classmethod
    async def get_pg_session(cls) -> AsyncGenerator[Optional[AsyncSession], None]:
        if cls._pg_session_factory is None:
            cls.get_pg_engine()
        if cls._pg_session_factory:
            async with cls._pg_session_factory() as session:
                yield session
        else:
            yield None


def get_db():
    return DatabaseManager.get_mongo_db()

async def get_async_session():
    async for session in DatabaseManager.get_pg_session():
        yield session

def get_movies_collection():
    return get_db().movies

def get_users_collection():
    return get_db().users

def get_recommendations_collection():
    return get_db().recommendations

def get_watch_history_collection():
    return get_db().watch_history


class _LazyCollection:
    def __init__(self, collection_name: str):
        self._name = collection_name
        self._col = None

    def _get(self):
        if self._col is None:
            self._col = get_db()[self._name]
        return self._col

    def __getattr__(self, name):
        return getattr(self._get(), name)


movies_collection = _LazyCollection("movies")
users_collection = _LazyCollection("users")
recommendations_collection = _LazyCollection("recommendations")
watch_history_collection = _LazyCollection("watch_history")

SessionLocal = None
if DATABASE_URL:
    try:
        from sqlalchemy import create_engine
        from sqlalchemy.orm import sessionmaker as sync_sessionmaker
        _sync_engine = create_engine(
            DATABASE_URL, pool_size=5, max_overflow=5, pool_pre_ping=True,
        )
        SessionLocal = sync_sessionmaker(bind=_sync_engine, autocommit=False, autoflush=False)
        logger.info("Sync PostgreSQL SessionLocal initialized")
    except Exception as exc:
        logger.warning("Sync PG session not available: %s", exc)


def init_db():
    db = get_db()
    movies_col = db.movies
    movies_col.create_index([("title", "text"), ("overview", "text")])
    movies_col.create_index([("genres", 1)])
    movies_col.create_index([("rating", -1)])
    movies_col.create_index([("popularity_score", -1)])
    movies_col.create_index([("language", 1)])
    movies_col.create_index([("tmdb_id", 1)], unique=True, sparse=True)
    movies_col.create_index([("year", -1)])
    movies_col.create_index([("language", 1), ("rating", -1)])
    movies_col.create_index([("year", -1), ("popularity_score", -1)])
    movies_col.create_index([("status", 1)])
    movies_col.create_index([("imdb_id", 1)], sparse=True)
    movies_col.create_index([("cinema_region", 1)])
    logger.info("Database indexes initialized or skipped for fallback catalog")
