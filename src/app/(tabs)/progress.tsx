import { useCallback, useState } from "react";
import { Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { showDialog } from "@/components/dialog";
import { Chip, Section, Skeleton, SkeletonCard } from "@/components/nutrition";
import { Button, Card, EmptyState, ErrorText, Field, IconTile, ProgressBar, Screen, Title, styles } from "@/components/ui";
import { api } from "@/lib/api";
import { useApp } from "@/lib/AppContext";
import { addDays, toISODate } from "@/lib/date";
import { colors } from "@/lib/theme";

type Day = { date: string; kcal: number; protein_g: number; carbs_g: number; fat_g: number };

export default function Progress() {
  const { targets, profile, reloadMe } = useApp();
  const [week, setWeek] = useState<Day[] | null>(null);
  const [weights, setWeights] = useState<{ date: string; weight_kg: number }[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newWeight, setNewWeight] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      const today = toISODate();
      const from = addDays(today, -6);
      const [sum, w] = await Promise.all([api.summary(from, today), api.weights()]);
      const map = new Map(sum.map((d) => [d.date, d]));
      setWeek(Array.from({ length: 7 }, (_, i) => {
        const d = addDays(from, i);
        const r = map.get(d);
        return { date: d, kcal: r?.kcal ?? 0, protein_g: r?.protein_g ?? 0, carbs_g: r?.carbs_g ?? 0, fat_g: r?.fat_g ?? 0 };
      }));
      setWeights(w);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const weightNum = Number(newWeight);
  const weightError = newWeight && (!Number.isFinite(weightNum) || weightNum < 30 || weightNum > 300) ? "Enter a weight between 30 and 300 kg." : null;

  async function logWeight() {
    if (!weightNum || weightError) return;
    setSaving(true);
    try {
      await api.logWeight(toISODate(), weightNum);
      setNewWeight("");
      await Promise.all([load(), reloadMe()]);
    } catch (e) {
      showDialog({ icon: "alert-circle", title: "Couldn't save", message: (e as Error).message, primary: { label: "Try again", onPress: logWeight }, secondary: { label: "Cancel", onPress: () => {} } });
    } finally {
      setSaving(false);
    }
  }

  const goal = targets?.calories ?? 2000;
  const days = week ?? [];
  const maxKcal = Math.max(goal, ...days.map((d) => d.kcal)) * 1.1;
  const logged = days.filter((d) => d.kcal > 0);
  const avg = (k: keyof Omit<Day, "date" | "kcal">) => (logged.length ? Math.round(logged.reduce((s, d) => s + d[k], 0) / logged.length) : 0);
  const avgKcal = logged.length ? Math.round(logged.reduce((s, d) => s + d.kcal, 0) / logged.length) : 0;
  const weeklyDeficit = logged.reduce((s, d) => s + ((targets?.tdee ?? goal) - d.kcal), 0);
  const toGo = profile ? Math.round((profile.weight_kg - profile.goal_weight_kg) * 10) / 10 : 0;

  return (
    <Screen>
      <Section>
        <Title sub="Your last seven days, from your diary.">Progress</Title>
      </Section>

      <ErrorText>{error}</ErrorText>

      <Section delay={60}>
        {week === null ? <SkeletonCard lines={4} /> : logged.length === 0 ? (
          <Card>
            <EmptyState icon="bar-chart-2" title="No logged days yet" body="Log a meal and your weekly chart will appear here." />
          </Card>
        ) : (
          <Card>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <Text style={styles.h2}>Calories this week</Text>
              <Chip label={`Goal ${goal}`} />
            </View>
            <View style={{ flexDirection: "row", alignItems: "flex-end", height: 150, gap: 8, marginTop: 12 }}>
              {days.map((d) => {
                const h = maxKcal > 0 ? (d.kcal / maxKcal) * 130 : 0;
                const over = d.kcal > goal;
                const [y, m, dd] = d.date.split("-").map(Number);
                const dt = new Date(y, m - 1, dd);
                const status = d.kcal === 0 ? "not logged" : over ? "over goal" : "within goal";
                return (
                  <View
                    key={d.date}
                    style={{ flex: 1, alignItems: "center" }}
                    accessible
                    accessibilityLabel={`${dt.toLocaleDateString(undefined, { weekday: "long" })}: ${Math.round(d.kcal)} kcal, ${status}`}
                  >
                    <View style={{ width: "100%", height: Math.max(4, h), backgroundColor: d.kcal === 0 ? colors.primarySoft : over ? colors.accent : colors.primaryBright, borderRadius: 8 }} />
                    <Text style={[styles.muted, { fontSize: 12, marginTop: 6 }]}>{dt.toLocaleDateString(undefined, { weekday: "narrow" })}</Text>
                  </View>
                );
              })}
            </View>
            <View style={{ flexDirection: "row", gap: 16, marginTop: 14 }}>
              <View><Text style={styles.muted}>Avg on logged days</Text><Text style={{ fontSize: 20, fontWeight: "800", color: colors.text }}>{avgKcal} kcal</Text></View>
              <View><Text style={styles.muted}>Logged days</Text><Text style={{ fontSize: 20, fontWeight: "800", color: colors.text }}>{logged.length} / 7</Text></View>
            </View>
            <Text style={[styles.body, { marginTop: 12 }]}>
              {weeklyDeficit >= 0
                ? `Estimated deficit this week: ${Math.round(weeklyDeficit)} kcal (about ${(weeklyDeficit / 7700).toFixed(2)} kg).`
                : `Estimated surplus this week: ${Math.round(-weeklyDeficit)} kcal.`}
            </Text>
          </Card>
        )}
      </Section>

      <Section delay={120}>
        {week === null ? <SkeletonCard lines={3} /> : logged.length > 0 && targets ? (
          <Card>
            <Text style={[styles.h2, { marginBottom: 12 }]}>Average macros per logged day</Text>
            <MacroAvg label="Protein" value={avg("protein_g")} target={targets.protein_g} color={colors.proteinFill} textColor={colors.protein} />
            <MacroAvg label="Carbs" value={avg("carbs_g")} target={targets.carbs_g} color={colors.carbsFill} textColor={colors.carbs} />
            <MacroAvg label="Fat" value={avg("fat_g")} target={targets.fat_g} color={colors.fatFill} textColor={colors.fat} />
          </Card>
        ) : null}
      </Section>

      <Section delay={180}>
        <Card>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 8 }}>
            <IconTile name="activity" size={44} />
            <View style={{ flex: 1 }}>
              <Text style={styles.h2}>Fitness activity</Text>
              <Text style={styles.muted}>Exercise tracking isn't connected yet.</Text>
            </View>
          </View>
          <Text style={styles.muted}>When it is, workouts will show here with the calories they burn.</Text>
        </Card>
      </Section>

      <Section delay={240}>
        <Card>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 }}>
            <IconTile name="trending-up" size={44} />
            <Text style={[styles.h2, { flex: 1, marginBottom: 0 }]}>Weight</Text>
          </View>
          {profile ? (
            <Text style={styles.body}>
              Now {profile.weight_kg} kg · Goal {profile.goal_weight_kg} kg{toGo > 0 ? ` · ${toGo} kg to go` : ""}
            </Text>
          ) : null}
          {weights === null ? <Skeleton width="100%" height={40} style={{ marginTop: 10 }} /> : null}
          <View style={{ height: 12 }} />
          <Field label="Today's weight (kg)" value={newWeight} onChangeText={setNewWeight} keyboardType="decimal-pad" placeholder={profile ? String(profile.weight_kg) : "60"} error={weightError} />
          <Button title="Save weight" variant="secondary" icon="check" onPress={logWeight} loading={saving} disabled={!weightNum || !!weightError} />
          {(weights ?? []).slice(0, 7).map((w) => (
            <View key={w.date} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.primarySoft }}>
              <Text style={styles.muted}>{w.date}</Text>
              <Text style={styles.body}>{w.weight_kg} kg</Text>
            </View>
          ))}
        </Card>
      </Section>
    </Screen>
  );
}

function MacroAvg({ label, value, target, color, textColor }: { label: string; value: number; target: number; color: string; textColor: string }) {
  return (
    <View style={{ marginBottom: 12 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
        <Text style={[styles.body, { fontWeight: "600" }]}>{label}</Text>
        <Text style={{ color: textColor, fontWeight: "700" }}>{value} / {target} g</Text>
      </View>
      <ProgressBar value={value} max={target} color={color} label={`Average ${label.toLowerCase()}`} />
    </View>
  );
}
