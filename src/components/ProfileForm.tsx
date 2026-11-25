import { useMemo, useState } from "react";
import { Text, View } from "react-native";
import { Button, Card, ErrorText, Field, Notice, Segmented, styles } from "./ui";
import { computeTargets } from "@/lib/nutrition";
import { colors } from "@/lib/theme";
import type { Activity, Goal, Profile, Sex } from "@/lib/types";

const ACTIVITY_OPTIONS: { label: string; value: Activity; desc: string }[] = [
  { label: "Sedentary", value: "sedentary", desc: "Desk job, little exercise" },
  { label: "Light", value: "light", desc: "Exercise 1–3 days/week" },
  { label: "Moderate", value: "moderate", desc: "Exercise 3–5 days/week" },
  { label: "Active", value: "active", desc: "Hard exercise 6–7 days/week" },
  { label: "Very active", value: "very_active", desc: "Physical job + training" },
];

export function ProfileForm({ initial, submitLabel, onSubmit }: { initial?: Profile | null; submitLabel: string; onSubmit: (p: Profile) => Promise<void> }) {
  const [sex, setSex] = useState<Sex>(initial?.sex ?? "female");
  const [birthYear, setBirthYear] = useState(initial ? String(initial.birth_year) : "");
  const [height, setHeight] = useState(initial ? String(initial.height_cm) : "");
  const [weight, setWeight] = useState(initial ? String(initial.weight_kg) : "");
  const [goalWeight, setGoalWeight] = useState(initial ? String(initial.goal_weight_kg) : "");
  const [activity, setActivity] = useState<Activity>(initial?.activity ?? "light");
  const [goal, setGoal] = useState<Goal>(initial?.goal ?? "lose");
  const [rate, setRate] = useState<number>(initial?.weekly_rate_kg ?? 0.5);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const profile: Profile | null = useMemo(() => {
    const by = Number(birthYear), h = Number(height), w = Number(weight), gw = Number(goalWeight || weight);
    if (!by || !h || !w || by < 1920 || h < 100 || w < 30) return null;
    return { sex, birth_year: by, height_cm: h, weight_kg: w, goal_weight_kg: gw, activity, goal, weekly_rate_kg: goal === "maintain" ? 0 : rate };
  }, [sex, birthYear, height, weight, goalWeight, activity, goal, rate]);

  const preview = profile ? computeTargets(profile) : null;

  async function submit() {
    if (!profile) return;
    setError(null);
    setSaving(true);
    try {
      await onSubmit(profile);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <View>
      <Text style={styles.label}>Sex (for calorie formula)</Text>
      <Segmented options={[{ label: "Female", value: "female" }, { label: "Male", value: "male" }]} value={sex} onChange={setSex} />

      <View style={{ flexDirection: "row", gap: 12 }}>
        <View style={{ flex: 1 }}><Field label="Birth year" value={birthYear} onChangeText={setBirthYear} keyboardType="number-pad" placeholder="2002" maxLength={4} /></View>
        <View style={{ flex: 1 }}><Field label="Height (cm)" value={height} onChangeText={setHeight} keyboardType="decimal-pad" placeholder="158" /></View>
      </View>
      <View style={{ flexDirection: "row", gap: 12 }}>
        <View style={{ flex: 1 }}><Field label="Current weight (kg)" value={weight} onChangeText={setWeight} keyboardType="decimal-pad" placeholder="62" /></View>
        <View style={{ flex: 1 }}><Field label="Goal weight (kg)" value={goalWeight} onChangeText={setGoalWeight} keyboardType="decimal-pad" placeholder="55" /></View>
      </View>

      <Text style={styles.label}>Activity level</Text>
      <Segmented options={ACTIVITY_OPTIONS.map(({ label, value }) => ({ label, value }))} value={activity} onChange={setActivity} />
      <Text style={[styles.muted, { marginTop: -6, marginBottom: 12 }]}>{ACTIVITY_OPTIONS.find((a) => a.value === activity)?.desc}</Text>

      <Text style={styles.label}>Goal</Text>
      <Segmented options={[{ label: "Lose weight", value: "lose" }, { label: "Maintain", value: "maintain" }, { label: "Gain weight", value: "gain" }]} value={goal} onChange={setGoal} />

      {goal !== "maintain" && (
        <>
          <Text style={styles.label}>Weekly pace</Text>
          <Segmented
            options={[{ label: "0.25 kg", value: 0.25 }, { label: "0.5 kg", value: 0.5 }, { label: "0.75 kg", value: 0.75 }]}
            value={rate}
            onChange={setRate}
          />
        </>
      )}

      {preview && (
        <Card style={{ backgroundColor: colors.primarySoft, borderColor: colors.primarySoft }}>
          <Text style={styles.muted}>Your daily calorie goal</Text>
          <Text style={{ fontSize: 36, fontWeight: "900", color: colors.primaryDark }}>{preview.calories} kcal</Text>
          <Text style={styles.muted}>
            Maintenance ≈ {preview.tdee} kcal · BMI {preview.bmi}
          </Text>
          <Text style={[styles.body, { marginTop: 8 }]}>
            Protein {preview.protein_g} g · Carbs {preview.carbs_g} g · Fat {preview.fat_g} g
          </Text>
        </Card>
      )}
      {preview?.warnings.map((w) => <Notice key={w}>{w}</Notice>)}

      <ErrorText>{error}</ErrorText>
      <Button title={submitLabel} onPress={submit} loading={saving} disabled={!profile} />
      <Text style={[styles.muted, { textAlign: "center", marginTop: 8 }]}>
        Estimates use the Mifflin–St Jeor formula. They're a starting point, not medical advice.
      </Text>
    </View>
  );
}
