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
