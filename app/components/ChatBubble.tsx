import { useEffect, useRef } from "react";
import { View, Text, Animated } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/lib/theme";
import { TypingIndicator } from "./TypingIndicator";

interface ChatBubbleProps {
  role: "user" | "assistant";
  content: string;
  reactionEmoji?: string;
  isLatest?: boolean;
}

export function ChatBubble({ role, content, reactionEmoji, isLatest }: ChatBubbleProps) {
  const { palette } = useTheme();
  const isUser = role === "user";
  const isTyping = !isUser && content === "" && isLatest;
  const slideAnim = useRef(new Animated.Value(isLatest ? (isUser ? 20 : -20) : 0)).current;
  const opacityAnim = useRef(new Animated.Value(isLatest ? 0 : 1)).current;

  useEffect(() => {
    if (isLatest) {
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, friction: 8, tension: 100, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, []);

  const bubbleStyle = {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderBottomLeftRadius: isUser ? 18 : 4,
    borderBottomRightRadius: isUser ? 4 : 18,
    overflow: "hidden" as const,
  };

  return (
    <View style={{ alignSelf: isUser ? "flex-end" : "flex-start", marginVertical: 3, maxWidth: "80%" }}>
      <Animated.View style={{ transform: [{ translateX: slideAnim }], opacity: opacityAnim }}>
        {isTyping ? (
          <View style={[bubbleStyle, { backgroundColor: palette.surface, paddingVertical: 12, paddingHorizontal: 16 }]}>
            <TypingIndicator />
          </View>
        ) : isUser ? (
          <LinearGradient
            colors={[palette.accent, palette.accent2]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[bubbleStyle, { paddingVertical: 10, paddingHorizontal: 14 }]}
          >
            <Text style={{ color: "#fff", fontSize: 14, lineHeight: 20 }}>{content}</Text>
          </LinearGradient>
        ) : (
          <View style={[bubbleStyle, { backgroundColor: palette.surface, paddingVertical: 10, paddingHorizontal: 14 }]}>
            <Text style={{ color: palette.fg, fontSize: 14, lineHeight: 20 }}>{content}</Text>
          </View>
        )}
      </Animated.View>
      {!isUser && !isTyping && reactionEmoji && (
        <Text style={{ fontSize: 14, marginTop: 2, marginLeft: 6 }}>{reactionEmoji}</Text>
      )}
    </View>
  );
}
