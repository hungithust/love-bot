import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useShakeNavigation } from '@/lib/shake';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

function icon(focused: boolean, active: IoniconsName, inactive: IoniconsName) {
  return ({ color, size }: { color: string; size: number }) => (
    <Ionicons name={focused ? active : inactive} size={size} color={color} />
  );
}

export default function TabLayout() {
  useShakeNavigation();

  return (
    <Tabs screenOptions={{
      tabBarStyle: { backgroundColor: "#0a0a0a", borderTopColor: "#222", borderTopWidth: 1 },
      tabBarActiveTintColor: "#ff2d55",
      tabBarInactiveTintColor: "#555",
      headerShown: false,
    }}>
      <Tabs.Screen name="index" options={{
        title: "Chat",
        tabBarIcon: ({ color, size, focused }) => icon(focused, "chatbubble", "chatbubble-outline")({ color, size }),
      }} />
      <Tabs.Screen name="memory" options={{
        title: "Ký ức",
        tabBarIcon: ({ color, size, focused }) => icon(focused, "bookmark", "bookmark-outline")({ color, size }),
      }} />
      <Tabs.Screen name="rage" options={{
        title: "Đập",
        tabBarIcon: ({ color, size, focused }) => icon(focused, "flame", "flame-outline")({ color, size }),
      }} />
      <Tabs.Screen name="settings" options={{
        title: "Cài đặt",
        tabBarIcon: ({ color, size, focused }) => icon(focused, "settings", "settings-outline")({ color, size }),
      }} />
    </Tabs>
  );
}
