import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";
import { showDialog } from "@/components/dialog";
import { Chip } from "@/components/nutrition";
import { leaveScanner, ScanScreen } from "@/components/ScanScreen";
import { Button, Card, Field, IconTile, MacroRow, MealPicker, Notice, Segmented, styles } from "@/components/ui";
import { api } from "@/lib/api";
import { useApp } from "@/lib/AppContext";
import { mealForNow } from "@/lib/date";
import { colors, radius, space } from "@/lib/theme";
import type { LabelAnalysis, Meal } from "@/lib/types";

/** Editable per-serving values. Strings so the user can type freely; parsed on save. */
interface Draft {
  name: string;
  serving_desc: string;
  serving_g: string;
  kcal: string;
  protein_g: string;
  carbs_g: string;
  fat_g: string;
}

const num = (s: string) => {
  const n = Number(s.replace(",", "."));
  return Number.isFinite(n) && s.trim() !== "" ? n : NaN;
};

function toDraft(l: LabelAnalysis): Draft {
  const s = (v: number | null) => (v == null ? "" : String(v));
  return {
    name: l.product_name, serving_desc: l.serving_desc, serving_g: s(l.serving_g), kcal: String(Math.round(l.kcal)),
    protein_g: String(l.protein_g), carbs_g: String(l.carbs_g), fat_g: String(l.fat_g),
  };
}

