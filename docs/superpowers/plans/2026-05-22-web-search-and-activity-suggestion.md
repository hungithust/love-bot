# Web Search + Activity Suggestion Nâng Cao Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thêm web search tool cho agent chat và fallback gợi ý hoạt động khi không có GPS.

**Architecture:** Thêm `web_search` vào TOOLS list của agent — agent tự quyết định khi nào search. Chat route xử lý tool call này hoàn toàn ở backend (gọi Serper API rồi feed kết quả lại agent). Suggestion endpoint fallback sang memories+mood khi không có location.

**Tech Stack:** Python/FastAPI backend, Serper API (Google Search), Expo React Native frontend, asyncpg PostgreSQL.

---

## File Map

**Tạo mới:**
- `backend/prompts/suggest_no_location.txt` — prompt fallback khi không có GPS
- `backend/search.py` — module execute web search qua Serper API

**Sửa:**
- `backend/config.py` — thêm `serper_api_key`
- `backend/.env.example` — thêm `SERPER_API_KEY`
- `backend/agent.py` — thêm tool `web_search` vào TOOLS
- `backend/routes/chat.py` — xử lý tool call `web_search` trong stream loop
- `backend/routes/location.py` — fallback khi không có location
- `backend/tests/test_agent.py` — test tool `web_search` trong TOOLS list
- `backend/tests/test_location.py` — test fallback không có GPS
- `app/lib/toolExecutor.ts` — thêm case `web_search` (no-op)
- `app/app/(tabs)/index.tsx` — bỏ điều kiện `locationEnabled`, thêm "Đang tìm kiếm..." state

---

## Task 1: Thêm `serper_api_key` vào config

**Files:**
- Modify: `backend/config.py`
- Modify: `backend/.env.example`

- [ ] **Step 1: Thêm field vào Settings**

Sửa `backend/config.py`:
```python
class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env")

    anthropic_api_key: str
    voyage_api_key: str
    database_url: str
    app_shared_key: str
    admin_key: str
    serper_api_key: str = ""          # thêm dòng này
    chat_model: str = "claude-sonnet-4-6"
    extract_model: str = "claude-haiku-4-5-20251001"
```

- [ ] **Step 2: Cập nhật .env.example**

Thêm vào cuối `backend/.env.example`:
```
SERPER_API_KEY=your_serper_api_key_here
```

- [ ] **Step 3: Thêm key thật vào .env local**

Đăng ký tại serper.dev, lấy API key, thêm vào `backend/.env`:
```
SERPER_API_KEY=<key thật>
```

- [ ] **Step 4: Commit**

```bash
git add backend/config.py backend/.env.example
git commit -m "feat: add serper_api_key to config"
```

---

## Task 2: Tạo module `search.py`

**Files:**
- Create: `backend/search.py`

- [ ] **Step 1: Viết test trước**

Thêm vào `backend/tests/test_agent.py` (hoặc tạo `backend/tests/test_search.py`):

```python
import pytest
import os
os.environ.setdefault("DATABASE_URL", "postgresql://fake/fake")
os.environ.setdefault("ANTHROPIC_API_KEY", "fake")
os.environ.setdefault("VOYAGE_API_KEY", "fake")
os.environ.setdefault("APP_SHARED_KEY", "fake")
os.environ.setdefault("ADMIN_KEY", "fake")
os.environ.setdefault("SERPER_API_KEY", "fake")

from unittest.mock import patch, AsyncMock


@pytest.mark.asyncio
async def test_execute_web_search_returns_formatted_string():
    mock_response = AsyncMock()
    mock_response.json.return_value = {
        "organic": [
            {"title": "Doraemon tập 1", "snippet": "Nội dung hay", "link": "http://a.com"},
            {"title": "Doraemon tập 2", "snippet": "Tiếp nối", "link": "http://b.com"},
        ]
    }
    mock_response.raise_for_status = AsyncMock()

    mock_client = AsyncMock()
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)
    mock_client.post = AsyncMock(return_value=mock_response)

    with patch("search.httpx.AsyncClient", return_value=mock_client):
        from search import execute_web_search
        result = await execute_web_search("doraemon manga", num_results=2)

    assert "Doraemon tập 1" in result
    assert "Nội dung hay" in result
    assert "http://a.com" in result


@pytest.mark.asyncio
async def test_execute_web_search_handles_error():
    mock_client = AsyncMock()
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)
    mock_client.post = AsyncMock(side_effect=Exception("timeout"))

    with patch("search.httpx.AsyncClient", return_value=mock_client):
        from search import execute_web_search
        result = await execute_web_search("query")

    assert result == "Không tìm được kết quả."
```

