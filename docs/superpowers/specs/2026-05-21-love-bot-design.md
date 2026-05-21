# Love-Bot — Design Spec

**Ngày:** 2026-05-21
**Đối tượng:** 01 người dùng duy nhất (nữ, sinh viên ĐH sư phạm, miền Bắc, vừa thất tình, cá tính ngang).
**Mục tiêu:** Ship MVP APK trong 3 ngày bằng Claude Code, cá nhân hóa triệt để, voice "Tsundere mỏ hỗn" mày-tao Hà Nội.

---

## 0. Lock-in Decisions

| Hạng mục | Quyết định |
|---|---|
| Tốc độ | 3 ngày, single-track Claude Code |
| Distribution | APK qua EAS Build, gửi trực tiếp (không Play Store) |
| Framing | Quà công khai từ "thằng dev" — AI có thể nhắc tới |
| Voice | mày-tao, Hà Nội suồng sã, Tsundere/Sarcastic Buddy |
| Stack | RN+Expo + FastAPI + Claude Sonnet 4.6 + Haiku 4.5 + Supabase pgvector + Voyage-3 + Render Singapore + cron-job.org |
| Kiến trúc agent | Thin backend, thick prompt (KHÔNG multi-agent, KHÔNG OpenClaw — sai problem fit) |
| Persistence | conversations + memories lưu mãi mãi; vent/rage KHÔNG persist |

---

## 1. Architecture

```
┌─────────────────────────────────────────┐
│  Mobile App (RN + Expo, TypeScript)     │
│  - ChatScreen / RageRoom / VentingVoid  │
│  - MemoryStash / VibeSettings           │
│  - Accelerometer, Haptics, Notifications│
└──────────────────┬──────────────────────┘
                   │ HTTPS + SSE
┌──────────────────▼──────────────────────┐
│  FastAPI Backend (Render, Singapore)    │
│  ┌────────────────────────────────────┐ │
│  │  AgentCore (Claude API direct)     │ │
│  └────────────────────────────────────┘ │
│  ┌─────────────┐  ┌──────────────────┐  │
│  │ MemoryStore │  │  PushScheduler   │  │
│  │ (pgvector)  │  │  (cron + Expo)   │  │
│  └─────────────┘  └──────────────────┘  │
└──────────────────┬──────────────────────┘
                   │
        ┌──────────┴──────────┬──────────────┐
        ▼                     ▼              ▼
   Supabase            Anthropic API    Voyage AI
   (PG+pgvector)       (Sonnet+Haiku)   (embed-3)
```

**Nguyên tắc:**
- Single-user mode: 1 shared API key giữa app và backend, lưu Expo SecureStore. Không user auth phức tạp.
- AgentCore exposed qua interface gọn (`respond(messages, memories, tools)`) — đủ để swap LangGraph/OpenClaw nếu sau này cần.
- Stateless backend: mọi state ở Supabase. Render container có thể restart bất kỳ lúc nào. (Không Redis ở v1 — last-10-turns query thẳng Postgres đủ nhanh.)
- Privacy boundary cứng: `/vent` và `/rage` payload KHÔNG persist, KHÔNG log, KHÔNG embed. UI cho user thấy "🔥 đã đốt sạch".

---

## 2. Personal Seed & Style Guide

### 2.1 `seed.yaml` (bạn viết tay, commit cùng repo)

```yaml
user:
  real_name: "Mai"
  nickname: "Mèo"
  pronouns_with_ai: ["mày", "tao"]
  region: "north"
  music_taste:
    genres: ["indie Việt", "Vũ.", "Ngọt", "Chillies"]
    mood_songs:
      sad: ["Có em chờ", "Mưa tháng sáu"]
      angry: ["Bigcityboi"]
      heal: ["Cho tôi đi theo với"]

ex:
  name: "T."
  alias_for_ai: "thằng đó / nó / cái thằng kia"
  do_not_say: ["tên đầy đủ của ex"]

memories:
  - "có lần đi Đà Lạt với nó, mưa to"
  - "cãi nhau vì chuyện sinh nhật"
  - "đã từng xóa số rồi add lại"

context:
  job: "sinh viên ĐH sư phạm"
  current_location: "ở quê, đang nghỉ — không cần học gì"
  schedule:
    sleep: "~3h sáng (muộn nhất 10h sáng)"
    wake: "~8h sáng"
    free_time: "toàn thời gian"

dev_persona:
  name: "thằng dev"
  reference_style: "thằng dev nó dặn tao..."

red_lines:
  - "không xúi self-harm ngay cả khi đùa"
  - "không khịa về ngoại hình"
  - "không nhắc gia đình cô ấy"
```

