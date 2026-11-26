import { LinearGradient } from "expo-linear-gradient";
import { useMemo, useState, type ReactNode } from "react";
import { Text, View } from "react-native";
import { Button, Card, ErrorText, Field, IconTile, Notice, Reveal, Segmented, styles, type IconName } from "./ui";
import { computeTargets } from "@/lib/nutrition";
import { colors, radius, space } from "@/lib/theme";
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
  const [rate, setRate] = useState<number>(initial?.weekly_rate_kg || 0.5);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const profile: Profile | null = useMemo(() => {
    const by = Number(birthYear), h = Number(height), w = Number(weight), gw = Number(goalWeight || weight);
    if (!by || !h || !w || by < 1920 || h < 100 || w < 30) return null;
    return {
      sex, birth_year: by, height_cm: h, weight_kg: w, goal_weight_kg: gw, activity, goal,
      weekly_rate_kg: goal === "maintain" ? 0 : rate, macro_style: initial?.macro_style ?? "balanced",
    };
  }, [sex, birthYear, height, weight, goalWeight, activity, goal, rate, initial?.macro_style]);

  const preview = profile ? computeTargets(profile) : null;
  const plan = profile ? planLine(profile) : null;

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
      <Reveal>
        <LinearGradient colors={[colors.heroTop, colors.heroBottom]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: radius.lg, padding: space(5), marginBottom: space(4) }}>
          <Text style={{ color: colors.onHeroMuted, fontSize: 13, fontWeight: "700", letterSpacing: 0.4 }}>YOUR DAILY TARGET</Text>
          {preview ? (
            <>
              <View style={{ flexDirection: "row", alignItems: "flex-end", marginTop: 6 }}>
                <Text style={{ fontSize: 42, fontWeight: "900", color: colors.lime }}>{preview.calories}</Text>
                <Text style={{ fontSize: 16, color: colors.onHeroMuted, marginBottom: 8, marginLeft: 6 }}>kcal / day</Text>
              </View>
              <View style={{ flexDirection: "row", gap: 8, marginTop: space(3) }}>
                <MacroPill label="Protein" grams={preview.protein_g} color={colors.protein} />
                <MacroPill label="Carbs" grams={preview.carbs_g} color={colors.carbs} />
                <MacroPill label="Fat" grams={preview.fat_g} color={colors.fat} />
              </View>
              <Text style={{ color: colors.onHeroMuted, fontSize: 13, marginTop: space(3) }}>Maintenance ≈ {preview.tdee} kcal · BMI {preview.bmi}</Text>
            </>
          ) : (
            <Text style={{ color: colors.onHero, fontSize: 15, marginTop: 8, lineHeight: 21 }}>Fill in your details below to see your calorie and macro targets.</Text>
          )}
        </LinearGradient>
      </Reveal>
      {preview?.warnings.map((w) => <Notice key={w}>{w}</Notice>)}

      <Section icon="user" title="About you" sub="Used by the calorie formula" delay={60}>
        <Segmented label="Sex" options={[{ label: "Female", value: "female" }, { label: "Male", value: "male" }]} value={sex} onChange={setSex} fullWidth />
        <View style={{ flexDirection: "row", gap: 12 }}>
          <View style={{ flex: 1 }}><Field label="Birth year" value={birthYear} onChangeText={setBirthYear} keyboardType="number-pad" placeholder="2002" maxLength={4} /></View>
          <View style={{ flex: 1 }}><Field label="Height (cm)" value={height} onChangeText={setHeight} keyboardType="decimal-pad" placeholder="158" /></View>
        </View>
      </Section>

      <Section icon="trending-down" title="Body weight" sub="Where you are and where you're heading" delay={120}>
        <View style={{ flexDirection: "row", gap: 12 }}>
          <View style={{ flex: 1 }}><Field label="Current (kg)" value={weight} onChangeText={setWeight} keyboardType="decimal-pad" placeholder="62" /></View>
          <View style={{ flex: 1 }}><Field label="Goal (kg)" value={goalWeight} onChangeText={setGoalWeight} keyboardType="decimal-pad" placeholder="55" /></View>
        </View>
      </Section>

      <Section icon="activity" title="Activity" sub={ACTIVITY_OPTIONS.find((a) => a.value === activity)?.desc} delay={180}>
        <Segmented label="Activity level" options={ACTIVITY_OPTIONS.map(({ label, value }) => ({ label, value }))} value={activity} onChange={setActivity} />
      </Section>

      <Section icon="target" title="Goal & pace" sub={goal === "maintain" ? "Keep your current weight" : "How fast you want to change"} delay={240}>
        <Segmented label="Goal" options={[{ label: "Lose", value: "lose" }, { label: "Maintain", value: "maintain" }, { label: "Gain", value: "gain" }]} value={goal} onChange={setGoal} fullWidth />
        {goal !== "maintain" ? (
          <Segmented
            label="Weekly pace"
            options={[{ label: "0.25 kg/wk", value: 0.25 }, { label: "0.5 kg/wk", value: 0.5 }, { label: "0.75 kg/wk", value: 0.75 }]}
            value={rate}
            onChange={setRate}
            fullWidth
          />
        ) : null}
        {plan ? (
          <View style={{ flexDirection: "row", gap: 10, alignItems: "flex-start", backgroundColor: colors.primarySoft, borderRadius: radius.sm, padding: space(3) }}>
            <IconTile name={plan.icon} size={32} />
            <Text style={[styles.body, { flex: 1, fontSize: 14, lineHeight: 20 }]}>{plan.text}</Text>
          </View>
        ) : null}
      </Section>

      <ErrorText>{error}</ErrorText>
      <Button title={submitLabel} icon="check" onPress={submit} loading={saving} disabled={!profile} />
      <Text style={[styles.muted, { textAlign: "center", marginTop: 8, fontSize: 12 }]}>
        Estimates use the Mifflin–St Jeor formula. They're a starting point, not medical advice.
      </Text>
    </View>
  );
}

