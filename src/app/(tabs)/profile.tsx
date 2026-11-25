import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Alert, Pressable, Text, View } from "react-native";
import { Avatar, Section } from "@/components/nutrition";
import { Button, Card, Notice, Screen, styles, type IconName } from "@/components/ui";
import { API_URL } from "@/lib/api";
import { useApp } from "@/lib/AppContext";
import { colors, minTouch, radius, space } from "@/lib/theme";

const ACTIVITY_LABEL = { sedentary: "Sedentary", light: "Light", moderate: "Moderate", active: "Active", very_active: "Very active" };
const GOAL_LABEL = { lose: "Lose weight", maintain: "Maintain weight", gain: "Gain weight" };

function comingSoon(feature: string) {
  Alert.alert(feature, `${feature} isn't connected yet. Your other settings are saved and working.`);
}

export default function Profile() {
  const { user, profile, targets, signOut } = useApp();
  return (
    <Screen>
      <Section>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 14, marginTop: space(2), marginBottom: space(4) }}>
          <Avatar name={user?.name} size={64} />
          <View style={{ flex: 1 }}>
            <Text accessibilityRole="header" style={{ fontSize: 22, fontWeight: "800", color: colors.text }}>{user?.name}</Text>
            <Text style={styles.muted} numberOfLines={1}>{user?.email}</Text>
          </View>
        </View>
      </Section>

      {targets && (
        <Section delay={60}>
          <LinearGradient colors={[colors.heroTop, colors.heroBottom]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: radius.lg, padding: space(5), marginBottom: space(3) }}>
            <Text style={{ color: colors.onHeroMuted, fontSize: 13, fontWeight: "700" }}>DAILY CALORIE TARGET</Text>
            <View style={{ flexDirection: "row", alignItems: "flex-end", marginTop: 6 }}>
              <Text style={{ fontSize: 42, fontWeight: "900", color: colors.lime }}>{targets.calories}</Text>
              <Text style={{ fontSize: 16, color: colors.onHeroMuted, marginBottom: 8, marginLeft: 6 }}>kcal</Text>
            </View>
            <Text style={{ color: colors.onPrimary, marginTop: space(2), fontWeight: "600" }}>
              Protein {targets.protein_g} g · Carbs {targets.carbs_g} g · Fat {targets.fat_g} g
            </Text>
            <Text style={{ color: colors.onHeroMuted, marginTop: 6, fontSize: 13 }}>
              Maintenance {targets.tdee} kcal · BMR {targets.bmr} · BMI {targets.bmi}
            </Text>
          </LinearGradient>
        </Section>
      )}
      {targets?.warnings.map((w) => <Notice key={w}>{w}</Notice>)}

      {profile && (
        <Section delay={120}>
          <Card>
            <Text style={[styles.h2, { marginBottom: 8 }]}>Fitness goals</Text>
            <Row label="Goal" value={`${GOAL_LABEL[profile.goal]}${profile.goal !== "maintain" ? ` · ${profile.weekly_rate_kg} kg a week` : ""}`} />
            <Row label="Weight" value={`${profile.weight_kg} kg → ${profile.goal_weight_kg} kg`} />
            <Row label="Height" value={`${profile.height_cm} cm`} />
            <Row label="Activity" value={ACTIVITY_LABEL[profile.activity]} last />
            <View style={{ marginTop: 8 }}>
              <Button title="Edit goals" icon="target" variant="secondary" onPress={() => router.push("/goals")} />
            </View>
          </Card>
        </Section>
      )}

      <Section delay={180}>
        <Card style={{ paddingVertical: 4 }}>
          <Setting icon="sliders" label="Nutrition preferences" hint="Coming soon" onPress={() => comingSoon("Nutrition preferences")} />
          <Setting icon="bell" label="Notifications" hint="Coming soon" onPress={() => comingSoon("Notifications")} />
          <Setting icon="shield" label="Privacy" hint="Coming soon" onPress={() => comingSoon("Privacy settings")} last />
        </Card>
      </Section>

      <Section delay={240}>
        <Notice>Calorie targets are estimates based on the Mifflin–St Jeor formula, not medical advice.</Notice>
        <Button title="Sign out" variant="danger" icon="log-out" onPress={signOut} />
        <Text style={[styles.muted, { textAlign: "center", marginTop: 12, fontSize: 12 }]} accessibilityLabel={`Server ${API_URL}`}>Server: {API_URL}</Text>
      </Section>
    </Screen>
  );
}

function Row({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 10, borderBottomWidth: last ? 0 : 1, borderBottomColor: colors.primarySoft, gap: 12 }}>
      <Text style={styles.muted}>{label}</Text>
      <Text style={[styles.body, { fontWeight: "600", flexShrink: 1, textAlign: "right" }]}>{value}</Text>
    </View>
  );
}

function Setting({ icon, label, hint, onPress, last }: { icon: IconName; label: string; hint: string; onPress: () => void; last?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label}. ${hint}`}
      style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, minHeight: minTouch, paddingVertical: 10, borderBottomWidth: last ? 0 : 1, borderBottomColor: colors.primarySoft, opacity: pressed ? 0.7 : 1 })}
    >
      <Feather name={icon} size={20} color={colors.primaryDark} accessible={false} importantForAccessibility="no" />
      <Text style={[styles.body, { flex: 1, fontWeight: "600" }]}>{label}</Text>
      <Text style={styles.muted}>{hint}</Text>
      <Feather name="chevron-right" size={18} color={colors.muted} accessible={false} importantForAccessibility="no" />
    </Pressable>
  );
}
