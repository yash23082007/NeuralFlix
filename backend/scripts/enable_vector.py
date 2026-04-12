import os
import sys
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(backend_dir, '.env'))

SUPABASE_URL = os.getenv("DATABASE_URL")
if not SUPABASE_URL:
    print("No DATABASE_URL")
    sys.exit(1)

try:
    engine = create_engine(SUPABASE_URL)
    with engine.connect() as conn:
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector;"))
        conn.commit()
    print("✅ pgvector extension enabled successfully on Supabase!")
except Exception as e:
    print(f"❌ Failed to enable pgvector: {e}")