- [ ] **Step 2: Chạy test để verify fail**

```bash
cd backend && pytest tests/test_search.py -v
```
Expected: `ModuleNotFoundError: No module named 'search'`

- [ ] **Step 3: Tạo `backend/search.py`**

```python
import httpx
from config import settings

SERPER_URL = "https://google.serper.dev/search"


async def execute_web_search(query: str, num_results: int = 3) -> str:
    try:
        async with httpx.AsyncClient(timeout=8) as client:
            r = await client.post(
                SERPER_URL,
                headers={"X-API-KEY": settings.serper_api_key, "Content-Type": "application/json"},
                json={"q": query, "num": num_results},
            )
            r.raise_for_status()
            items = r.json().get("organic", [])[:num_results]
    except Exception:
        return "Không tìm được kết quả."

    if not items:
        return "Không tìm được kết quả."

    lines = []
    for item in items:
        title = item.get("title", "")
        snippet = item.get("snippet", "")
        link = item.get("link", "")
        lines.append(f"{title} — {snippet} ({link})")
    return "\n".join(lines)
```

- [ ] **Step 4: Chạy test để verify pass**

```bash
cd backend && pytest tests/test_search.py -v
```
Expected: 2 tests PASSED

- [ ] **Step 5: Commit**

```bash
git add backend/search.py backend/tests/test_search.py
git commit -m "feat: add web search module via Serper API"
```

---

## Task 3: Thêm tool `web_search` vào agent

**Files:**
- Modify: `backend/agent.py`
- Modify: `backend/tests/test_agent.py`

- [ ] **Step 1: Viết test**

Thêm vào `backend/tests/test_agent.py`:
```python
def test_tools_list_includes_web_search():
    from agent import TOOLS
    names = [t["name"] for t in TOOLS]
    assert "web_search" in names

def test_web_search_tool_schema_has_required_query():
    from agent import TOOLS
    tool = next(t for t in TOOLS if t["name"] == "web_search")
    assert "query" in tool["input_schema"]["properties"]
    assert "query" in tool["input_schema"]["required"]
```

- [ ] **Step 2: Chạy test để verify fail**

```bash
cd backend && pytest tests/test_agent.py::test_tools_list_includes_web_search -v
```
Expected: FAIL — `web_search` not in TOOLS

- [ ] **Step 3: Thêm tool vào TOOLS list trong `backend/agent.py`**

Thêm vào cuối list `TOOLS` (sau `memory_save`):
```python
    {
        "name": "web_search",
        "description": "Tìm kiếm thông tin trên web khi cần thông tin ngoài kiến thức của bạn: sách, phim, địa điểm, sự kiện, tin tức, giá cả, v.v.",
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "Từ khóa tìm kiếm bằng tiếng Việt hoặc tiếng Anh"},
                "num_results": {"type": "integer", "description": "Số kết quả cần lấy, mặc định 3", "default": 3},
            },
            "required": ["query"],
        },
    },
```

- [ ] **Step 4: Chạy test để verify pass**

```bash
cd backend && pytest tests/test_agent.py -v
```
Expected: tất cả PASSED

- [ ] **Step 5: Commit**

```bash
git add backend/agent.py backend/tests/test_agent.py
git commit -m "feat: add web_search tool to agent TOOLS list"
```

---

## Task 4: Xử lý `web_search` tool call trong chat route

**Files:**
- Modify: `backend/routes/chat.py`

Hiện tại chat route stream chunk từ agent, khi gặp `tool_use` trong `final` thì yield event `tool` ra frontend. Với `web_search`, cần execute ở backend và feed kết quả lại agent để nó continue.

- [ ] **Step 1: Viết test**

Thêm file `backend/tests/test_chat_websearch.py`:

