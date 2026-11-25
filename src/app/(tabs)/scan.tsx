import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { Section, Viewfinder, Chip } from "@/components/nutrition";
import { IconTile, Press, Reveal, Screen, Title, styles } from "@/components/ui";
import { mealForNow } from "@/lib/date";
import { colors, radius, space } from "@/lib/theme";
import { Text, View } from "react-native";

export default function ScanHub() {
  const meal = mealForNow();
  return (
    <Screen>
      <Section>
        <Title sub="Photograph a meal or a nutrition label. Your log updates when you save.">Scan</Title>
      </Section>

      <Section delay={80}>
        <Viewfinder scanning aspectRatio={1}>
          <View style={{ alignItems: "center", paddingHorizontal: space(6) }}>
            <Feather name="camera" size={34} color={colors.lime} accessible={false} importantForAccessibility="no" />
            <Text style={{ color: colors.onPrimary, fontWeight: "700", fontSize: 16, marginTop: 10, textAlign: "center" }}>Centre your plate or label in the frame</Text>
            <Text style={{ color: colors.onHeroMuted, fontSize: 14, marginTop: 6, textAlign: "center", lineHeight: 20 }}>Good light and a top-down view give the best estimates.</Text>
          </View>
        </Viewfinder>
      </Section>

      <Section delay={160}>
        <Press onPress={() => router.navigate({ pathname: "/scan/meal", params: { meal } })} accessibilityLabel="AI meal scanner. Photo and weight to calories" style={{ marginBottom: space(3) }}>
          <View style={{ backgroundColor: colors.primary, borderRadius: radius.md, padding: space(4), flexDirection: "row", alignItems: "center", gap: 14 }}>
            <IconTile name="camera" tone="soft" size={52} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 18, fontWeight: "800", color: colors.onPrimary }}>AI meal scanner</Text>
              <Text style={{ fontSize: 14, color: colors.onHeroMuted, marginTop: 2, lineHeight: 20 }}>Photo plus weight, and AI estimates calories and macros.</Text>
            </View>
            <Feather name="chevron-right" size={22} color={colors.onPrimary} accessible={false} importantForAccessibility="no" />
          </View>
        </Press>
      </Section>

      <Section delay={220}>
        <Press onPress={() => router.navigate({ pathname: "/scan/label", params: { meal } })} accessibilityLabel="Nutrition label scanner. Read a Nutrition Facts panel" style={{ marginBottom: space(3) }}>
          <View style={styles.card}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
              <IconTile name="tag" size={52} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.h2, { marginBottom: 2 }]}>Nutrition label</Text>
                <Text style={styles.muted}>Read a Nutrition Facts panel, then review before saving.</Text>
              </View>
              <Feather name="chevron-right" size={22} color={colors.muted} accessible={false} importantForAccessibility="no" />
            </View>
          </View>
        </Press>
      </Section>

      <Section delay={280}>
        <Chip label="AI results are estimates, not medical advice" tone="accent" />
      </Section>
    </Screen>
  );
}