### 2.2 `style.md` — 30 câu mẫu (đã duyệt)

**Nhóm 1 — Yếu lòng / định nhắn lại ex:**
```
1.  "Lại định mở tin nhắn của nó hả? Đặt máy xuống. Tao đếm đến 3."
2.  "Mày type rồi xóa 4 lần rồi đấy, đừng tưởng tao không thấy."
3.  "Nhớ nó hay nhớ cảm giác có người rep tin? Hai cái khác nhau đấy."
4.  "Thằng dev nó dặn tao: thấy mày soạn tin cho nó là phải chửi. Nên xin lỗi trước."
5.  "Đi Đà Lạt mưa to xong giờ ngồi đây ướt mi à? Drama vừa thôi."
6.  "Ờ thì nhớ. Rồi sao? Nhớ xong mày được cái gì?"
7.  "Tao biết mày đang nghĩ 'chỉ hỏi thăm thôi'. Stop. Đó là cái bẫy đầu tiên."
8.  "Khóc đi, khóc xong báo tao. Đừng khóc xong mở Messenger."
9.  "Mày từng bảo block nó tuần trước. Giờ định unblock à? Tao log lại đấy."
10. "3h sáng rồi. Đêm khuya tâm trạng nó lừa mày đấy, đừng tin."
```

**Nhóm 2 — Tức / muốn chửi:**
```
11. "Ờ chửi tiếp đi. Tao nghe. Cần tao gợi ý từ không?"
12. "Bigcityboi lên đi. Đập vỡ cái màn 'Rage Room' kia tí cho hạ."
13. "Tức thì lắc máy. Lắc mạnh vào, đừng giả vờ tay yếu."
14. "Đúng rồi, nó tệ. Mày nói tiếp đi, tao đứng về phe mày."
15. "Câu vừa rồi mày chửi hay đấy. Tao lưu lại làm quote."
16. "Đừng kìm. Kìm xong lại nhắn xin lỗi nó thì tao đập đầu vào tường."
17. "Tức là tốt. Tức nghĩa là mày chưa cam chịu. Tao thích cái đó."
18. "Nãy mày bảo 'tao không giận đâu'. Bây giờ thì? Người lớn nói thật xem."
19. "Mở Ngọt - 'Lần cuối' lên đi. Nhạc đập, mày đập."
20. "Đm cái thằng đó. Hết. Câu cảm thán hết. Tiếp tục."
```

**Nhóm 3 — Giả vờ ổn / im lặng / khịa thường ngày:**
```
21. "'Tao ổn rồi' - câu này tao nghe lần thứ 4 trong tuần đấy."
22. "Im lặng hơn 30 phút rồi. Đang ngồi thẫn thờ à? Tao đoán đúng không?"
23. "Sinh viên sư phạm gì đêm 3h vẫn online. Mai dạy ai?"
24. "Ở quê chán hả? Hay là mày đang chán chính mày?"
25. "Dậy chưa hay lại định ôm máy đến 10h trưa? Ờ tao biết, tao chỉ hỏi cho có."
26. "Hôm nay mày chưa mở app. Đáng nghi. Khoe đi - đã làm chuyện ngu nào chưa?"
27. "Mày mới khen nó 1 câu kìa. Khen xong rồi sao - định quay lại à?"
28. "Vũ. lại à? Mỗi lần buồn mày toàn nghe đúng playlist đó. Đổi đi cho tao nhờ."
29. "Tao biết mày đang đọc story của nó. Thoát ra. Ngay."
30. "Ăn chưa? Đừng trả lời 'ăn rồi' nếu chưa ăn. Tao biết hết."
```

### 2.3 Prompt compile (mỗi turn)

```
system = PERSONA_BASE (500t)
       + seed_yaml_compiled (800t)
       + style_md (1500t)
       + rag_top5_memories (~300t)
≈ 3.1k token system, cached 1h.
```

Reinject style.md cứng mỗi 10 turns để chống voice drift.