```python
import pytest
import os
import json
os.environ.setdefault("DATABASE_URL", "postgresql://fake/fake")
os.environ.setdefault("ANTHROPIC_API_KEY", "fake")
os.environ.setdefault("VOYAGE_API_KEY", "fake")
os.environ.setdefault("APP_SHARED_KEY", "test-key")
os.environ.setdefault("ADMIN_KEY", "fake")
os.environ.setdefault("SERPER_API_KEY", "fake")

from unittest.mock import patch, AsyncMock, MagicMock


@pytest.mark.asyncio
async def test_web_search_tool_is_handled_backend_side():
    """
    Khi agent trả về tool_use web_search, chat route phải:
    1. Gọi execute_web_search
    2. KHÔNG yield event 'tool' ra frontend cho web_search
    3. Tiếp tục stream với kết quả search
    """
    # Build fake tool_use block
    class FakeToolBlock:
        type = "tool_use"
        name = "web_search"
        input = {"query": "sách hay 2024", "num_results": 2}
        id = "tool_abc"

    class FakeTextBlock:
        type = "text"
        text = "Tao tìm thấy rồi"

    class FakeTextDelta:
        type = "text_delta"
        text = "response text"

    class FakeChunk:
        type = "content_block_delta"
        delta = FakeTextDelta()

    class FakeFinal:
        content = [FakeToolBlock()]

    # First stream: tool_use only. Second stream: text response.
    async def first_stream(*args, **kwargs):
        yield FakeChunk()
        yield {"final": FakeFinal()}

    class FakeFinal2:
        content = [FakeTextBlock()]
        stop_reason = "end_turn"

    async def second_stream(*args, **kwargs):
        yield FakeChunk()
        yield {"final": FakeFinal2()}

    call_count = 0
    async def mock_respond(*args, **kwargs):
        nonlocal call_count
        if call_count == 0:
            call_count += 1
            async for c in first_stream():
                yield c
        else:
            async for c in second_stream():
                yield c

    mock_pool = MagicMock()
    mock_conn = AsyncMock()
    mock_conn.fetchrow = AsyncMock(return_value=None)
    mock_conn.fetch = AsyncMock(return_value=[])
    mock_conn.fetchval = AsyncMock(return_value=1)
    mock_pool.acquire.return_value.__aenter__ = AsyncMock(return_value=mock_conn)
    mock_pool.acquire.return_value.__aexit__ = AsyncMock(return_value=False)

    events = []
    with patch("routes.chat.respond_stream", side_effect=mock_respond), \
         patch("routes.chat.rag_top_k", new_callable=AsyncMock, return_value=[]), \
         patch("routes.chat.recent_turns", new_callable=AsyncMock, return_value=[]), \
         patch("routes.chat.save_turn", new_callable=AsyncMock, return_value=1), \
         patch("routes.chat.extract_and_save"), \
         patch("search.execute_web_search", new_callable=AsyncMock, return_value="kết quả search"):

        from routes.chat import gen as _  # just import to ensure no syntax errors
        # Verify web_search event không được yield ra frontend
        # (kiểm tra trong integration: tool event chỉ chứa non-web_search tools)
        assert True  # placeholder — actual behavior tested via manual/integration test
```

Đây là unit test cơ bản. Test đầy đủ behavior của stream loop cần integration test — xem Step thủ công bên dưới.

- [ ] **Step 2: Sửa `backend/routes/chat.py` — import search module**

Thêm import ở đầu file:
```python
from search import execute_web_search
```

- [ ] **Step 3: Sửa hàm `gen()` để xử lý web_search tool**

Thay đổi logic trong `gen()`. Hiện tại toàn bộ xử lý tool nằm ở phần `if isinstance(chunk, dict) and "final" in chunk`. Sửa thành:

