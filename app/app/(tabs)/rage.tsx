import { useState } from "react";
import { View, Text, TextInput, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { Weapon } from "@/components/Weapon";
import { BurnAnim } from "@/components/BurnAnim";
import { postJSON } from "@/lib/api";
import { useTheme } from "@/lib/theme";

const WEAPONS = ["hammer", "bat", "grenade", "fire"];

export default function Rage() {
  const { palette } = useTheme();
  const insets = useSafeAreaInsets();
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
    <View style={{ flex: 1, backgroundColor: palette.bg, padding: 16, paddingTop: insets.top + 16 }}>
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