function Section({ icon, title, sub, delay, children }: { icon: IconName; title: string; sub?: string; delay: number; children: ReactNode }) {
  return (
    <Reveal delay={delay}>
      <Card style={{ padding: space(4) }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: space(4) }}>
          <IconTile name={icon} size={40} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.h2, { marginBottom: 0 }]}>{title}</Text>
            {sub ? <Text style={[styles.muted, { fontSize: 13 }]}>{sub}</Text> : null}
          </View>
        </View>
        {children}
      </Card>
    </Reveal>
  );
}

function MacroPill({ label, grams, color }: { label: string; grams: number; color: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.25)", borderRadius: radius.sm, paddingVertical: 8, paddingHorizontal: 10, borderLeftWidth: 3, borderLeftColor: color }}>
      <Text style={{ color: colors.onHero, fontWeight: "800", fontSize: 16 }}>{grams} g</Text>
      <Text style={{ color: colors.onHeroMuted, fontSize: 12 }}>{label}</Text>
    </View>
  );
}

/** One-line plan: how much to change and roughly how long it takes at the chosen pace. */
function planLine(p: Profile): { icon: IconName; text: string } | null {
  const diff = Math.round((p.goal_weight_kg - p.weight_kg) * 10) / 10;
  if (p.goal === "maintain") return { icon: "anchor", text: `Stay around ${p.weight_kg} kg.` };
  if (p.goal === "lose" && diff >= 0) return { icon: "alert-circle", text: "Your goal weight isn't below your current weight. Lower it, or switch your goal to Maintain." };
  if (p.goal === "gain" && diff <= 0) return { icon: "alert-circle", text: "Your goal weight isn't above your current weight. Raise it, or switch your goal to Maintain." };
  const weeks = Math.ceil(Math.abs(diff) / p.weekly_rate_kg);
  const when = new Date(Date.now() + weeks * 7 * 86_400_000).toLocaleDateString(undefined, { month: "short", year: "numeric" });
  return { icon: "calendar", text: `${p.goal === "lose" ? "Lose" : "Gain"} ${Math.abs(diff)} kg in about ${weeks} weeks, around ${when}.` };
}
