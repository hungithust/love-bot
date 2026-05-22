import { useState, useRef, useEffect } from "react";
import { View, TextInput, Pressable, Text, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as SecureStore from "expo-secure-store";
import { chatStream } from "@/lib/api";
import { ChatBubble } from "@/components/ChatBubble";
import { useTheme } from "@/lib/theme";
import { executeTools } from "@/lib/toolExecutor";

type Msg = { role: "user"|"assistant"; content: string };

const FIRST_RUN_KEY = "FIRST_RUN_DONE";

export default function Chat() {
  const { palette } = useTheme();
  const insets = useSafeAreaInsets();
  const [msgs, setMsgs] = useState<Msg[]>([
    { role: "assistant", content: "Lâu không thấy. Lại có chuyện gì rồi à?" }
  ]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const scroll = useRef<ScrollView>(null);

  useEffect(() => {
    (async () => {
      const done = await SecureStore.getItemAsync(FIRST_RUN_KEY);
      if (!done) {
        setMsgs([{ role: "assistant", content: "Ờ. Thằng dev nó làm cái này cho mày. Đừng cảm động vội — tao là loại khó tính. Bắt đầu kể đi." }]);
        await SecureStore.setItemAsync(FIRST_RUN_KEY, "1");
      }
    })();
  }, []);

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
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1, backgroundColor: palette.bg }}>
      <View style={{ paddingTop: insets.top, backgroundColor: palette.bg,
                     paddingHorizontal: 16, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: "#222" }}>
        <Text style={{ color: palette.fg, fontSize: 16, fontWeight: "600" }}>Kem</Text>
        <Text style={{ color: "#555", fontSize: 12 }}>đang online</Text>
      </View>
      <ScrollView ref={scroll}
        onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })}
        contentContainerStyle={{ padding: 12, paddingBottom: 8 }}>
        {msgs.map((m, i) => <ChatBubble key={i} role={m.role} content={m.content} />)}
      </ScrollView>
      <View style={{ flexDirection: "row", padding: 10, paddingBottom: insets.bottom || 10,
                     gap: 8, backgroundColor: palette.bg, borderTopWidth: 1, borderTopColor: "#222" }}>
        <TextInput value={input} onChangeText={setInput} placeholder="nói đi..."
          placeholderTextColor="#555"
          multiline
          style={{ flex: 1, color: palette.fg, backgroundColor: "#1a1a1a", padding: 10,
                   borderRadius: 20, maxHeight: 100, borderWidth: 1, borderColor: "#333" }}
          onSubmitEditing={send} />
        <Pressable onPress={send} disabled={streaming}
          style={{ backgroundColor: streaming ? "#333" : palette.accent,
                   width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center",
                   alignSelf: "flex-end" }}>
          <Text style={{ color: palette.fg, fontSize: 18 }}>↑</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
