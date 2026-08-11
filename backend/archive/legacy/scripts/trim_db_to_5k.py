import os
import sys
import asyncio
import logging
from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy import select, delete, func

# Adjust path so we can import from backend modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models.sql_models import PostgresMovie

load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env'))
logger = logging.getLogger("TRIM_DB")
logging.basicConfig(level=logging.INFO)

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    logger.error("DATABASE_URL is not set in .env")
    sys.exit(1)

if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

async_pg_url = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://")

engine = create_async_engine(async_pg_url, echo=False)
async_session = async_sessionmaker(engine, expire_on_commit=False)

async def trim_db():
    async with async_session() as session:
        # 1. Count total movies
        total_stmt = select(func.count(PostgresMovie.id))
        total_movies = await session.scalar(total_stmt)
        logger.info(f"Total movies currently in DB: {total_movies}")

        if total_movies <= 5000:
            logger.info("Database has 5000 or fewer movies. No trimming needed.")
            return

        # 2. Get the IDs of the top 5000 movies
        logger.info("Fetching the top 5000 movie IDs by popularity...")
        top_ids_stmt = select(PostgresMovie.id).order_by(PostgresMovie.popularity_score.desc()).limit(5000)
        result = await session.execute(top_ids_stmt)
        top_ids = [row[0] for row in result.all()]

        if not top_ids:
            logger.error("Could not fetch top IDs.")
            return

        logger.info(f"Identified {len(top_ids)} top movies. Proceeding to delete the rest.")

        # 3. Delete movies where id is NOT in top_ids
        delete_stmt = delete(PostgresMovie).where(PostgresMovie.id.not_in(top_ids))
        
        logger.info("Executing deletion... This might take a moment.")
        del_result = await session.execute(delete_stmt)
        await session.commit()
        
        logger.info(f"Deleted {del_result.rowcount} movies.")
        
        # 4. Verify
        final_count = await session.scalar(total_stmt)
        logger.info(f"Final movie count in DB: {final_count}")

if __name__ == "__main__":
    asyncio.run(trim_db())
