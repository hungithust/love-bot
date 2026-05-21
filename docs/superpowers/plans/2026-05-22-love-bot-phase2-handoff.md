# Love-Bot Phase 2 & 3 — Session Handoff

**Date:** 2026-05-22  
**Status:** Phase 1 backend COMPLETE. Railway deploying (env vars cần set). Phase 2 (app) chưa bắt đầu.

---

## Trạng thái hiện tại

### Backend — DONE ✅

Tất cả task Phase 1 đã commit tại `d:\love-bot`:

| Task | Commit | Trạng thái |
|---|---|---|
| 0.1 scaffold | 633888a + 1d3b31e | ✅ |
| 1.1 DB schema | 3132530 | ✅ |
| 1.2 config + prompts | 6db60cf + 3934701 | ✅ |
| 1.3 AgentCore | e53d917 | ✅ |
| 1.4 memory | 133f00f | ✅ |
| 1.5 /chat SSE | 83de9a7 + 87359f3 | ✅ |
| 1.6 /vent /rage | b86b8b0 | ✅ |
| 1.7 /memory | b86b8b0 | ✅ |
| 1.8 bootstrap_seed | b86b8b0 | ✅ |
| 1.9 Railway deploy | f61b215 | ⏳ env vars cần set |

### Expo App — CHƯA SCAFFOLD

`d:\love-bot\app\` hiện là thư mục rỗng. **Bước đầu tiên của session mới là scaffold Expo app.**

---

## Thông tin quan trọng — KHÔNG được quên

### Supabase
- **DATABASE_URL** (Transaction pooler, IPv4, port 6543):
  ```
  postgresql+asyncpg://postgres.pnzezjiihjgtdfkuwngs:O0fQAvtj1xJliqdY@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres
  ```
- asyncpg pool phải có `statement_cache_size=0` (đã có trong `db.py`) — bắt buộc cho pgbouncer Transaction mode

### Railway
- Region: Singapore
- Root dir: `backend/`
- Venv tại `/app/.venv/` — tất cả binary dùng full path `/app/.venv/bin/uvicorn`
- 4 env vars cần set trong Railway dashboard: `ANTHROPIC_API_KEY`, `VOYAGE_API_KEY`, `DATABASE_URL`, `APP_SHARED_KEY`
- Config: `backend/railway.json` + `backend/nixpacks.toml` + `backend/requirements.txt`

### Backend URL (sau khi Railway deploy xong)
- Health check: `GET https://<railway-url>/health` → `{"ok": true}`
- Cần Railway URL thật để điền vào app VibeSettings

### Backend code quirks đã fix
- `main.py` có `load_dotenv()` ở đầu file (trước mọi import) — bắt buộc để đọc `.env` local
- `bootstrap_seed.py` cũng có `load_dotenv()` — standalone script
- `persona_base.txt` có rule: **TOOL USE là SUPPLEMENTARY** — AI phải LUÔN có text reply, tool call chỉ là bonus. Nếu bỏ rule này AI sẽ trả về tool-only, user không thấy text.
- `config.py` dùng Pydantic v2 `SettingsConfigDict` (không phải `class Config`)

### Seed (đã personalized)
```yaml
user:
  real_name: "Ngọc Khánh"
  nickname: "Kem"
  alt_nickname: "kemku"
  music: SZA, R&B, neo soul
  sleep: ~3h sáng, wake ~7-8h sáng
memories: []   # trống, user chưa cung cấp kỷ niệm cụ thể
```

### Voice test chuẩn
Test phrase: `"tao buồn vl"`  
Expected reply style: *"Buồn kiểu ngồi thẫn thờ hay buồn kiểu tay đang gần hover vào cái tên đó?"* — sarcastic, không generic

---

## Backend file structure hiện tại

