import asyncpg
import os
from pathlib import Path

_pool = None

async def get_pool():
    global _pool
    if _pool is None:
        url = os.environ["DATABASE_URL"].replace("postgresql+asyncpg://", "postgresql://")
        _pool = await asyncpg.create_pool(url, min_size=1, max_size=5, statement_cache_size=0)
    return _pool

async def run_migrations(pool):
    sql = Path(__file__).parent.joinpath("migrations", "001_init.sql").read_text()
    async with pool.acquire() as conn:
        await conn.execute(sql)
