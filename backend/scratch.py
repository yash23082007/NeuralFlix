import sys
sys.path.append('.')
from database import init_engines, sync_engine
from sqlalchemy import text
print('Testing Database Connection...')
init_engines()
print('Sync Engine:', sync_engine)
with sync_engine.connect() as conn:
    print('DB SUCCESS:', conn.execute(text('SELECT 1')).scalar())