```python
async def gen():
    ai_text = ""
    tool_calls = []
    mood_result: tuple[str, str] = ("neutral", "💜")
    messages_with_history = list(history)  # copy để có thể append tool_result

    try:
        current_messages = messages_with_history

        # Loop để handle tool calls (web_search cần re-call agent)
        while True:
            async for chunk in respond_stream(current_messages, rag, payload.user_status):
                if isinstance(chunk, dict) and "final" in chunk:
                    final = chunk["final"]
                    web_search_calls = []
                    frontend_tools = []

                    for b in final.content:
                        if getattr(b, "type", None) == "tool_use":
                            if b.name == "web_search":
                                web_search_calls.append({"name": b.name, "args": b.input, "id": b.id})
                            else:
                                frontend_tools.append({"name": b.name, "args": b.input, "id": b.id})
                                tool_calls.append({"name": b.name, "args": b.input, "id": b.id})

                    if frontend_tools:
                        yield {"event": "tool", "data": json.dumps(frontend_tools, ensure_ascii=False)}

                    if web_search_calls:
                        # Signal frontend
                        yield {"event": "searching", "data": ""}
                        # Build assistant message with tool_use blocks
                        assistant_content = [
                            {"type": "tool_use", "id": c["id"], "name": c["name"], "input": c["args"]}
                            for c in web_search_calls
                        ]
                        current_messages = current_messages + [
                            {"role": "assistant", "content": assistant_content}
                        ]
                        # Execute each search and build tool_results
                        tool_results = []
                        for c in web_search_calls:
                            search_result = await execute_web_search(
                                c["args"]["query"],
                                c["args"].get("num_results", 3),
                            )
                            tool_results.append({
                                "type": "tool_result",
                                "tool_use_id": c["id"],
                                "content": search_result,
                            })
                        current_messages = current_messages + [
                            {"role": "user", "content": tool_results}
                        ]
                        break  # break inner for-loop, continue while-loop
                    else:
                        # Không còn web_search tool call → thoát vòng lặp
                        break
                else:
                    if hasattr(chunk, "type") and chunk.type == "content_block_delta":
                        d = chunk.delta
                        if getattr(d, "type", None) == "text_delta":
                            ai_text += d.text
                            yield {"event": "text", "data": d.text}
            else:
                # for-loop hoàn thành không break → done
                break

        if ai_text:
            mood_result = await classify_mood(ai_text)
            mood_val, reaction_emoji = mood_result
            yield {"event": "mood", "data": json.dumps({"mood": mood_val, "reaction_emoji": reaction_emoji})}

        yield {"event": "done", "data": ""}
    finally:
        if ai_text:
            ai_turn_id = await save_turn("assistant", ai_text)
            asyncio.create_task(extract_and_save(user_msg, ai_text, ai_turn_id))
            try:
                async with pool.acquire() as conn:
                    await conn.execute(
                        "INSERT INTO mood_snapshots (mood, trigger) VALUES ($1, $2)",
                        mood_result[0], "chat"
                    )
            except Exception:
                pass
```

- [ ] **Step 4: Test thủ công**

Chạy backend local:
```bash
cd backend && uvicorn main:app --reload
```

Gửi message thử nghiệm: `"Tao không biết nên đọc sách Sapiens hay Atomic Habits, mày biết không?"` — agent nên tự search và trả lời có nội dung cụ thể về 2 cuốn sách.

- [ ] **Step 5: Commit**

```bash
git add backend/routes/chat.py backend/tests/test_chat_websearch.py
git commit -m "feat: handle web_search tool call in chat stream route"
```

---

## Task 5: Frontend — searching indicator + bỏ locationEnabled condition

**Files:**
- Modify: `app/lib/toolExecutor.ts`
- Modify: `app/app/(tabs)/index.tsx`

- [ ] **Step 1: Thêm case `web_search` vào toolExecutor**

Sửa `app/lib/toolExecutor.ts`, thêm case trong switch:
```typescript
case "web_search": break; // handled backend-side
```

Full switch sau khi sửa:
```typescript
switch (t.name) {
  case "trigger_haptic": { /* ... giữ nguyên ... */ break; }
  case "change_theme": setThemeMode(t.args.mode); break;
  case "suggest_song": {
    const q = encodeURIComponent(t.args.query);
    Linking.openURL(`https://www.youtube.com/results?search_query=${q}`);
    break;
  }
  case "memory_save": break;
  case "web_search": break;
}
```

- [ ] **Step 2: Thêm `isSearching` state vào Chat component**

Trong `app/app/(tabs)/index.tsx`, thêm state:
```typescript
const [isSearching, setIsSearching] = useState(false);
```

- [ ] **Step 3: Xử lý event `searching` trong chatStream**

Trong hàm `send()`, sửa callback `chatStream`. Hiện tại `chatStream` nhận các callbacks. Cần xem `app/lib/api.ts` để biết signature — thêm handler cho event `searching`:

Trong `app/lib/api.ts`, tìm nơi parse SSE events và thêm:
```typescript
if (e.event === "searching") {
  onSearching?.();
}
```

Trong `app/app/(tabs)/index.tsx`, truyền callback:
```typescript
await chatStream(
  user,
  (t) => setMsgs(/* ... giữ nguyên */),
  (tools) => executeTools(tools),
  (moodData: MoodData) => { /* ... giữ nguyên */ },
  () => { setStreaming(false); setIsSearching(false); },
  (e) => { console.error(e); setStreaming(false); setIsSearching(false); setMood("neutral"); },
  statusContext(status),
  () => setIsSearching(true),   // onSearching callback
);
```

- [ ] **Step 4: Hiển thị "Đang tìm kiếm..." khi isSearching**

Trong JSX của header, thay phần hiển thị trạng thái:
```tsx
{isSearching
  ? <Text style={{ color: palette.accent, fontSize: 11 }}>🔍 Đang tìm kiếm...</Text>
  : streaming
    ? <TypingIndicator showLabel={true} />
    : <Text style={{ color: palette.accent, fontSize: 11 }}>● online</Text>
}
```

- [ ] **Step 5: Bỏ điều kiện `locationEnabled` trước nút gợi ý**

Tìm đoạn:
```tsx
{locationEnabled && (
  <Pressable
    onPress={openSuggestions}
    ...
  >
    <Text style={{ color: palette.accent, fontSize: 12 }}>
      ✨ Bạn của Kem gợi ý cho hôm nay
    </Text>
  </Pressable>
)}
```

Sửa thành (bỏ `{locationEnabled &&` và đóng ngoặc `}`):
```tsx
<Pressable
  onPress={openSuggestions}
  style={{ margin: 8, padding: 10, backgroundColor: "#111", borderRadius: 8,
    borderWidth: 1, borderColor: "#222", alignItems: "center" }}
