# Design: Web Search Tool + Activity Suggestion Nâng Cao

**Date:** 2026-05-22  
**Status:** Approved

## Tổng quan

Hai tính năng được implement cùng nhau vì chia sẻ Serper API và cùng mục tiêu làm agent hữu ích hơn trong cuộc sống thực:

1. **Web Search Tool** — agent chat có thể tự search Google khi cần thông tin ngoài kiến thức của nó
2. **Activity Suggestion Fallback** — gợi ý hoạt động/địa điểm kể cả khi user không bật GPS, dựa trên memory và mood

## Kiến trúc

Approach: **Tool-first** — thêm `web_search` vào TOOLS list của agent, agent tự quyết định khi nào cần dùng. Fallback suggestion dùng cùng memory layer đã có.

## Chi tiết implementation

### 1. Web Search Tool — Backend

**`backend/agent.py`**

Thêm vào `TOOLS` list:
```python
{
    "name": "web_search",
    "description": "Tìm kiếm thông tin trên web khi cần thông tin ngoài (sách, phim, địa điểm, sự kiện, tin tức, v.v.)",
    "input_schema": {
        "type": "object",
        "properties": {
            "query": {"type": "string"},
            "num_results": {"type": "integer", "default": 3}
        },
        "required": ["query"]
    }
}
```

Thêm hàm `execute_web_search(query: str, num_results: int = 3) -> str`:
- Gọi `POST https://google.serper.dev/search` với header `X-API-KEY`
- Lấy `organic[0..num_results]` results
- Format: `"[title] — [snippet] (url)"` mỗi kết quả một dòng
- Trả về string để nhúng vào `tool_result`
- Timeout 8s, nếu lỗi trả về `"Không tìm được kết quả."`

**`backend/config.py`**

Thêm field `serper_api_key: str` vào Settings.

### 2. Web Search Tool — Chat Route

**`backend/routes/chat.py`**

Trong stream loop, khi detect `tool_use` với `name == "web_search"`:
1. Gọi `execute_web_search(args["query"], args.get("num_results", 3))`
2. Append `tool_result` vào messages
3. Tiếp tục gọi agent với kết quả đó

Các tool khác (`change_theme`, `suggest_song`, v.v.) được trả về frontend để execute — `web_search` được execute hoàn toàn ở backend vì không liên quan UI.

### 3. Web Search — Frontend

**`app/lib/toolExecutor.ts`**

Thêm case `web_search` trong switch: không làm gì ở frontend (backend đã handle), chỉ return sớm. Tool event này không cần propagate lên UI.

**`app/app/(tabs)/index.tsx`**

Khi nhận SSE event `tool_use` với name `web_search`, set state `isSearching = true` và hiện text "Đang tìm kiếm..." thay cho typing indicator. Reset về `false` khi nhận text chunk đầu tiên sau đó.

### 4. Activity Suggestion Fallback

**`backend/routes/location.py`**

Sửa `/location/suggest`:
```python
loc = await conn.fetchrow("SELECT lat, lng FROM location_history ORDER BY created_at DESC LIMIT 1")

if loc:
    # Flow cũ: Overpass POI → suggest.txt
    ...
else:
    # Flow mới: memories + mood → suggest_no_location.txt
    memories = await conn.fetch(
        "SELECT content FROM memories ORDER BY created_at DESC LIMIT 10"
    )
    mood_row = await conn.fetchrow("SELECT mood FROM mood_snapshots ORDER BY created_at DESC LIMIT 1")
    mood = mood_row["mood"] if mood_row else "neutral"
    memory_text = "\n".join(f"- {m['content']}" for m in memories) or "(chưa có thông tin)"
    
    prompt = load_prompt("suggest_no_location").format(memories=memory_text, mood=mood)
    # Gọi Haiku, parse, trả về suggestions
```

**`backend/prompts/suggest_no_location.txt`** (file mới):
```
Bạn là "Bạn của Kem" — người bạn thân thiết, ấm áp nhưng đôi khi khó tính.
Kem không bật GPS. Đây là những gì bạn biết về Kem:
{memories}

Tâm trạng hiện tại của Kem: {mood}

Gợi ý 2-3 hoạt động phù hợp với Kem lúc này. Có thể là hoạt động ở nhà hoặc ra ngoài
(cafe, công viên, đi bơi, mua kem, v.v.) nhưng không cần địa chỉ cụ thể.
Viết ngắn gọn, tự nhiên như nhắn tin. Không dùng bullet points. Không hỏi lại.
```

**`app/app/(tabs)/index.tsx`**

Xóa điều kiện `{locationEnabled && (...)}` bao nút gợi ý — nút luôn hiển thị.

## Không thay đổi

- DB schema
- Các tool khác (`change_theme`, `trigger_haptic`, `suggest_song`, `memory_save`)
- Auth / app key
- Frontend routing
- Suggestion pipeline với location (flow cũ giữ nguyên)
- Web search không được dùng trong suggestion pipeline (v1)

## Cấu hình

Thêm vào `.env` và `.env.example`:
```
SERPER_API_KEY=...
```

## Out of scope (v1)

- Web search enrichment trong suggestion pipeline
- Cache kết quả search
- User có thể xem nguồn tham khảo
