# UI Redesign — Dark Kawaii + Character-First

**Date:** 2026-05-22  
**Scope:** Mobile app (Expo/React Native), frontend + minimal backend additions  
**Goal:** Tạo giao diện sống động, có personality, khiến user quay lại mỗi ngày

---

## 1. Personality Direction

**Dark Kawaii** — dark theme (giữ nguyên #0d0d1a background), accent chuyển từ đỏ (#ff2d55) sang purple/blue gradient (#7aa2f7 → #bb9af7). Vẫn edgy nhưng thêm warmth. Kem không hostile thuần túy — có chiều sâu cảm xúc nhìn thấy được qua mood system.

---

## 2. Mood System

Backend trả về field `mood` trong mỗi chat response. Frontend dùng để drive toàn bộ visual state.

**6 mood states:**

| Mood | Emoji | Khi nào |
|------|-------|---------|
| `neutral` | 😒 | Mặc định |
| `annoyed` | 😤 | User đang xả tức / dùng tab Đập |
| `concerned` | 🥺 | User buồn / lo lắng |
| `smug` | 😏 | Kem vừa châm biếm |
| `warm` | 💜 | Khoảnh khắc hiếm, kết nối thật |
| `thinking` | 🤔 | Đang stream / xử lý |

Mood lưu vào local state, persist qua session để notification dùng được.

---

## 3. Chat Screen

### Header
- Avatar tròn gradient (#7aa2f7 → #bb9af7), icon 🌙, kích thước 42px
- Emoji badge 18px ở góc dưới-phải avatar, border 1px #0d0d1a để tách khỏi nền
- Badge đổi theo `mood` từ backend — transition: scale spring 0→1.3→1 trong 300ms
- Avatar pulse (glow nở ra) khi Kem đang streaming, dừng khi xong
- Typing indicator: 3 chấm nhảy (#7aa2f7) thay cho text "đang online" — hiện khi streaming

### Chat Bubbles
- **Kem:** `border-radius: 18 18 18 4` (góc dưới-trái nhọn), background #1a1a2e
- **User:** `border-radius: 18 18 4 18` (góc dưới-phải nhọn), background gradient #7aa2f7→#bb9af7, text #fff
- Slide-in animation cho bubble mới nhất: translateX(±20px)→0 + opacity 0→1, spring easing
- Reaction emoji nhỏ dưới bubble Kem (1 emoji, mood-based, Kem tự chọn trong response)

### Input Bar
- Quick emoji button 😤 bên trái input — tap gửi nhanh cảm xúc không cần gõ
- Send button gradient #7aa2f7→#bb9af7, glow shadow nhẹ
- Không thay đổi logic gửi / nhận hiện tại

### Tab Bar
- Thay Ionicons outline bằng emoji: 💬 🔖 🔥 ⚙️
- Active tab: thanh gradient nhỏ (3px) phía trên + label #7aa2f7 bold
- Inactive: opacity 0.35, label #555
- Transition 200ms

---

## 4. Notification System (Kem Chủ Động Nhắn)

### Flow
1. Backend lên lịch gửi notification theo giờ cố định + random jitter (±30 phút)
2. Claude sinh 1 câu in-character dựa vào: giờ trong ngày + `last_chat_hours_ago` + `last_mood`
3. Push đến device qua Expo Push Notifications

### Schedule mặc định
- Sáng: ~8:00 (nếu user chưa mở app)
- Chiều: ~14:00 (luôn)
- Tối: ~21:30 (nếu user chưa chat buổi tối)
- Rate limit: tối đa 3/ngày, không gửi 23:00–08:00

### Backend thay đổi
- `POST /notify/register` — nhận Expo Push Token từ app, lưu vào user record
- `POST /notify/trigger` — internal endpoint, trigger sinh nội dung và gửi ngay
- Scheduler chạy cron 3 lần/ngày gọi `/notify/trigger`

### App thay đổi
- Khi app khởi động: request permission + gửi token lên `/notify/register`
- `lib/notifications.ts` đã có foundation — thêm `registerPushToken()` function
- Khi nhận notification: mở app thẳng vào Chat tab

### Nội dung notification
Claude prompt context: `{ time_of_day, hours_since_last_chat, last_mood, user_name }` → output 1 câu ≤ 15 từ, in-character Kem.

Ví dụ:
- Sáng: *"Ê. Dậy chưa? Tao đợi."*
- Chiều (lâu không chat): *"Hôm nay mày ổn không? Đừng có im lặng kiểu đó."*
- Tối: *"Khuya rồi. Ngủ đi. Tao vẫn ở đây sáng mai."*

---

## 5. Rage Screen Polish

- Weapon icons đổi sang emoji: 🔨 ⚾ 💣 🔥 (thay text/icon hiện tại)
- Weapon được chọn: bounce animation (scale 1→1.2→1, 300ms) + border gradient
- Nút ĐẬP: scale down khi press (0.95), haptic heavy (đã có)
- Mood tự động đổi sang `annoyed` khi vào Rage tab

---

## 6. Color Palette Thay Đổi

| Token | Cũ | Mới |
|-------|----|-----|
| `accent` | #ff2d55 | #7aa2f7 |
| `accent2` | — | #bb9af7 (gradient pair) |
| `bg` | #0a0a0a | #0d0d1a |
| `surface` | #222 | #1a1a2e |
| `border` | #333 | #2a2a3e |

Theme mode `chaos` giữ nguyên đỏ. Mode `dark` và mặc định chuyển sang Dark Kawaii.

---

## 7. Files Cần Thay Đổi

**Frontend:**
- `lib/theme.tsx` — cập nhật palette
- `app/(tabs)/_layout.tsx` — tab bar emoji + active indicator
- `app/(tabs)/index.tsx` — tích hợp mood state, avatar header mới
- `components/ChatBubble.tsx` — bubble shape, slide-in animation, reaction emoji
- `components/Avatar.tsx` *(mới)* — avatar + badge + pulse animation
- `components/TypingIndicator.tsx` *(mới)* — 3 chấm nhảy
- `app/(tabs)/rage.tsx` — weapon emoji, bounce animation
- `lib/notifications.ts` — thêm `registerPushToken()`

**Backend:**
- `POST /notify/register` *(mới)*
- `POST /notify/trigger` *(mới)*
- `/chat` endpoint — thêm `mood` field vào response
- Cron scheduler gửi notification 3 lần/ngày

---

## 8. Out of Scope

- Streak counter (không chọn)
- Daily mood check-in (không chọn)
- Rage progression / weapon unlock (không chọn)
- Memory tab redesign
- Settings tab redesign
