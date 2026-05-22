import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from unittest.mock import patch, AsyncMock, MagicMock

# Set env vars before importing app
import os
os.environ.setdefault("DATABASE_URL", "postgresql://fake/fake")
os.environ.setdefault("ANTHROPIC_API_KEY", "fake")
os.environ.setdefault("VOYAGE_API_KEY", "fake")
os.environ.setdefault("APP_SHARED_KEY", "test-key")
os.environ.setdefault("ADMIN_KEY", "admin-test-key")

from fastapi import FastAPI
from routes.location import router

app = FastAPI()
app.include_router(router)


@pytest.mark.asyncio
async def test_location_update_requires_auth():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        r = await client.post("/location/update", json={"lat": 21.0, "lng": 105.0, "accuracy": 10.0})
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_location_update_saves_record():
    mock_conn = AsyncMock()
    mock_pool = MagicMock()
    mock_pool.acquire.return_value.__aenter__ = AsyncMock(return_value=mock_conn)
    mock_pool.acquire.return_value.__aexit__ = AsyncMock(return_value=False)

    with patch("routes.location.get_pool", new_callable=AsyncMock, return_value=mock_pool):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            r = await client.post(
                "/location/update",
                json={"lat": 21.02, "lng": 105.83, "accuracy": 15.0},
                headers={"x-app-key": "test-key"},
            )
    assert r.status_code == 200
    assert r.json() == {"ok": True}
    mock_conn.execute.assert_called_once()


@pytest.mark.asyncio
async def test_location_suggest_no_location_returns_empty():
    mock_conn = AsyncMock()
    mock_conn.fetchrow = AsyncMock(return_value=None)
    mock_pool = MagicMock()
    mock_pool.acquire.return_value.__aenter__ = AsyncMock(return_value=mock_conn)
    mock_pool.acquire.return_value.__aexit__ = AsyncMock(return_value=False)

    with patch("routes.location.get_pool", new_callable=AsyncMock, return_value=mock_pool):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            r = await client.get("/location/suggest", headers={"x-app-key": "test-key"})
    assert r.status_code == 200
    assert r.json() == {"suggestions": []}
