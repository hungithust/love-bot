from datetime import datetime
from pathlib import Path
import httpx

from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import HTMLResponse
from pydantic import BaseModel

from config import settings
from db import get_pool

router = APIRouter()

TOKEN_FILE = Path("/tmp/expo_push_token")
STATIC_DIR = Path(__file__).parent.parent / "static"


def _check_admin(request: Request):
    if request.headers.get("x-admin-key") != settings.admin_key:
        raise HTTPException(401)


# ── HTML dashboard ──────────────────────────────────────────────────────────

@router.get("/admin", response_class=HTMLResponse)
async def admin_dashboard():
    html = (STATIC_DIR / "admin.html").read_text(encoding="utf-8")
    return HTMLResponse(html)


# ── Push ─────────────────────────────────────────────────────────────────────

class PushBody(BaseModel):
    message: str


@router.post("/admin/api/push/send")
async def admin_push_send(body: PushBody, request: Request):
    _check_admin(request)
    if not TOKEN_FILE.exists():
        raise HTTPException(400, "no push token registered")

    token = TOKEN_FILE.read_text().strip()
    now = datetime.utcnow()

    async with httpx.AsyncClient() as http:
        await http.post(
            "https://exp.host/--/api/v2/push/send",
            json={"to": token, "body": body.message, "sound": "default"},
            timeout=10,
        )

    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute(
            "INSERT INTO push_log (sent_at, message) VALUES ($1, $2)", now, body.message
        )

    return {"sent": body.message}


@router.get("/admin/api/push/log")
async def admin_push_log(request: Request):
    _check_admin(request)
    pool = await get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            "SELECT message, sent_at, opened FROM push_log ORDER BY sent_at DESC LIMIT 50"
        )
    return {"items": [dict(r) for r in rows]}


# ── Location ──────────────────────────────────────────────────────────────────

@router.get("/admin/api/location")
async def admin_location(request: Request):
    _check_admin(request)
    pool = await get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            "SELECT lat, lng, accuracy, created_at FROM location_history ORDER BY created_at DESC LIMIT 200"
        )
    return {"items": [dict(r) for r in rows]}


# ── Chat log ─────────────────────────────────────────────────────────────────

@router.get("/admin/api/chat")
async def admin_chat(request: Request, page: int = 0, limit: int = 50):
    _check_admin(request)
    pool = await get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            "SELECT id, role, content, mood, created_at FROM conversations "
            "ORDER BY created_at DESC LIMIT $1 OFFSET $2",
            limit, page * limit,
        )
    return {"items": [dict(r) for r in rows]}


# ── Status ────────────────────────────────────────────────────────────────────

@router.get("/admin/api/status")
async def admin_status(request: Request):
    _check_admin(request)
    pool = await get_pool()
    async with pool.acquire() as conn:
        moods = await conn.fetch(
            "SELECT mood, confidence, trigger, created_at FROM mood_snapshots ORDER BY created_at DESC LIMIT 100"
        )
        push = await conn.fetch(
            "SELECT message, sent_at, opened FROM push_log ORDER BY sent_at DESC LIMIT 50"
        )
    return {
        "moods": [dict(r) for r in moods],
        "push_log": [dict(r) for r in push],
    }