```
backend/
├── main.py                    # FastAPI app, 4 routers, lifespan migrations
├── agent.py                   # compile_system_prompt(), parse_tool_calls(), respond_stream()
├── memory.py                  # embed(), rag_top_k(), recent_turns(), save_turn(), extract_and_save()
├── db.py                      # get_pool() (statement_cache_size=0), run_migrations()
├── config.py                  # Settings (pydantic-settings v2), load_seed/style/prompt
├── bootstrap_seed.py          # one-time seed loader
├── requirements.txt           # pip deps (no editable install)
├── railway.json               # Railway deploy config
├── nixpacks.toml              # python311 + pip, venv at /app/.venv
├── Procfile                   # fallback start command
├── .env                       # local only, gitignored
├── .env.example               # template
├── migrations/
│   └── 001_init.sql           # 4 tables: conversations, memories, push_log, mood_snapshots
├── prompts/
│   ├── persona_base.txt       # Tsundere system prompt (has SUPPLEMENTARY tool rule)
│   ├── extract.txt            # Haiku memory extraction prompt
│   └── push.txt               # Push notification decision prompt
├── routes/
│   ├── __init__.py
│   ├── chat.py                # POST /chat SSE
│   ├── vent.py                # POST /vent (no-persist)
│   ├── rage.py                # POST /rage (no-persist)
│   └── memory.py              # GET/DELETE /memory
└── tests/
    ├── test_db.py
    ├── test_agent.py
    └── test_memory.py
```

---

## Phase 2: App Core — Tasks còn lại

### PRE-TASK: Scaffold Expo App (làm trước 2.1)

Chạy trong `d:\love-bot\app\`:
```bash
npx create-expo-app@latest . --template tabs
npx expo install expo-haptics expo-sensors expo-notifications expo-secure-store react-native-reanimated react-native-sse
```

App name: **"Mèo & Tao"**, slug: **"love-bot"**, platform: android only.

Sau đó commit: `git add app && git commit -m "chore(app): expo scaffold"`

---

### Task 2.1: API client + theme + shared key storage

**Files cần tạo:** `app/lib/storage.ts`, `app/lib/api.ts`, `app/lib/theme.ts`

#### `app/lib/storage.ts`
```typescript
import * as SecureStore from "expo-secure-store";
const BASE_URL_KEY = "BASE_URL";
const APP_KEY = "APP_KEY";

export const storage = {
  async getBase() { return (await SecureStore.getItemAsync(BASE_URL_KEY)) ?? ""; },
  async setBase(v: string) { await SecureStore.setItemAsync(BASE_URL_KEY, v); },
  async getKey() { return (await SecureStore.getItemAsync(APP_KEY)) ?? ""; },
  async setKey(v: string) { await SecureStore.setItemAsync(APP_KEY, v); },
};
```

#### `app/lib/api.ts`
```typescript
import EventSource from "react-native-sse";
import { storage } from "./storage";

export type ToolCall = { name: string; args: any; id: string };

export async function chatStream(
  message: string,
  onText: (t: string) => void,
  onTools: (t: ToolCall[]) => void,
  onDone: () => void,
  onError: (e: any) => void,
) {
  const base = await storage.getBase();
  const key = await storage.getKey();
  const es = new EventSource(`${base}/chat`, {
    method: "POST",
    headers: { "x-app-key": key, "content-type": "application/json" },
    body: JSON.stringify({ message }),
    pollingInterval: 0,
  });
  es.addEventListener("text", (e: any) => onText(e.data));
  es.addEventListener("tool", (e: any) => onTools(JSON.parse(e.data)));
  es.addEventListener("done", () => { es.close(); onDone(); });
  es.addEventListener("error", (e: any) => { es.close(); onError(e); });
  return () => es.close();
}