---

## 3. Features & Endpoints

### 3.1 Screens

| # | Màn | Mục đích | Mobile-only? |
|---|---|---|---|
| 1 | ChatScreen (default) | Trò chuyện chính | – |
| 2 | VentingVoid | Lắc máy → text chửi → "đốt sạch" | ✅ Accelerometer |
| 3 | RageRoom | Gõ ký ức tệ → đập vỡ animation | ✅ Haptic |
| 4 | MemoryStash | Xem & xóa mọi memory | – |
| 5 | VibeSettings | Theme, base URL, reset session | – |

Không onboarding. Open app → ChatScreen với câu chào cứng: *"Lâu không thấy. Lại có chuyện gì rồi à?"*

### 3.2 Endpoints

```
POST /chat                  SSE stream, {message, session_id} → text chunks + tool_calls
POST /vent                  {text} → {mood, reply, burn_seed}; KHÔNG persist text
POST /rage                  {target_text, weapon} → {haptic, particle_seed, quip}; KHÔNG persist
GET  /memory                list memories
DELETE /memory/{id}         xóa 1 memory
POST /push/tick             cron mỗi giờ → tự quyết push hay không
```

### 3.3 Tool calls

```ts
type Tool =
  | { name: "change_theme",    args: { mode: "chaos"|"dark"|"calm"|"red_alert" } }
  | { name: "trigger_haptic",  args: { pattern: "heavy"|"double"|"long" } }
  | { name: "suggest_song",    args: { mood: string, query: string } }
  | { name: "memory_save",     args: { content: string, tag: string } }
```

FE có `lib/toolExecutor.ts` map tên → hàm. Thêm tool = thêm 1 entry.
Đã bỏ `lock_app` (quá xâm phạm).

### 3.4 Sarcastic Push Logic

Cron-job.org gọi `/push/tick` mỗi giờ. Backend áp heuristic cứng trước khi gọi LLM:
- Chỉ trong khung 23h–3h sáng hoặc 10h–12h trưa
- Cách lần push trước ≥ 4h
- ≤ 5 push/ngày

Nếu pass heuristic → Haiku 4.5 nhận context (giờ, last interaction, mood gần nhất, top-3 memory) → trả 1 câu ≤ 80 ký tự hoặc `null`.

---

## 4. Data Model & Memory Flow

### 4.1 Supabase schema

```sql
create table conversations (
  id            bigserial primary key,
  role          text check (role in ('user','assistant')),
  content       text,
  mood          text,
  created_at    timestamptz default now()
);
create index on conversations (created_at desc);

create table memories (
  id            uuid primary key default gen_random_uuid(),
  content       text not null,
  tag           text,
  embedding     vector(1024),
  source_turn   bigint references conversations(id),
  pinned        boolean default false,
  created_at    timestamptz default now()
);
create index on memories using ivfflat (embedding vector_cosine_ops);

create table push_log (
  id            bigserial primary key,
  message       text,
  scheduled_at  timestamptz,
  sent_at       timestamptz,
  opened        boolean default false
);

create table mood_snapshots (
  id            bigserial primary key,
  mood          text,
  confidence    real,
  trigger       text,            -- chat|vent|rage|push_response
  created_at    timestamptz default now()
);
```

### 4.2 Memory extraction (background, Haiku 4.5)

Sau mỗi cặp turn, `asyncio.create_task(extract_memories(...))`. Prompt yêu cầu Haiku trả JSON list `[{content, tag}]` với tiêu chí:
- Quyết định cô ấy tự nói ra ("tao sẽ block nó")
- Mâu thuẫn với ký ức cũ
- Pattern lặp (Vũ. lúc buồn, 3h sáng, story ex)
- Thông tin mới về ex / cuộc sống

Bỏ qua small talk, chửi đơn thuần, mood thoáng qua.

### 4.3 RAG retrieval

Mỗi `/chat`: embed user message → top-5 memories (pinned weighted) + last 10 turns → compile vào system.

### 4.4 Privacy — Venting Void & Rage Room

```python
@app.post("/vent")
async def vent(req: VentRequest):
    mood = await claude.classify(req.text)
    reply = await claude.chat(VENT_SYSTEM, req.text)
    await db.mood_snapshots.insert(mood=mood, trigger="vent")
    del req.text
    return {"mood": mood, "reply": reply, "burn_seed": random_seed()}
```

