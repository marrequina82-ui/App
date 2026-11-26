import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useState } from "react";
import { initReminders } from "@/lib/reminders";
import { AnimatedSplash } from "@/components/AnimatedSplash";
import { DialogHost } from "@/components/dialog";
import { AppProvider, useApp } from "@/lib/AppContext";
import { colors } from "@/lib/theme";
import { ThemeProvider, useTheme } from "@/lib/ThemeContext";

function RootNavigator() {
  const { ready, user, profile } = useApp();
  const { theme } = useTheme();
  const [splashDone, setSplashDone] = useState(false);

  // Hold the animated splash until the session is restored and the intro has played.
  if (!ready || !splashDone) {
    return <AnimatedSplash ready={ready} onDone={() => setSplashDone(true)} />;
  }

  const signedIn = !!user;
  const onboarded = !!profile;
  return (
    <Stack
      key={theme}
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.primaryDark,
        headerTitleStyle: { fontWeight: "700", color: colors.text },
        contentStyle: { backgroundColor: colors.bg },
        headerShadowVisible: false,
        animation: "fade_from_bottom",
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
        <Stack.Screen name="scan/meal" options={{ headerShown: false, animation: "slide_from_bottom" }} />
        <Stack.Screen name="scan/label" options={{ headerShown: false, animation: "slide_from_bottom" }} />
        <Stack.Screen name="meal/[id]" options={{ title: "Meal details" }} />
        <Stack.Screen name="goals" options={{ title: "Edit goals" }} />
        <Stack.Screen name="settings/nutrition" options={{ title: "Nutrition preferences" }} />
        <Stack.Screen name="settings/notifications" options={{ title: "Notifications" }} />
        <Stack.Screen name="settings/privacy" options={{ title: "Privacy" }} />
        <Stack.Screen name="settings/avatar" options={{ title: "Profile picture", animation: "slide_from_bottom" }} />
      </Stack.Protected>
    </Stack>
  );
}

// On web the provider redirects the sign-in popup back to the app; this hands the result to the opener.
WebBrowser.maybeCompleteAuthSession();

function ThemedStatusBar() {
  const { theme } = useTheme();
  return <StatusBar style={theme === "dark" ? "light" : "dark"} />;
}

export default function RootLayout() {
  useEffect(() => { initReminders(); }, []);
  return (
    <ThemeProvider>
      <AppProvider>
        <ThemedStatusBar />
        <RootNavigator />
        <DialogHost />
      </AppProvider>
    </ThemeProvider>
  );
}
