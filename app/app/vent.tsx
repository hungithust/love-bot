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
