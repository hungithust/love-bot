import random
from fastapi import APIRouter, Request, HTTPException
from pydantic import BaseModel
from db import get_pool

router = APIRouter()

HAPTIC = {"hammer": "heavy", "bat": "double", "grenade": "long", "fire": "long"}

QUIPS = {
    "anger":      ["Đập xong chưa. Giờ kể tao nghe chuyện gì xảy ra đi.", "Tức thì đập. Nhưng gốc rễ vẫn còn đó — kể không?", "Cơn tức vừa thua mày rồi."],
    "sadness":    ["Nỗi buồn không mất đâu. Nhưng giờ mày mạnh hơn nó một chút.", "Đánh xong rồi. Khóc được thì cứ khóc, tao ở đây.", "Buồn thì buồn. Nhưng mày không một mình."],
    "anxiety":    ["Nỗi lo vừa thua. Thở đi. Kể tao nghe lo cái gì.", "Đánh nó rồi. Lo thật sự về cái gì vậy?", "Anxiety thua rồi. Nhưng tao cần biết mày đang lo gì."],
    "numbness":   ["Trống thì đánh. Cảm giác gì chưa?", "Sự vô cảm vừa bị mày đập. Còn cảm thấy gì không?", "Đánh xong rồi. Mày ổn không?"],
    "exhaustion": ["Mệt thì nghỉ sau khi đánh xong. Kể tao nghe mày kiệt vì cái gì.", "Mệt Mỏi vừa thua. Nhưng mày cần nghỉ ngơi thật sự — kể tao nghe."],
}

DEFAULT_QUIPS = ["Đập xong. Khỏe chưa?", "Xong rồi. Kể tao nghe.", "Tiêu diệt. Giờ nói chuyện đi."]


class RageIn(BaseModel):
    boss_id: str
    weapon: str


@router.post("/rage")
async def rage(payload: RageIn, request: Request):
    from config import settings
    if request.headers.get("x-app-key") != settings.app_shared_key:
        raise HTTPException(401)
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute(
            "insert into mood_snapshots(mood, trigger) values('angry','rage')"
        )
    boss_quips = QUIPS.get(payload.boss_id, DEFAULT_QUIPS)
    return {
        "haptic_pattern": HAPTIC.get(payload.weapon, "heavy"),
        "particle_seed": random.randint(0, 2**31),
        "quip": random.choice(boss_quips),
    }
