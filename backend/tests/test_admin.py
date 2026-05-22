import pytest
import os
os.environ.setdefault("DATABASE_URL", "postgresql://fake/fake")
os.environ.setdefault("ANTHROPIC_API_KEY", "fake")
os.environ.setdefault("VOYAGE_API_KEY", "fake")
os.environ.setdefault("APP_SHARED_KEY", "test-key")
os.environ.setdefault("ADMIN_KEY", "admin-test-key")

from httpx import AsyncClient, ASGITransport
from unittest.mock import patch, AsyncMock, MagicMock
from fastapi import FastAPI
from routes.admin import router

app = FastAPI()
app.include_router(router)


@pytest.mark.asyncio
async def test_admin_api_requires_auth():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        r = await client.get("/admin/api/status")
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_admin_api_wrong_key():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        r = await client.get("/admin/api/status", headers={"x-admin-key": "wrong"})
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_admin_status_returns_data():
    mock_conn = AsyncMock()
    mock_conn.fetch = AsyncMock(side_effect=[
        [{"mood": "warm", "confidence": 0.9, "trigger": None, "created_at": "2026-05-22"}],
        [{"message": "hey", "sent_at": "2026-05-22", "opened": False}],
    ])
    mock_pool = MagicMock()
    mock_pool.acquire.return_value.__aenter__ = AsyncMock(return_value=mock_conn)
    mock_pool.acquire.return_value.__aexit__ = AsyncMock(return_value=False)

    with patch("routes.admin.get_pool", new_callable=AsyncMock, return_value=mock_pool):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            r = await client.get("/admin/api/status", headers={"x-admin-key": "admin-test-key"})
    assert r.status_code == 200
    data = r.json()
    assert "moods" in data
    assert "push_log" in data


@pytest.mark.asyncio
async def test_admin_push_send():
    from pathlib import Path
    import tempfile, os
    tmp = tempfile.mktemp()
    Path(tmp).write_text("ExponentPushToken[test123]")

    mock_conn = AsyncMock()
    mock_pool = MagicMock()
    mock_pool.acquire.return_value.__aenter__ = AsyncMock(return_value=mock_conn)
    mock_pool.acquire.return_value.__aexit__ = AsyncMock(return_value=False)

    import httpx
    with patch("routes.admin.TOKEN_FILE", Path(tmp)), \
         patch("routes.admin.get_pool", new_callable=AsyncMock, return_value=mock_pool), \
         patch("httpx.AsyncClient") as mock_http:
        mock_http.return_value.__aenter__ = AsyncMock(return_value=AsyncMock(post=AsyncMock()))
        mock_http.return_value.__aexit__ = AsyncMock(return_value=False)
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            r = await client.post(
                "/admin/api/push/send",
                json={"message": "Kem ơi!"},
                headers={"x-admin-key": "admin-test-key"},
            )
    assert r.status_code == 200
    assert r.json()["sent"] == "Kem ơi!"
    os.unlink(tmp)
