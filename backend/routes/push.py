from datetime import datetime, timedelta
from pathlib import Path
import httpx
import random

from fastapi import APIRouter, Request, HTTPException
from pydantic import BaseModel

from config import settings

router = APIRouter(prefix="/push", tags=["push"])

TOKEN_FILE = Path("/tmp/expo_push_token")


class RegisterBody(BaseModel):
    token: str


def should_send_push(now: datetime, last_push: datetime | None, sent_today: int) -> bool:
    if sent_today >= 3:          # max 3/ngày theo spec
        return False
    if last_push and (now - last_push) < timedelta(hours=3):
        return False
    h = now.hour
    m = now.minute
    # Không gửi 23:00–08:00
    if 23 <= h or h < 8:
        return False
    # 3 target windows với ±30 phút jitter:
    # Sáng: target 8:00, window 8:00–9:00
    # Chiều: target 14:00, window 13:30–15:00
    # Tối:  target 21:30, window 21:00–22:30
    in_morning   = h == 8 and m < 60
    in_afternoon = (h == 13 and m >= 30) or (h == 14) or (h == 15 and m == 0)
    in_evening   = (h == 21) or (h == 22 and m < 30)
    if not (in_morning or in_afternoon or in_evening):
        return False
    # Jitter: chỉ gửi ~50% số lần tick trong window để không bị predictable
    return random.random() < 0.5


@router.post("/register")
async def register(body: RegisterBody):
    TOKEN_FILE.write_text(body.token)
    return {"ok": True}


@router.post("/tick")
async def tick(request: Request):
    cron_key = request.headers.get("x-cron-key", "")
    if cron_key != settings.app_shared_key:
        raise HTTPException(status_code=401)

    if not TOKEN_FILE.exists():
        return {"skipped": "no_token"}

    pool = request.app.state.pool
    now = datetime.utcnow()

    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT sent_at FROM push_log ORDER BY sent_at DESC LIMIT 1"
        )
        last_push = row["sent_at"] if row else None

        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        sent_today = await conn.fetchval(
            "SELECT COUNT(*) FROM push_log WHERE sent_at >= $1", today_start
        )

        if not should_send_push(now, last_push, sent_today):
            return {"skipped": "heuristic"}

        mood_row = await conn.fetchrow(
            "SELECT mood FROM mood_snapshots ORDER BY created_at DESC LIMIT 1"
        )
        last_mood = mood_row["mood"] if mood_row else "neutral"

        mem_rows = await conn.fetch(
            "SELECT content FROM memories ORDER BY created_at DESC LIMIT 3"
        )
        memories = [r["content"] for r in mem_rows]

    from anthropic import AsyncAnthropic
    client = AsyncAnthropic(api_key=settings.anthropic_api_key)

    push_prompt = Path("prompts/push.txt").read_text(encoding="utf-8")
    system = push_prompt.format(last_mood=last_mood, memories="\n".join(memories))

    msg = await client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=120,
        system=system,
        messages=[{"role": "user", "content": "send push?"}],
    )
    text = msg.content[0].text.strip()

    if text.lower() == "null" or not text:
        return {"skipped": "ai_null"}

    token = TOKEN_FILE.read_text().strip()
    async with httpx.AsyncClient() as http:
        await http.post(
            "https://exp.host/--/api/v2/push/send",
            json={"to": token, "body": text, "sound": "default"},
            timeout=10,
        )

    async with pool.acquire() as conn:
        await conn.execute(
            "INSERT INTO push_log (sent_at, message) VALUES ($1, $2)", now, text
        )

    return {"sent": text}
