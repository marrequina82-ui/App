import { Feather } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { Text, View } from "react-native";
import type { ColorValue } from "react-native";
import { colors, radius } from "@/lib/theme";
import type { IconName } from "@/components/ui";

const tabIcon = (name: IconName) => ({ color }: { color: ColorValue }) => (
  <Feather name={name} size={23} color={color as string} />
);

/** Scan is the primary action: a filled circle that stands out from the other tabs. */
function ScanIcon({ focused }: { focused: boolean }) {
  return (
    <View
      style={{
        width: 52,
        height: 52,
        borderRadius: radius.pill,
        backgroundColor: focused ? colors.primaryDark : colors.primary,
        alignItems: "center",
        justifyContent: "center",
        marginTop: -18,
        shadowColor: colors.heroTop,
        shadowOpacity: 0.25,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 3 },
        elevation: 4,
      }}
    >
      <Feather name="camera" size={24} color={colors.onPrimary} />
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primaryDark,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontSize: 12, fontWeight: "700" },
        tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border, height: 68, paddingTop: 6 },
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