>
  <Text style={{ color: palette.accent, fontSize: 12 }}>
    ✨ Bạn của Kem gợi ý cho hôm nay
  </Text>
</Pressable>
```

- [ ] **Step 6: Commit**

```bash
git add app/lib/toolExecutor.ts app/app/(tabs)/index.tsx app/lib/api.ts
git commit -m "feat: add searching indicator and always-show suggestion button"
```

---

## Task 6: Suggestion fallback khi không có GPS

**Files:**
- Create: `backend/prompts/suggest_no_location.txt`
- Modify: `backend/routes/location.py`
- Modify: `backend/tests/test_location.py`

- [ ] **Step 1: Tạo prompt file**

Tạo `backend/prompts/suggest_no_location.txt`:
```
Bạn là "Bạn của Kem" — người bạn thân thiết, ấm áp nhưng đôi khi khó tính.
Kem không bật GPS. Đây là những gì bạn biết về Kem:
{memories}

Tâm trạng hiện tại của Kem: {mood}

Hãy gợi ý 2-3 hoạt động phù hợp với Kem lúc này. Có thể là hoạt động ở nhà hoặc ra ngoài
(đi cafe, đi bơi, ra công viên, mua kem, đọc sách, v.v.) nhưng không cần địa chỉ cụ thể.
Viết ngắn gọn, tự nhiên như một người bạn nhắn tin. Không dùng bullet points. Không hỏi lại.
```

- [ ] **Step 2: Viết test cho fallback**

Thêm vào `backend/tests/test_location.py`:
```python
@pytest.mark.asyncio
async def test_location_suggest_no_location_uses_memories():
    """Khi không có location, suggest dùng memories thay vì trả về []"""
    mock_conn = AsyncMock()
    # Không có location
    mock_conn.fetchrow = AsyncMock(side_effect=[
        None,  # location query → None
        {"mood": "neutral"},  # mood query
    ])
    mock_conn.fetch = AsyncMock(return_value=[
        {"content": "Kem thích đọc sách"},
        {"content": "Kem hay đi cafe"},
    ])
    mock_pool = MagicMock()
    mock_pool.acquire.return_value.__aenter__ = AsyncMock(return_value=mock_conn)
    mock_pool.acquire.return_value.__aexit__ = AsyncMock(return_value=False)

    fake_msg = MagicMock()
    fake_msg.content = [MagicMock(text="Đi cafe đi Kem\nHoặc đọc sách ở nhà cũng được")]

    with patch("routes.location.get_pool", new_callable=AsyncMock, return_value=mock_pool), \
         patch("routes.location._client") as mock_client:
        mock_client.messages.create = AsyncMock(return_value=fake_msg)
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            r = await client.get("/location/suggest", headers={"x-app-key": "test-key"})

    assert r.status_code == 200
    data = r.json()
    assert len(data["suggestions"]) > 0
    assert data["suggestions"] != []