export default function ScanLabel() {
  const params = useLocalSearchParams<{ meal?: Meal }>();
  const { date, refreshDiary } = useApp();
  const [meal, setMeal] = useState<Meal>(params.meal ?? mealForNow());
  const [label, setLabel] = useState<LabelAnalysis | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [mode, setMode] = useState<"servings" | "grams">("servings");
  const [amount, setAmount] = useState("1");
  const [saveToFoods, setSaveToFoods] = useState(true);
  const [saving, setSaving] = useState(false);

  async function analyze(base64: string) {
    const res = await api.analyzeLabel(base64);
    if (!res.is_label) return false;
    setLabel(res);
    setDraft(toDraft(res));
    setMode("servings");
    setAmount("1");
    return true;
  }

  // Per-serving values from the (possibly edited) draft.
  const perServing = draft && {
    kcal: num(draft.kcal), protein_g: num(draft.protein_g), carbs_g: num(draft.carbs_g), fat_g: num(draft.fat_g),
    serving_g: num(draft.serving_g),
  };
  const amountNum = Number(amount) || 0;
  const factor = !perServing ? 0 : mode === "servings" ? amountNum : perServing.serving_g > 0 ? amountNum / perServing.serving_g : 0;
  const draftValid = !!perServing && [perServing.kcal, perServing.protein_g, perServing.carbs_g, perServing.fat_g].every((v) => Number.isFinite(v) && v >= 0) && draft!.name.trim().length > 0;
  const kcal = perServing && Number.isFinite(perServing.kcal) ? perServing.kcal * factor : 0;
  const canGrams = !!perServing && Number.isFinite(perServing.serving_g) && perServing.serving_g > 0;
  const portion = (v: number | undefined) => (v != null && Number.isFinite(v) ? v * factor : 0);

  function update<K extends keyof Draft>(key: K, value: string) {
    setDraft((d) => (d ? { ...d, [key]: value } : d));
  }

  async function save() {
    if (!label || !draft || !perServing || !draftValid || factor <= 0) return;
    setSaving(true);
    const name = draft.name.trim();
    try {
      const amountDesc = mode === "servings" ? `${amount} × ${draft.serving_desc || label.serving_desc}` : `${amount} g`;
      await api.addEntries({
        date, meal, name, amount_desc: amountDesc,
        kcal: Math.round(kcal), protein_g: r1(perServing.protein_g * factor), carbs_g: r1(perServing.carbs_g * factor), fat_g: r1(perServing.fat_g * factor),
        source: "label",
      });
      if (saveToFoods && canGrams) {
        await api.createFood({
          name, serving_desc: draft.serving_desc || label.serving_desc, serving_g: perServing.serving_g,
          kcal: perServing.kcal, protein_g: perServing.protein_g, carbs_g: perServing.carbs_g, fat_g: perServing.fat_g, source: "label",
        });
      }
      refreshDiary();
      leaveScanner();
    } catch (e) {
      showDialog({
        icon: "alert-circle",
        title: "Couldn't save",
        message: (e as Error).message || "This food wasn't logged. Please try again.",
        primary: { label: "Try again", onPress: save },
        secondary: { label: "Cancel", onPress: () => {} },
      });
    } finally {
      setSaving(false);
    }
  }

  const photoLabels = label ? [label.product_name || "Nutrition Facts", `${Math.round(label.kcal)} kcal per serving`] : [];

  return (
    <ScanScreen
      titles={{ camera: "Scan a label", scanning: "Reading label", results: "Nutrition facts" }}
      hint="Fit the Nutrition Facts panel in the frame"
      scanTitle="Reading label…"
      scanSteps={["Finding the Nutrition Facts", "Reading serving size", "Reading calories and macros"]}
      notFound={{ icon: "tag", title: "No label found", message: "We couldn't read a Nutrition Facts panel. Get closer, avoid glare and keep the label flat." }}
      switchAction={{ icon: "aperture", caption: "Meal", label: "Snap a meal instead", onPress: () => router.replace({ pathname: "/scan/meal", params: { meal } }) }}
      analyze={(p) => analyze(p.base64)}
      onReset={() => { setLabel(null); setDraft(null); }}
      photoLabels={photoLabels}
      meal={meal}
      onMealChange={setMeal}
    >
      {label && draft ? (
        <>
          <LinearGradient colors={[colors.heroTop, colors.heroBottom]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: radius.md, padding: space(4), marginBottom: space(3) }}>
            <Chip label={label.servings_per_container ? `${label.servings_per_container} servings per pack` : "Nutrition Facts read"} tone="lime" />
            <Text style={{ fontSize: 22, fontWeight: "800", color: colors.onHero, marginTop: 10 }}>{draft.name || "Unnamed product"}</Text>
            <Text style={{ fontSize: 13, color: colors.onHeroMuted, marginTop: 4, fontWeight: "700" }}>THIS PORTION</Text>
            <View style={{ flexDirection: "row", alignItems: "flex-end", marginBottom: space(2) }}>
              <Text style={{ fontSize: 36, fontWeight: "900", color: colors.lime }}>{Number.isFinite(kcal) ? Math.round(kcal) : "–"}</Text>
              <Text style={{ fontSize: 14, color: colors.onHeroMuted, marginBottom: 6, marginLeft: 6 }}>kcal</Text>
            </View>
            <View style={{ backgroundColor: colors.card, borderRadius: radius.sm, padding: space(2) }}>
              <MacroRow protein={portion(perServing?.protein_g)} carbs={portion(perServing?.carbs_g)} fat={portion(perServing?.fat_g)} />
            </View>
          </LinearGradient>

          {label.notes ? <Notice>{label.notes}</Notice> : null}

          <MealPicker value={meal} onChange={setMeal} />

          <Card>
            <Text style={styles.h2}>How much did you have?</Text>
            <Segmented
              label="Measure by"
              options={[{ label: "Servings", value: "servings" }, ...(canGrams ? [{ label: "Grams", value: "grams" as const }] : [])]}
              value={mode}
              onChange={(m) => { setMode(m); setAmount(m === "servings" ? "1" : String(perServing?.serving_g ?? "")); }}
            />
            <Field label={mode === "servings" ? "Number of servings" : "Grams eaten"} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" error={factor > 0 || !amount ? null : "Enter an amount greater than zero"} />
          </Card>

          <Card>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <IconTile name="check-circle" size={36} />
              <Text style={[styles.h2, { flex: 1, marginBottom: 0 }]}>Review what we read</Text>
            </View>
            <Text style={[styles.muted, { marginBottom: 12 }]}>Values are per serving. Correct anything that doesn't match the label.</Text>
            <Field label="Product name" value={draft.name} onChangeText={(v) => update("name", v)} />
            <Field label="Serving size" value={draft.serving_desc} onChangeText={(v) => update("serving_desc", v)} placeholder="e.g. 1 cup (30 g)" />
            <View style={{ flexDirection: "row", gap: 12 }}>
              <View style={{ flex: 1 }}><Field label="Serving (g)" value={draft.serving_g} onChangeText={(v) => update("serving_g", v)} keyboardType="decimal-pad" /></View>
              <View style={{ flex: 1 }}><Field label="Calories (kcal)" value={draft.kcal} onChangeText={(v) => update("kcal", v)} keyboardType="decimal-pad" error={Number.isFinite(num(draft.kcal)) || !draft.kcal ? null : "Enter a number"} /></View>
            </View>
            <View style={{ flexDirection: "row", gap: 12 }}>
              <View style={{ flex: 1 }}><Field label="Protein (g)" value={draft.protein_g} onChangeText={(v) => update("protein_g", v)} keyboardType="decimal-pad" /></View>
              <View style={{ flex: 1 }}><Field label="Carbs (g)" value={draft.carbs_g} onChangeText={(v) => update("carbs_g", v)} keyboardType="decimal-pad" /></View>
            </View>
            <Field label="Fat (g)" value={draft.fat_g} onChangeText={(v) => update("fat_g", v)} keyboardType="decimal-pad" />
          </Card>

          {canGrams ? (
            <Segmented
              label="Save this product"
              options={[{ label: "Save to my foods", value: "yes" }, { label: "Don't save", value: "no" }]}
              value={saveToFoods ? "yes" : "no"}
              onChange={(v) => setSaveToFoods(v === "yes")}
              fullWidth
            />
          ) : null}
          <Button title={`Log ${Number.isFinite(kcal) ? Math.round(kcal) : 0} kcal`} icon="plus" onPress={save} loading={saving} disabled={!draftValid || factor <= 0} />
        </>
      ) : null}
    </ScanScreen>
  );
}

const r1 = (n: number) => Math.round(n * 10) / 10;
