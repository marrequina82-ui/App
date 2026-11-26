import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";
import { showDialog } from "@/components/dialog";
import { Button, EmptyState, IconTile, Press, Reveal, Screen, Title, styles, type IconName } from "@/components/ui";
import { useApp } from "@/lib/AppContext";
import { computeTargets } from "@/lib/nutrition";
import { colors, radius, space } from "@/lib/theme";
import type { MacroStyle } from "@/lib/types";

const OPTIONS: { value: MacroStyle; icon: IconName; title: string; desc: string }[] = [
  { value: "balanced", icon: "pie-chart", title: "Balanced", desc: "1.6 g protein per kg, about 27% fat. A good default for most people." },
  { value: "high_protein", icon: "zap", title: "High protein", desc: "2.0 g protein per kg. Helps keep muscle while losing weight or training." },
  { value: "low_carb", icon: "droplet", title: "Low carb", desc: "More fat (40%) and fewer carbs. For people who feel better with less rice and bread." },
];

export default function NutritionPreferences() {
  const { profile, saveProfile } = useApp();
  const [style, setStyle] = useState<MacroStyle>(profile?.macro_style ?? "balanced");
  const [saving, setSaving] = useState(false);

  if (!profile) {
    return (
      <Screen>
        <EmptyState icon="user" title="Set up your profile first" body="Your macro targets are based on your goals." />
      </Screen>
    );
  }

  async function save() {
    setSaving(true);
    try {
      await saveProfile({ ...profile!, macro_style: style });
      router.back();
    } catch (e) {
      showDialog({ icon: "alert-circle", title: "Couldn't save", message: (e as Error).message, primary: { label: "OK", onPress: () => {} } });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen edges={["bottom"]}>
      <Reveal>
        <Title sub="Choose how your daily calories are split into protein, carbs and fat. Your calorie target stays the same.">Macro style</Title>
      </Reveal>
      {OPTIONS.map((o, i) => {
        const active = o.value === style;
        const t = computeTargets({ ...profile, macro_style: o.value });
        return (
          <Reveal key={o.value} delay={60 + i * 70}>
            <Press
              onPress={() => setStyle(o.value)}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`${o.title}. ${o.desc}`}
              style={{
                marginBottom: space(3), padding: space(4), borderRadius: radius.md, borderWidth: 2,
                borderColor: active ? colors.primary : colors.border, backgroundColor: colors.card,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <IconTile name={o.icon} size={42} />
                <Text style={[styles.h2, { flex: 1, marginBottom: 0 }]}>{o.title}</Text>
                <View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: active ? colors.primary : colors.borderStrong, backgroundColor: active ? colors.primary : "transparent", alignItems: "center", justifyContent: "center" }}>
                  {active ? <Feather name="check" size={14} color={colors.onPrimary} /> : null}
                </View>
              </View>
              <Text style={[styles.muted, { marginTop: 10 }]}>{o.desc}</Text>
              <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
                <Stat label="Protein" value={t.protein_g} color={colors.protein} />
                <Stat label="Carbs" value={t.carbs_g} color={colors.carbs} />
                <Stat label="Fat" value={t.fat_g} color={colors.fat} />
              </View>
            </Press>
          </Reveal>
        );
      })}
      <Button title="Save preference" icon="check" onPress={save} loading={saving} disabled={style === (profile.macro_style ?? "balanced")} />
    </Screen>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: colors.primarySoft, borderRadius: radius.sm, paddingVertical: 8, alignItems: "center" }}>
      <Text style={{ color, fontWeight: "800", fontSize: 16 }}>{value} g</Text>
      <Text style={[styles.muted, { fontSize: 12 }]}>{label}</Text>
    </View>
  );
}
