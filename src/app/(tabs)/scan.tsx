import { useEffect } from "react";
import { router } from "expo-router";
import { mealForNow } from "@/lib/date";
import { View } from "react-native";

export default function ScanHub() {
  const meal = mealForNow();

  useEffect(() => {
    // Auto-navigate to meal scanner when this tab is opened
    router.replace({ pathname: "/scan/meal", params: { meal } });
  }, []);

  // Show empty view while navigating
  return <View style={{ flex: 1 }} />;
}
