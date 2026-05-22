import { useEffect, useRef, useState } from "react";
import { View, Text, Pressable, Animated, Easing, StyleSheet } from "react-native";

export type Boss = {
  id: string;
  name: string;
  emoji: string;
  maxHp: number;
  color: string;
};

export const BOSSES: Boss[] = [
  { id: "anger",      name: "Cơn Tức Giận", emoji: "😡", maxHp: 1000, color: "#ff4444" },
  { id: "sadness",    name: "Nỗi Buồn",     emoji: "😭", maxHp: 800,  color: "#7aa2f7" },
  { id: "anxiety",    name: "Nỗi Lo",       emoji: "😰", maxHp: 900,  color: "#bb9af7" },
  { id: "numbness",   name: "Sự Vô Cảm",    emoji: "😶", maxHp: 700,  color: "#888888" },
  { id: "exhaustion", name: "Mệt Mỏi",      emoji: "🫠", maxHp: 750,  color: "#f7c948" },
];

interface Props {
  boss: Boss;
  weapon: string;
  onDeath: (quip: string) => void;
  onHit: (damage: number) => void;
}

const WEAPON_MULTIPLIER: Record<string, number> = {
  hammer: 1.0,
  bat: 1.2,
  fire: 1.5,
  grenade: 1.8,
};

function comboMultiplier(combo: number): number {
  if (combo >= 10) return 3;
  if (combo >= 6)  return 2;
  if (combo >= 3)  return 1.5;
  return 1;
}

type DamageFloat = { id: number; value: number; anim: Animated.Value; y: Animated.Value };

export function BossArena({ boss, weapon, onDeath, onHit }: Props) {
  const [hp, setHp] = useState(boss.maxHp);
  const [combo, setCombo] = useState(1);
  const [totalDamage, setTotalDamage] = useState(0);
  const [floats, setFloats] = useState<DamageFloat[]>([]);
  const comboTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastHit = useRef(0);
  const floatId = useRef(0);

  const floatAnim = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const deathScale = useRef(new Animated.Value(1)).current;
  const deathOpacity = useRef(new Animated.Value(1)).current;

  const hpPercent = hp / boss.maxHp;
  const isLow = hpPercent < 0.3;

  useEffect(() => {
    const duration = isLow ? 900 : 1800;
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: -8, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 0,  duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();
    return () => floatAnim.stopAnimation();
  }, [isLow]);

  function shake(amplitude: number) {
    shakeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue:  amplitude, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -amplitude, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue:  amplitude, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0,          duration: 40, useNativeDriver: true }),
    ]).start();
  }

  function spawnFloat(damage: number) {
    const id = ++floatId.current;
    const anim = new Animated.Value(1);
    const y = new Animated.Value(0);
    setFloats(prev => [...prev, { id, value: damage, anim, y }]);
    Animated.parallel([
      Animated.timing(anim, { toValue: 0, duration: 600, useNativeDriver: true }),
      Animated.timing(y,    { toValue: -30, duration: 600, useNativeDriver: true }),
    ]).start(() => setFloats(prev => prev.filter(f => f.id !== id)));
  }

  function handleHit() {
    if (hp <= 0) return;
    const now = Date.now();
    let newCombo = combo;

    if (now - lastHit.current <= 1000) {
      newCombo = combo + 1;
    } else {
      newCombo = 1;
    }
    lastHit.current = now;
    setCombo(newCombo);

    if (comboTimer.current) clearTimeout(comboTimer.current);
    comboTimer.current = setTimeout(() => setCombo(1), 1500);

    const damage = Math.round(100 * (WEAPON_MULTIPLIER[weapon] ?? 1) * comboMultiplier(newCombo));
    const shakeAmp = isLow ? 16 : 8;
    shake(shakeAmp);
    spawnFloat(damage);
    onHit(damage);

    setTotalDamage(prev => prev + damage);
    setHp(prev => {
      const next = Math.max(0, prev - damage);
      if (next <= 0) {
        Animated.sequence([
          Animated.timing(deathScale,   { toValue: 1.3, duration: 200, useNativeDriver: true }),
          Animated.parallel([
            Animated.timing(deathScale,   { toValue: 0,   duration: 200, useNativeDriver: true }),
            Animated.timing(deathOpacity, { toValue: 0,   duration: 200, useNativeDriver: true }),
          ]),
        ]).start(() => onDeath(""));
      }
      return next;
    });
  }

  return (
    <View style={styles.container}>
      <View style={styles.hpRow}>
        <Text style={[styles.bossName, { color: boss.color }]}>{boss.name}</Text>
        <View style={styles.hpBarBg}>
          <View style={[styles.hpBarFill, { width: `${hpPercent * 100}%` as any, backgroundColor: boss.color }]} />
        </View>
        <Text style={styles.hpText}>{hp} / {boss.maxHp} HP</Text>
      </View>

      <Pressable onPress={handleHit} style={styles.touchZone}>
        <Text style={styles.tapHint}>TAP ĐỂ ĐÁNH</Text>

        <Animated.View style={{
          transform: [
            { translateY: floatAnim },
            { translateX: shakeAnim },
            { scale: deathScale },
          ],
          opacity: deathOpacity,
        }}>
          <Text style={styles.bossEmoji}>{boss.emoji}</Text>
          {isLow && (
            <View style={[StyleSheet.absoluteFillObject, styles.lowHpOverlay]} pointerEvents="none" />
          )}
        </Animated.View>

        {floats.map(f => (
          <Animated.Text
            key={f.id}
            style={[styles.damageFloat, { opacity: f.anim, transform: [{ translateY: f.y }] }]}
          >
            -{f.value}
          </Animated.Text>
        ))}

        {isLow && (
          <Text style={styles.lowHpLabel}>đang đau... sắp xong rồi</Text>
        )}
      </Pressable>

      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>COMBO</Text>
          <Text style={styles.statValue}>x{combo}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statLabel, { color: "#bb9af7" }]}>DAMAGE</Text>
          <Text style={styles.statValue}>{totalDamage}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1 },
  hpRow:        { marginBottom: 12 },
  bossName:     { fontSize: 15, fontWeight: "700", marginBottom: 4 },
  hpBarBg:      { height: 8, backgroundColor: "#1a1a1a", borderRadius: 4, overflow: "hidden", marginBottom: 2 },
  hpBarFill:    { height: "100%", borderRadius: 4 },
  hpText:       { color: "#888", fontSize: 10 },
  touchZone:    { flex: 1, alignItems: "center", justifyContent: "center", position: "relative",
                  backgroundColor: "#0d0d1a", borderRadius: 16, borderWidth: 2, borderColor: "#1a1a2e",
                  borderStyle: "dashed", marginBottom: 12 },
  tapHint:      { position: "absolute", top: 10, color: "#555", fontSize: 10, letterSpacing: 1 },
  bossEmoji:    { fontSize: 80, textAlign: "center" },
  lowHpOverlay: { backgroundColor: "rgba(255,0,0,0.15)", borderRadius: 16 },
  lowHpLabel:   { position: "absolute", bottom: 12, color: "#ff8800", fontSize: 10 },
  damageFloat:  { position: "absolute", color: "#ff4444", fontSize: 22, fontWeight: "900" },
  statsRow:     { flexDirection: "row", justifyContent: "space-between" },
  statBox:      { backgroundColor: "#1a1a2e", borderRadius: 8, padding: 10, flex: 1, marginHorizontal: 4, alignItems: "center" },
  statLabel:    { color: "#7aa2f7", fontSize: 10 },
  statValue:    { color: "#fff", fontSize: 20, fontWeight: "900" },
});
