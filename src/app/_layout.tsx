import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { AnimatedSplash } from "@/components/AnimatedSplash";
import { AppProvider, useApp } from "@/lib/AppContext";
import { colors } from "@/lib/theme";

function RootNavigator() {
  const { ready, user, profile } = useApp();
  const [splashDone, setSplashDone] = useState(false);

  // Hold the animated splash until the session is restored and the intro has played.
  if (!ready || !splashDone) {
    return <AnimatedSplash ready={ready} onDone={() => setSplashDone(true)} />;
  }

  const signedIn = !!user;
  const onboarded = !!profile;
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.primaryDark,
        headerTitleStyle: { fontWeight: "700", color: colors.text },
        contentStyle: { backgroundColor: colors.bg },
        headerShadowVisible: false,
      }}
    >
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="(auth)" options={{ headerShown: false, animation: "fade" }} />
      </Stack.Protected>
      <Stack.Protected guard={signedIn && !onboarded}>
        <Stack.Screen name="onboarding" options={{ headerShown: false, animation: "fade" }} />
      </Stack.Protected>
      <Stack.Protected guard={signedIn && onboarded}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false, animation: "fade" }} />
        <Stack.Screen name="add" options={{ title: "Log food" }} />
        <Stack.Screen name="food/search" options={{ title: "Search food" }} />
        <Stack.Screen name="scan/meal" options={{ title: "Snap a meal", animation: "slide_from_bottom" }} />
        <Stack.Screen name="scan/label" options={{ title: "Scan nutrition label", animation: "slide_from_bottom" }} />
        <Stack.Screen name="meal/[id]" options={{ title: "Meal details" }} />
        <Stack.Screen name="goals" options={{ title: "Edit goals" }} />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AppProvider>
      <StatusBar style="dark" />
      <RootNavigator />
    </AppProvider>
  );
}
