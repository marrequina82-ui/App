import { Feather } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { useEffect, useRef } from "react";
import { Animated, Text, View, type ColorValue } from "react-native";
import { colors, useNativeDriver } from "@/lib/theme";
import { useReduceMotion, type IconName } from "@/components/ui";

/** Tab icon that springs up when its tab becomes active. */
function TabIcon({ name, color, focused }: { name: IconName; color: string; focused: boolean }) {
  const reduce = useReduceMotion();
  const s = useRef(new Animated.Value(focused ? 1 : 0)).current;
  useEffect(() => {
    if (reduce) {
      s.setValue(focused ? 1 : 0);
      return;
    }
    Animated.spring(s, { toValue: focused ? 1 : 0, friction: 5, tension: 160, useNativeDriver }).start();
  }, [focused, reduce, s]);
  return (
    <Animated.View style={{ transform: [{ scale: s.interpolate({ inputRange: [0, 1], outputRange: [1, 1.15] }) }, { translateY: s.interpolate({ inputRange: [0, 1], outputRange: [0, -2] }) }] }}>
      <Feather name={name} size={23} color={color} />
    </Animated.View>
  );
}

const tabIcon = (name: IconName) => ({ color, focused }: { color: ColorValue; focused: boolean }) => <TabIcon name={name} color={String(color)} focused={focused} />;

/** Scan is the primary action: a mini shutter, like the camera's capture button. */
function ScanIcon({ focused }: { focused: boolean }) {
  return (
    <View style={{ width: 58, height: 58, borderRadius: 29, borderWidth: 3, borderColor: focused ? colors.primary : colors.text, alignItems: "center", justifyContent: "center", marginTop: -22, backgroundColor: colors.bg }}>
      <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: colors.lime, alignItems: "center", justifyContent: "center" }}>
        <Feather name="camera" size={22} color={colors.onLime} />
      </View>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        animation: "shift",
        sceneStyle: { backgroundColor: colors.bg },
        tabBarActiveTintColor: colors.primaryDark,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontSize: 12, fontWeight: "700" },
        tabBarStyle: { backgroundColor: colors.bg, borderTopColor: colors.border, height: 68, paddingTop: 6 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Home", tabBarIcon: tabIcon("home") }} />
      <Tabs.Screen name="progress" options={{ title: "Progress", tabBarIcon: tabIcon("bar-chart-2") }} />
      <Tabs.Screen
        name="scan"
        options={{
          title: "Scan",
          tabBarLabel: ({ focused }) => <Text style={{ fontSize: 12, fontWeight: "700", color: focused ? colors.primaryDark : colors.muted, marginTop: 2 }}>Scan</Text>,
          tabBarIcon: ({ focused }) => <ScanIcon focused={focused} />,
        }}
      />
      <Tabs.Screen name="diary" options={{ title: "Diary", tabBarIcon: tabIcon("book-open") }} />
      <Tabs.Screen name="profile" options={{ title: "Profile", tabBarIcon: tabIcon("user") }} />
    </Tabs>
  );
}
