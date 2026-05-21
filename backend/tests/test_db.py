import pytest
import asyncio
import os
import sys
sys.path.insert(0, str(__import__('pathlib').Path(__file__).parent.parent))

os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://postgres.pnzezjiihjgtdfkuwngs:O0fQAvtj1xJliqdY@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres")
os.environ.setdefault("ANTHROPIC_API_KEY", "placeholder")
os.environ.setdefault("VOYAGE_API_KEY", "placeholder")
os.environ.setdefault("APP_SHARED_KEY", "placeholder")

from db import get_pool, run_migrations

@pytest.mark.asyncio
async def test_migrations_create_tables():
    pool = await get_pool()
    await run_migrations(pool)
    async with pool.acquire() as conn:
        tables = await conn.fetch(
            "SELECT tablename FROM pg_tables WHERE schemaname='public'"
        )
        names = {r["tablename"] for r in tables}
        assert {"conversations", "memories", "push_log", "mood_snapshots"} <= names
    await pool.close()