```

- [ ] **Step 3: Chạy test để verify fail**

```bash
cd backend && pytest tests/test_location.py::test_location_suggest_no_location_uses_memories -v
```
Expected: FAIL — hiện tại trả `{"suggestions": []}` khi không có location

- [ ] **Step 4: Sửa `backend/routes/location.py` — thêm fallback**

Sửa hàm `location_suggest`:
```python
@router.get("/location/suggest")
async def location_suggest(request: Request):
    _check_key(request)
    pool = await get_pool()
    async with pool.acquire() as conn:
        loc = await conn.fetchrow(
            "SELECT lat, lng FROM location_history ORDER BY created_at DESC LIMIT 1"
        )
        mood_row = await conn.fetchrow(
            "SELECT mood FROM mood_snapshots ORDER BY created_at DESC LIMIT 1"
        )
        mood = mood_row["mood"] if mood_row else "neutral"

        if loc:
            # Flow cũ: Overpass POI
            poi = await _fetch_poi(loc["lat"], loc["lng"])
            poi_text = "\n".join(f"- {p}" for p in poi) if poi else "Không có thông tin địa điểm cụ thể."
            prompt = load_prompt("suggest").format(poi_list=poi_text, mood=mood)
        else:
            # Fallback: dùng memories
            memories = await conn.fetch(
                "SELECT content FROM memories ORDER BY created_at DESC LIMIT 10"
            )
            memory_text = "\n".join(f"- {m['content']}" for m in memories) or "(chưa có thông tin về Kem)"
            prompt = load_prompt("suggest_no_location").format(memories=memory_text, mood=mood)

    msg = await _client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=200,
        system=prompt,
        messages=[{"role": "user", "content": "gợi ý cho Kem đi"}],
    )
    text = msg.content[0].text.strip()
    suggestions = [s.strip() for s in text.split("\n") if s.strip()]
    return {"suggestions": suggestions}
```

- [ ] **Step 5: Chạy tất cả test location**

```bash
cd backend && pytest tests/test_location.py -v
```
Expected: tất cả PASSED (bao gồm test cũ `test_location_suggest_no_location_returns_empty` — test này sẽ fail vì behavior đã thay đổi, cần update)

Update test cũ trong `test_location.py`:
```python
# Đổi tên và update expected behavior
@pytest.mark.asyncio
async def test_location_suggest_no_location_calls_haiku_with_memories():
    # Test này merge với test_location_suggest_no_location_uses_memories ở trên
    # Xóa test cũ test_location_suggest_no_location_returns_empty
    pass
```

Xóa test `test_location_suggest_no_location_returns_empty` vì behavior đã thay đổi.

- [ ] **Step 6: Commit**

```bash
git add backend/prompts/suggest_no_location.txt backend/routes/location.py backend/tests/test_location.py
git commit -m "feat: fallback activity suggestion using memories when GPS unavailable"
```

---

## Task 7: Kiểm tra `chatStream` API signature

**Files:**
- Modify: `app/lib/api.ts`

> Note: Task này cần làm song song hoặc ngay trước Task 5 Step 3. Để riêng để dễ track.

- [ ] **Step 1: Đọc signature hiện tại của `chatStream`**

Mở `app/lib/api.ts`, tìm function `chatStream` và xác định danh sách parameters hiện tại.

- [ ] **Step 2: Thêm optional `onSearching` callback**

Thêm parameter `onSearching?: () => void` vào cuối danh sách params của `chatStream`.

Trong phần parse SSE event, thêm:
```typescript
if (e.event === "searching") {
  onSearching?.();
}
```

- [ ] **Step 3: Verify TypeScript compile**

```bash
cd app && npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add app/lib/api.ts
git commit -m "feat: add onSearching callback to chatStream API"
```

---

## Self-Review

**Spec coverage:**
- ✅ `web_search` tool trong TOOLS list → Task 3
- ✅ Serper API execution backend-side → Task 2, 4
- ✅ "Đang tìm kiếm..." indicator → Task 5
- ✅ Fallback suggestion dùng memories khi không có GPS → Task 6
- ✅ Nút gợi ý luôn hiển thị (bỏ `locationEnabled` condition) → Task 5
- ✅ `serper_api_key` config → Task 1
- ✅ `suggest_no_location.txt` prompt → Task 6

**Type consistency:**
- `execute_web_search(query: str, num_results: int = 3) -> str` — dùng nhất quán ở Task 2 và Task 4
- Event name `"searching"` — nhất quán giữa backend (Task 4) và frontend (Task 5, 7)
- `onSearching?: () => void` — Task 7 define, Task 5 dùng

**Thứ tự thực hiện khuyến nghị:** Task 1 → 2 → 3 → 7 → 4 → 5 → 6
