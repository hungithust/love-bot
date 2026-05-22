import { useEffect, useRef } from "react";
import { Pressable, Text, Animated } from "react-native";

const EMOJI: Record<string, string> = { hammer: "🔨", bat: "⚾", grenade: "💣", fire: "🔥" };

export function Weapon({ id, selected, onPress }: { id: string; selected: boolean; onPress: () => void }) {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (selected) {
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.2, duration: 120, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, friction: 4, useNativeDriver: true }),
      ]).start();
    }
  }, [selected]);

  return (
    <Pressable onPress={onPress} style={{ margin: 4 }}>
      <Animated.View style={{
        padding: 14, borderRadius: 12,
        backgroundColor: selected ? "#1a1a2e" : "#111",
        borderWidth: 2,
        borderColor: selected ? "#7aa2f7" : "transparent",
        transform: [{ scale }],
      }}>
        <Text style={{ fontSize: 28 }}>{EMOJI[id]}</Text>
      </Animated.View>
    </Pressable>
  );
}
