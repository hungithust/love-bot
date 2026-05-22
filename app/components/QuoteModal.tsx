import { Modal, Pressable, StyleSheet, Text, View, ActivityIndicator } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

interface QuoteModalProps {
  visible: boolean;
  quote: string;
  onDismiss: () => void;
}

export function QuoteModal({ visible, quote, onDismiss }: QuoteModalProps) {
  return (
    <Modal visible={visible} animationType="fade" statusBarTranslucent transparent={false}>
      <Pressable style={styles.pressable} onPress={onDismiss}>
        <LinearGradient
          colors={["#1a1040", "#0d0d1f"]}
          start={{ x: 0.3, y: 0 }}
          end={{ x: 0.7, y: 1 }}
          style={styles.gradient}
        >
          <View style={styles.content}>
            <Text style={styles.moon}>🌙</Text>
            {quote ? (
              <Text style={styles.quote}>{quote}</Text>
            ) : (
              <ActivityIndicator color="#a89fcf" style={{ marginVertical: 16 }} />
            )}
            <Text style={styles.hint}>chạm để tiếp tục</Text>
          </View>
        </LinearGradient>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  pressable:  { flex: 1 },
  gradient:   { flex: 1, alignItems: "center", justifyContent: "center" },
  content:    { paddingHorizontal: 36, alignItems: "center", gap: 20 },
  moon:       { fontSize: 48 },
  quote:      { color: "#ddd8f0", fontSize: 20, fontStyle: "italic", textAlign: "center", lineHeight: 32 },
  hint:       { color: "#7c6fa0", fontSize: 12, marginTop: 8 },
});