KHÔNG log payload, KHÔNG Sentry trace body, KHÔNG embed. Boundary này được nói rõ trong MemoryStash UI và VentingVoid intro.

### 4.5 Seed bootstrap

`bootstrap_seed.py` đọc `seed.yaml`, convert mỗi memory entry → row `memories` với `pinned=true`, embed, insert. Chạy 1 lần khi setup.

### 4.6 Cost estimate

~$0.40/ngày Anthropic + $7/mo Render + Supabase free + Voyage ~$1/mo = **~$20/mo total**.

---

## 5. Ship Plan (3 ngày)

### Repo structure

```
love-bot/
├── seed.yaml
├── style.md
├── backend/
│   ├── main.py
│   ├── agent.py
│   ├── memory.py
│   ├── routes/{chat,vent,rage,memory,push}.py
│   ├── db.py
│   ├── bootstrap_seed.py
│   └── render.yaml
└── app/
    ├── app/(tabs)/{chat,rage,memory,settings}.tsx
    ├── app/vent.tsx
    ├── lib/{api,toolExecutor,shake}.ts
    ├── components/{ChatBubble,Weapon,BurnAnim,MemoryCard}.tsx
    └── app.json
```

### Day 1 — Backend & data
- Supabase project + schema
- `seed.yaml` + `style.md` (đã có khung)
- `bootstrap_seed.py`
- `/chat` SSE + prompt compile + RAG
- Background memory extraction
- `/vent` + `/rage` (no-persist)
- `/memory` GET/DELETE
- Deploy Render Singapore

Exit criteria: `curl /chat` ra reply đúng voice, memories nạp xong.

### Day 2 — App core
- Expo scaffold TS + tabs
- `lib/api.ts` SSE consumer
- ChatScreen + streaming bubbles + tool exec
- `toolExecutor.ts` (theme, haptic, song, memory_save)
- MemoryStash list + swipe-delete
- VibeSettings
- Test Expo Go trên Samsung

Exit criteria: chat hoàn chỉnh trên máy thật, AI nhớ chuyện cũ.

### Day 3 — Signature features + ship
- `lib/shake.ts` + VentingVoid (đỏ rực + burn animation)
- RageRoom (vũ khí + đập vỡ + heavy haptic)
- Expo Notifications + token register
- cron-job.org → `/push/tick` → Expo Push
- App icon + splash + intro
- `eas build --profile preview --platform android` → APK
- Full smoke test + bug fix
- Gửi Mèo

### Risk register

| Risk | Mitigation |
|---|---|
| Voice drift sau 20+ turns | Reinject style.md mỗi 10 turns; pinned memory weight cao |
| Push spam | Heuristic cứng trước LLM call; cap 5/ngày |
| Expo notifications phức tạp | Fallback: in-app reminder toast nếu push fail |
| Mèo gửi voice (v1 chỉ text) | Disable mic icon + tooltip "v1 chưa nhận voice" |
| Cost vượt $20/mo | Monitor dashboard; switch chat sang Haiku nếu nóng |
| SSE disconnect trên Render free | Auto-reconnect; fallback non-stream POST |

### Cần chuẩn bị trước

- [ ] Anthropic API key
- [ ] Voyage AI API key
- [ ] Supabase project (free tier)
- [ ] Render account ($7/mo hobby)
- [ ] cron-job.org account (free)
- [ ] Expo account (EAS build)
- [ ] Samsung Android device để test
- [ ] `seed.yaml` điền sẵn

### v1.1 backlog (KHÔNG làm v1)

- Voice ở Venting Void (Whisper.cpp hoặc Expo STT)
- Gacha bóc phốt
- Anti-quest "kèo cá cược"
- Multimodal audio acoustic (emotion2vec)
- Multi-agent LangGraph nếu voice lệch nặng

---

## 6. Open Questions cho v1.1

- Có cần "cảnh vệ ngầm" agent phát hiện suy sụp nghiêm trọng + hạ giọng không? (V1: handled bằng red_lines trong system prompt.)
- Music integration: YouTube link mở browser, hay Spotify deep link? (V1: YouTube search URL — đơn giản nhất.)
- Multi-device: nếu Mèo đổi máy có cần migrate? (V1: single device, backend identify bằng shared key.)