export async function postJSON(path: string, body: any) {
  const base = await storage.getBase();
  const key = await storage.getKey();
  const r = await fetch(`${base}${path}`, {
    method: "POST",
    headers: { "x-app-key": key, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

export async function getJSON(path: string) {
  const base = await storage.getBase();
  const key = await storage.getKey();
  const r = await fetch(`${base}${path}`, { headers: { "x-app-key": key } });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

export async function deleteJSON(path: string) {
  const base = await storage.getBase();
  const key = await storage.getKey();
  const r = await fetch(`${base}${path}`, { method: "DELETE", headers: { "x-app-key": key } });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}
```

#### `app/lib/theme.ts`
```typescript
import React, { createContext, useContext, useState } from "react";

export type ThemeMode = "chaos" | "dark" | "calm" | "red_alert";

const PALETTES: Record<ThemeMode, { bg: string; fg: string; accent: string }> = {
  chaos:     { bg: "#0a0a0a", fg: "#ffffff", accent: "#ff2d55" },
  dark:      { bg: "#000000", fg: "#e5e5e5", accent: "#888888" },
  calm:      { bg: "#1a1a2e", fg: "#eaeaea", accent: "#7aa2f7" },
  red_alert: { bg: "#1a0000", fg: "#ffe5e5", accent: "#ff0000" },
};

const Ctx = createContext({ mode: "dark" as ThemeMode, set: (_:ThemeMode)=>{}, palette: PALETTES.dark });

export function ThemeProvider({ children }: any) {
  const [mode, setMode] = useState<ThemeMode>("dark");
  return <Ctx.Provider value={{ mode, set: setMode, palette: PALETTES[mode] }}>{children}</Ctx.Provider>;
}

export const useTheme = () => useContext(Ctx);
```

Commit: `feat(app): api client + theme + secure storage`

---

### Task 2.2: ChatScreen với streaming

**Files:** `app/components/ChatBubble.tsx`, `app/app/(tabs)/chat.tsx`, update `app/app/_layout.tsx`

#### `app/components/ChatBubble.tsx`
```typescript
import { Text, View } from "react-native";
import { useTheme } from "@/lib/theme";

export function ChatBubble({ role, content }: { role: "user"|"assistant"; content: string }) {
  const { palette } = useTheme();
  const isUser = role === "user";
  return (
    <View style={{
      alignSelf: isUser ? "flex-end" : "flex-start",
      backgroundColor: isUser ? palette.accent : "#222",
      padding: 10, borderRadius: 12, marginVertical: 4, maxWidth: "80%",
    }}>
      <Text style={{ color: palette.fg }}>{content}</Text>
    </View>
  );
}
```

#### `app/app/(tabs)/chat.tsx`
```typescript
import { useState, useRef } from "react";
import { View, TextInput, Pressable, Text, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { chatStream } from "@/lib/api";
import { ChatBubble } from "@/components/ChatBubble";
import { useTheme } from "@/lib/theme";
import { executeTools } from "@/lib/toolExecutor";

type Msg = { role: "user"|"assistant"; content: string };

export default function Chat() {
  const { palette } = useTheme();
  const [msgs, setMsgs] = useState<Msg[]>([
    { role: "assistant", content: "Lâu không thấy. Lại có chuyện gì rồi à?" }
  ]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const scroll = useRef<ScrollView>(null);

  async function send() {
    if (!input.trim() || streaming) return;
    const user = input.trim();
    setInput("");
    setMsgs(m => [...m, { role: "user", content: user }, { role: "assistant", content: "" }]);
    setStreaming(true);
    await chatStream(
      user,
      (t) => setMsgs(m => {
        const copy = [...m];
        copy[copy.length - 1] = { role: "assistant", content: copy[copy.length - 1].content + t };
        return copy;
      }),
      (tools) => executeTools(tools),
      () => setStreaming(false),
      (e) => { console.error(e); setStreaming(false); },
    );
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1, backgroundColor: palette.bg }}>
      <ScrollView ref={scroll}
        onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })}
        style={{ padding: 12 }}>
        {msgs.map((m, i) => <ChatBubble key={i} role={m.role} content={m.content} />)}
      </ScrollView>
      <View style={{ flexDirection: "row", padding: 8, gap: 8 }}>
        <TextInput value={input} onChangeText={setInput} placeholder="nói đi..."
          placeholderTextColor="#888"
          style={{ flex: 1, color: palette.fg, backgroundColor: "#222", padding: 10, borderRadius: 8 }}
          onSubmitEditing={send} />
        <Pressable onPress={send}
          style={{ backgroundColor: palette.accent, padding: 10, borderRadius: 8 }}>
          <Text style={{ color: palette.fg }}>gửi</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
```

#### `app/app/_layout.tsx` — wrap root với ThemeProvider
```typescript
import { ThemeProvider } from "@/lib/theme";
import { Stack } from "expo-router";
// ... existing imports

export default function RootLayout() {
  return (
    <ThemeProvider>
      <WireTools />
      <Stack />
    </ThemeProvider>
  );
}
```

`WireTools` component sẽ được thêm ở Task 2.3.

Commit: `feat(app): ChatScreen streaming`

---

### Task 2.3: Tool Executor

**File:** `app/lib/toolExecutor.ts`

```typescript
import * as Haptics from "expo-haptics";
import { Linking } from "react-native";
import type { ToolCall } from "./api";

let setThemeMode: (m: any) => void = () => {};
export function bindThemeSetter(fn: (m: any) => void) { setThemeMode = fn; }

export async function executeTools(tools: ToolCall[]) {
  for (const t of tools) {
    try {
      switch (t.name) {
        case "trigger_haptic": {
          const p = t.args.pattern;
          if (p === "heavy") await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          else if (p === "double") {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium), 120);
          } else {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          }
          break;
        }
        case "change_theme": setThemeMode(t.args.mode); break;
        case "suggest_song": {
          const q = encodeURIComponent(t.args.query);
          Linking.openURL(`https://www.youtube.com/results?search_query=${q}`);
          break;
        }
        case "memory_save": break; // server handles extraction
      }
    } catch (e) { console.warn("tool error", t.name, e); }
  }
}
```

**Wire `bindThemeSetter` trong `_layout.tsx`:**
```typescript
import { useEffect } from "react";
import { bindThemeSetter } from "@/lib/toolExecutor";
import { useTheme } from "@/lib/theme";

function WireTools() {
  const { set } = useTheme();
  useEffect(() => { bindThemeSetter(set); }, [set]);
  return null;
}
// Render <WireTools /> inside ThemeProvider in RootLayout
```

Commit: `feat(app): tool executor (haptic/theme/song)`

---

### Task 2.4: MemoryStash Screen

**Files:** `app/components/MemoryCard.tsx`, `app/app/(tabs)/memory.tsx`

#### `app/components/MemoryCard.tsx`
```typescript
import { View, Text, Pressable } from "react-native";
import { useTheme } from "@/lib/theme";

export function MemoryCard({ item, onDelete }: { item: any; onDelete: () => void }) {
  const { palette } = useTheme();
  return (
    <View style={{ flexDirection: "row", padding: 12, backgroundColor: "#1c1c1c",
                   marginVertical: 4, borderRadius: 8, alignItems: "center" }}>
      <View style={{ flex: 1 }}>
        <Text style={{ color: palette.fg, fontSize: 14 }}>{item.content}</Text>
        <Text style={{ color: "#888", fontSize: 11, marginTop: 4 }}>
          {item.tag}{item.pinned ? " · 📌 seed" : ""}
        </Text>
      </View>
      {!item.pinned && (
        <Pressable onPress={onDelete} style={{ padding: 8 }}>
          <Text style={{ color: palette.accent }}>🗑</Text>
        </Pressable>
      )}
    </View>
  );
}
```

#### `app/app/(tabs)/memory.tsx`
```typescript
import { useEffect, useState, useCallback } from "react";
import { View, Text, FlatList, RefreshControl } from "react-native";
import { getJSON, deleteJSON } from "@/lib/api";
import { MemoryCard } from "@/components/MemoryCard";
import { useTheme } from "@/lib/theme";

export default function Memory() {
  const { palette } = useTheme();
  const [items, setItems] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const load = useCallback(async () => {
    setRefreshing(true);
    try { setItems(await getJSON("/memory")); } catch {}
    setRefreshing(false);
  }, []);
  useEffect(() => { load(); }, [load]);
  return (
    <View style={{ flex: 1, backgroundColor: palette.bg, padding: 12 }}>
      <Text style={{ color: palette.fg, fontSize: 18, marginBottom: 8 }}>
        App đang nhớ về mày ({items.length})
      </Text>
      <FlatList data={items} keyExtractor={i => i.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor={palette.fg} />}
        renderItem={({ item }) => <MemoryCard item={item} onDelete={async () => {
          await deleteJSON(`/memory/${item.id}`); load();
        }} />}
      />
    </View>
  );
}
```

Commit: `feat(app): MemoryStash UI`

---

### Task 2.5: VibeSettings Screen

**File:** `app/app/(tabs)/settings.tsx`

```typescript
import { useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, Alert } from "react-native";
import { storage } from "@/lib/storage";
import { useTheme, ThemeMode } from "@/lib/theme";

const MODES: ThemeMode[] = ["chaos", "dark", "calm", "red_alert"];

export default function Settings() {
  const { mode, set, palette } = useTheme();
  const [base, setBase] = useState("");
  const [key, setKey] = useState("");
  useEffect(() => { storage.getBase().then(setBase); storage.getKey().then(setKey); }, []);

  async function save() {
    await storage.setBase(base.trim());
    await storage.setKey(key.trim());
    Alert.alert("ok", "đã lưu");
  }

  return (
    <View style={{ flex: 1, backgroundColor: palette.bg, padding: 16, gap: 12 }}>
      <Text style={{ color: palette.fg, fontSize: 14 }}>Backend URL</Text>
      <TextInput value={base} onChangeText={setBase} autoCapitalize="none"
        style={{ color: palette.fg, backgroundColor: "#222", padding: 10, borderRadius: 8 }} />
      <Text style={{ color: palette.fg, fontSize: 14 }}>App Key</Text>
      <TextInput value={key} onChangeText={setKey} autoCapitalize="none" secureTextEntry
        style={{ color: palette.fg, backgroundColor: "#222", padding: 10, borderRadius: 8 }} />
      <Pressable onPress={save} style={{ backgroundColor: palette.accent, padding: 12, borderRadius: 8 }}>
        <Text style={{ color: palette.fg, textAlign: "center" }}>Lưu</Text>
      </Pressable>
      <Text style={{ color: palette.fg, marginTop: 16 }}>Theme</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {MODES.map(m => (
          <Pressable key={m} onPress={() => set(m)}
            style={{ padding: 8, borderRadius: 6, backgroundColor: m === mode ? palette.accent : "#222" }}>
            <Text style={{ color: palette.fg }}>{m}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
```

Commit: `feat(app): VibeSettings`  
Tag: `git tag day-2-complete`

---

## Phase 3: Signature Features + Ship

### Task 3.1: Shake-to-Rant + VentingVoid

**Files:** `app/lib/shake.ts`, `app/app/vent.tsx`, update `app/app/(tabs)/_layout.tsx`

#### `app/lib/shake.ts`
```typescript
import { useEffect } from "react";
import { Accelerometer } from "expo-sensors";
import { router } from "expo-router";

export function useShakeNavigation() {
  useEffect(() => {
    Accelerometer.setUpdateInterval(100);
    let last = 0;
    const sub = Accelerometer.addListener(({ x, y, z }) => {
      const force = Math.sqrt(x * x + y * y + z * z);
      const now = Date.now();
      if (force > 2.4 && now - last > 2500) {
        last = now;
        router.push("/vent");
      }
    });
    return () => sub.remove();
  }, []);
}
```

Call `useShakeNavigation()` tại top của tabs layout component (`app/app/(tabs)/_layout.tsx`).

#### `app/app/vent.tsx`
```typescript
import { useState } from "react";
import { View, Text, TextInput, Pressable } from "react-native";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { postJSON } from "@/lib/api";

export default function Vent() {
  const [text, setText] = useState("");
  const [reply, setReply] = useState<string | null>(null);
  const [burning, setBurning] = useState(false);

  async function burn() {
    if (!text.trim()) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setBurning(true);
    try {
      const r = await postJSON("/vent", { text });
      setReply(r.reply);
      setText("");
      setTimeout(() => setBurning(false), 1800);
    } catch { setBurning(false); }
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#1a0000", padding: 24, justifyContent: "center" }}>
      <Text style={{ color: "#fff", fontSize: 22, marginBottom: 12, fontWeight: "700" }}>
        🔥 Hố đen. Trút đi.
      </Text>
      <Text style={{ color: "#ff9999", fontSize: 12, marginBottom: 16 }}>
        Mọi thứ mày gõ ở đây KHÔNG được lưu. Đốt xong là xong.
      </Text>
      <TextInput value={text} onChangeText={setText} multiline placeholder="chửi đi..."
        placeholderTextColor="#aa6666"
        style={{ minHeight: 160, color: "#fff", backgroundColor: "#330000",
                 padding: 12, borderRadius: 8, textAlignVertical: "top" }} />
      <Pressable onPress={burn} disabled={burning}
        style={{ backgroundColor: "#ff0000", padding: 14, borderRadius: 8, marginTop: 16 }}>
        <Text style={{ color: "#fff", textAlign: "center", fontWeight: "700" }}>
          {burning ? "🔥 đang đốt..." : "ĐỐT"}
        </Text>
      </Pressable>
      {reply && (
        <View style={{ marginTop: 24, padding: 12, backgroundColor: "#330000", borderRadius: 8 }}>
          <Text style={{ color: "#ffe5e5" }}>{reply}</Text>
        </View>
      )}
      <Pressable onPress={() => router.back()} style={{ marginTop: 24, alignItems: "center" }}>
        <Text style={{ color: "#aa6666" }}>← thoát</Text>
      </Pressable>
    </View>
  );
}
```

Commit: `feat(app): Shake-to-Rant + VentingVoid`

---

### Task 3.2: RageRoom

**Files:** `app/components/Weapon.tsx`, `app/components/BurnAnim.tsx`, `app/app/(tabs)/rage.tsx`

#### `app/components/Weapon.tsx`
```typescript
import { Pressable, Text } from "react-native";

const EMOJI: Record<string, string> = { hammer: "🔨", bat: "🏏", grenade: "💣", fire: "🔥" };

export function Weapon({ id, selected, onPress }: { id: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={{ padding: 16, borderRadius: 12,
        backgroundColor: selected ? "#ff2d55" : "#222", margin: 4 }}>
      <Text style={{ fontSize: 28 }}>{EMOJI[id]}</Text>
    </Pressable>
  );
}
```

#### `app/components/BurnAnim.tsx`
```typescript
import { useEffect } from "react";
import Animated, { useSharedValue, withTiming, useAnimatedStyle,
  withSequence, runOnJS } from "react-native-reanimated";
import { Text } from "react-native";

export function BurnAnim({ text, onDone }: { text: string; onDone: () => void }) {
  const opacity = useSharedValue(1);
  const scale = useSharedValue(1);
  useEffect(() => {
    scale.value = withSequence(withTiming(1.2, { duration: 120 }), withTiming(0.3, { duration: 600 }));
    opacity.value = withTiming(0, { duration: 800 }, (done) => { if (done) runOnJS(onDone)(); });
  }, []);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value, transform: [{ scale: scale.value }] }));
  return <Animated.View style={style}><Text style={{ color: "#fff", fontSize: 20 }}>{text}</Text></Animated.View>;
}
```

#### `app/app/(tabs)/rage.tsx`
```typescript
import { useState } from "react";
import { View, Text, TextInput, Pressable } from "react-native";
import * as Haptics from "expo-haptics";
import { Weapon } from "@/components/Weapon";
import { BurnAnim } from "@/components/BurnAnim";
import { postJSON } from "@/lib/api";
import { useTheme } from "@/lib/theme";

const WEAPONS = ["hammer", "bat", "grenade", "fire"];

export default function Rage() {
  const { palette } = useTheme();
  const [text, setText] = useState("");
  const [weapon, setWeapon] = useState("hammer");
  const [burning, setBurning] = useState<string | null>(null);
  const [quip, setQuip] = useState<string | null>(null);

  async function smash() {
    if (!text.trim()) return;
    const target = text;
    setText("");
    const r = await postJSON("/rage", { target_text: target, weapon });
    if (r.haptic_pattern === "heavy") await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    else await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    setBurning(target);
    setQuip(r.quip);
  }

  return (
    <View style={{ flex: 1, backgroundColor: palette.bg, padding: 16 }}>
      <Text style={{ color: palette.fg, fontSize: 16, marginBottom: 8 }}>
        Gõ thứ cần đập. Chọn vũ khí. Đập.
      </Text>
      <TextInput value={text} onChangeText={setText} placeholder="ký ức tệ, tên gì đó..."
        placeholderTextColor="#888"
        style={{ color: palette.fg, backgroundColor: "#222", padding: 10, borderRadius: 8 }} />
      <View style={{ flexDirection: "row", marginVertical: 12 }}>
        {WEAPONS.map(w => <Weapon key={w} id={w} selected={w === weapon} onPress={() => setWeapon(w)} />)}
      </View>
      <Pressable onPress={smash} style={{ backgroundColor: palette.accent, padding: 14, borderRadius: 8 }}>
        <Text style={{ color: palette.fg, textAlign: "center", fontWeight: "700" }}>ĐẬP</Text>
      </Pressable>
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        {burning && <BurnAnim text={burning} onDone={() => setBurning(null)} />}
        {quip && !burning && <Text style={{ color: palette.accent, fontSize: 16, marginTop: 16 }}>{quip}</Text>}
      </View>
    </View>
  );
}
```

Commit: `feat(app): RageRoom`

---

### Task 3.3: Push Notifications

#### Backend — `backend/routes/push.py`

**Logic heuristic `should_send_push`** (pure function, đã có test):
```python
def should_send_push(now: datetime, last_push: datetime|None, sent_today: int) -> bool:
    if sent_today >= 5: return False
    if last_push and (now - last_push) < timedelta(hours=4): return False
    h = now.hour
    if not (h >= 23 or h < 3 or (10 <= h < 12)): return False
    return True
```

Khung giờ push: **23h–3h sáng** HOẶC **10h–12h trưa** (ICT = UTC+7).

**`POST /push/tick`** (cron-job.org gọi mỗi giờ):
- Auth: header `x-cron-key` (dùng cùng APP_SHARED_KEY)
- Query last_push, count hôm nay, last_mood, top-3 memories
- Nếu heuristic pass → gọi Haiku với `prompts/push.txt`
- Nếu Haiku trả push != null → gửi qua Expo Push API
- Log vào `push_log`

**`POST /push/register`** (app gọi 1 lần khi start):
- Nhận `{"token": "ExponentPushToken[...]"}`
- Lưu token — v1 lưu vào file `/tmp/expo_push_token` (Railway ephemeral OK vì token re-register mỗi lần app mở)

#### App — `app/lib/notifications.ts`
```typescript
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { postJSON } from "./api";

export async function registerForPush() {
  if (!Device.isDevice) return;
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== "granted") return;
  const token = (await Notifications.getExpoPushTokenAsync()).data;
  try { await postJSON("/push/register", { token }); } catch {}
}
```

Call `registerForPush()` trong `_layout.tsx` `useEffect`.

#### Backend test (`tests/test_push_heuristic.py`):
```python
from routes.push import should_send_push
from datetime import datetime, timedelta

def test_block_outside_hours():
    assert should_send_push(datetime(2026,5,21,15,0), None, 0) is False

def test_allow_late_night():
    assert should_send_push(datetime(2026,5,21,1,30), None, 0) is True

def test_block_recent_push():
    now = datetime(2026,5,21,1,30)
    assert should_send_push(now, now - timedelta(hours=2), 1) is False

def test_block_cap_reached():
    assert should_send_push(datetime(2026,5,21,11,30), None, 5) is False
```

**cron-job.org setup:**
- URL: `https://<railway-url>/push/tick`
- Method: POST
- Header: `x-cron-key: <APP_SHARED_KEY>`
- Schedule: every hour

Commit: `feat: push notifications cron + heuristic`

---

### Task 3.4: Branding + Intro + EAS Build

#### `app/app.json` (update):
```json
{
  "expo": {
    "name": "Mèo & Tao",
    "slug": "love-bot",
    "scheme": "lovebot",
    "version": "1.0.0",
    "platforms": ["android"],
    "android": {
      "package": "com.dev.lovebot",
      "permissions": ["VIBRATE", "RECEIVE_BOOT_COMPLETED"]
    },
    "plugins": ["expo-router","expo-haptics","expo-sensors","expo-notifications","expo-secure-store"],
    "icon": "./assets/icon.png",
    "splash": { "image": "./assets/splash.png", "backgroundColor": "#0a0a0a" }
  }
}
```

#### Intro message (trong `chat.tsx`):
```typescript
import * as SecureStore from "expo-secure-store";

const FIRST_RUN_KEY = "FIRST_RUN_DONE";
useEffect(() => {
  (async () => {
    const done = await SecureStore.getItemAsync(FIRST_RUN_KEY);
    if (!done) {
      setMsgs([{ role: "assistant", content: "Ờ. Thằng dev nó làm cái này cho mày. Đừng cảm động vội — tao là loại khó tính. Bắt đầu kể đi." }]);
      await SecureStore.setItemAsync(FIRST_RUN_KEY, "1");
    }
  })();
}, []);
```

#### EAS Build:
```bash
cd app
npx eas-cli login
npx eas-cli build:configure
# eas.json: preview profile → android buildType: apk
npx eas-cli build --profile preview --platform android
```

Commit: `feat: branding + EAS build config`  
Tag: `git tag v1.0.0-mvp`

---

## Smoke Test Checklist (sau khi có APK)

- [ ] Mở app → câu chào intro đúng
- [ ] Chat "tao buồn vl" → reply Tsundere, không generic
- [ ] Vào Memory → thấy seed pinned (nếu có) + memories tự extract
- [ ] Lắc máy → vào Vent → đốt → reply
- [ ] Vào Rage → đập → rung heavy + animation
- [ ] Đổi theme trong Settings → màu đổi ngay
- [ ] Đợi đúng khung giờ → nhận push notification

---

## Lưu ý quan trọng cho session mới

1. **Expo scaffold chưa làm** — làm `npx create-expo-app` trước khi bất kỳ task 2.x nào
2. **Backend URL** — lấy từ Railway dashboard sau khi deploy xong, điền vào VibeSettings
3. **APP_SHARED_KEY** — lấy từ `backend/.env`, cần điền cả trong Railway vars và trong app VibeSettings
4. **`react-native-sse`** — package SSE cho React Native, khác với browser EventSource
5. **`expo-device`** cần install thêm cho push notifications: `npx expo install expo-device`
6. **Android only** — không cần lo iOS permissions/provisioning
7. **Tên AI trong app** không có, chỉ có context "thằng dev" là người tạo app
