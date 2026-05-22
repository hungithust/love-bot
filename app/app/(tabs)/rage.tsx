import { useState, useCallback } from "react";
import { View, Text, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { Weapon } from "@/components/Weapon";
import { BossArena, BOSSES, Boss } from "@/components/BossArena";
import { postJSON } from "@/lib/api";
import { useUserStatus, PRESETS } from "@/lib/userStatus";
import { useTheme } from "@/lib/theme";

function bossFromStatus(statusLabel: string | undefined): Boss | null {
  if (!statusLabel) return null;
  const preset = PRESETS.find(p => p.label === statusLabel);
  if (!preset?.bossId) return null;
  return BOSSES.find(b => b.id === preset.bossId) ?? null;
}

const WEAPONS = ["hammer", "bat", "grenade", "fire"];

export default function Rage() {
  const { palette } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { status } = useUserStatus();

  const autoBoss = bossFromStatus(status?.label);
  const [boss, setBoss] = useState<Boss | null>(autoBoss);
  const [weapon, setWeapon] = useState("hammer");
  const [quip, setQuip] = useState<string | null>(null);
  const [dead, setDead] = useState(false);
  const [arenaKey, setArenaKey] = useState(0);

  useFocusEffect(useCallback(() => {
    const b = bossFromStatus(status?.label);
    if (b && !dead) {
      setBoss(b);
      setArenaKey(k => k + 1);
      setDead(false);
      setQuip(null);
    }
  }, [status?.label]));

  async function handleDeath(_: string) {
    setDead(true);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      const r = await postJSON("/rage", { boss_id: boss?.id ?? "anger", weapon });
      setQuip(r.quip);
    } catch {
      setQuip("Xong rồi. Khỏe chưa?");
    }
  }

  async function handleHit(_: number) {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }

  function resetBoss() {
    setDead(false);
    setQuip(null);
    setArenaKey(k => k + 1);
  }

  if (!boss) {
    return (
      <View style={{ flex: 1, backgroundColor: palette.bg, padding: 16, paddingTop: insets.top + 16 }}>
        <Text style={{ color: palette.fg, fontSize: 16, fontWeight: "700", marginBottom: 16 }}>Chọn kẻ thù</Text>
        {BOSSES.map(b => (
          <Pressable
            key={b.id}
            onPress={() => { setBoss(b); setArenaKey(k => k + 1); }}
            style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14,
              backgroundColor: palette.surface, borderRadius: 10, marginBottom: 10,
              borderWidth: 1, borderColor: palette.border }}
          >
            <Text style={{ fontSize: 28 }}>{b.emoji}</Text>
            <Text style={{ color: palette.fg, fontSize: 14, fontWeight: "600" }}>{b.name}</Text>
          </Pressable>
        ))}
      </View>
    );
  }

  if (dead) {
    return (
      <View style={{ flex: 1, backgroundColor: palette.bg, alignItems: "center", justifyContent: "center", padding: 24 }}>
        <Text style={{ fontSize: 64, marginBottom: 12 }}>💀</Text>
        <Text style={{ color: "#ff4444", fontSize: 20, fontWeight: "900", marginBottom: 4 }}>ĐÃ TIÊU DIỆT!</Text>
        <Text style={{ color: "#888", fontSize: 13, marginBottom: 24 }}>{boss.name} đã bị dập tắt</Text>
        {quip && (
          <View style={{ backgroundColor: palette.surface, borderRadius: 12, padding: 14, marginBottom: 24, maxWidth: 280 }}>
            <Text style={{ color: palette.accent, fontSize: 10, marginBottom: 4 }}>Bạn của Kem nói:</Text>
            <Text style={{ color: palette.fg, fontSize: 13, fontStyle: "italic" }}>"{quip}"</Text>
          </View>
        )}
        <View style={{ flexDirection: "row", gap: 12 }}>
          <Pressable onPress={resetBoss}
            style={{ backgroundColor: palette.surface, borderRadius: 8, padding: 12, paddingHorizontal: 20 }}>
            <Text style={{ color: palette.fg }}>Đánh lại</Text>
          </Pressable>
          <Pressable onPress={() => router.push("/")}
            style={{ backgroundColor: palette.accent, borderRadius: 8, padding: 12, paddingHorizontal: 20 }}>
            <Text style={{ color: "#fff", fontWeight: "700" }}>Nói chuyện →</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: palette.bg, padding: 16, paddingTop: insets.top + 16 }}>
      <View style={{ flexDirection: "row", marginBottom: 12 }}>
        {WEAPONS.map(w => (
          <Weapon key={w} id={w} selected={w === weapon} onPress={() => setWeapon(w)} />
        ))}
      </View>

      <BossArena
        key={arenaKey}
        boss={boss}
        weapon={weapon}
        onDeath={handleDeath}
        onHit={handleHit}
      />
    </View>
  );
}
