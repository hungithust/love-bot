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
