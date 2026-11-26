import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Text, TextInput, View } from "react-native";
import { showDialog } from "@/components/dialog";
import { Chip } from "@/components/nutrition";
import { leaveScanner, ScanScreen } from "@/components/ScanScreen";
import { Button, Card, MacroRow, MealPicker, Notice, styles } from "@/components/ui";
import { api } from "@/lib/api";
import { useApp } from "@/lib/AppContext";
import { mealForNow } from "@/lib/date";
import { colors, minTouch, radius, space } from "@/lib/theme";
import type { Meal, MealAnalysis, MealItem } from "@/lib/types";

interface EditableItem extends MealItem { baseGrams: number; gramsText: string }

function scaled(i: EditableItem): MealItem {
  const g = Number(i.gramsText) || 0;
  const k = i.baseGrams > 0 ? g / i.baseGrams : 0;
  return { name: i.name, grams: g, kcal: i.kcal * k, protein_g: i.protein_g * k, carbs_g: i.carbs_g * k, fat_g: i.fat_g * k };
}

const CONFIDENCE_LABEL: Record<MealAnalysis["confidence"], string> = { high: "High confidence", medium: "Medium confidence", low: "Low confidence" };

export default function SnapMeal() {
  const params = useLocalSearchParams<{ meal?: Meal }>();
  const { date, refreshDiary } = useApp();
  const [meal, setMeal] = useState<Meal>(params.meal ?? mealForNow());
  const [analysis, setAnalysis] = useState<MealAnalysis | null>(null);
  const [items, setItems] = useState<EditableItem[]>([]);
  const [saving, setSaving] = useState(false);

  async function analyze(base64: string) {
    const res = await api.analyzeMeal(base64, null, null);
    if (!res.is_food || res.items.length === 0) return false;
    setAnalysis(res);
    setItems(res.items.map((i) => ({ ...i, baseGrams: i.grams, gramsText: String(Math.round(i.grams)) })));
    return true;
  }

  const finalItems = items.map(scaled).filter((i) => i.grams > 0);
  const totals = finalItems.reduce(
    (t, i) => ({ kcal: t.kcal + i.kcal, p: t.p + i.protein_g, c: t.c + i.carbs_g, f: t.f + i.fat_g }),
    { kcal: 0, p: 0, c: 0, f: 0 }
  );

  async function save() {
    if (finalItems.length === 0) return;
    setSaving(true);
    try {
      await api.addEntries(
        finalItems.map((i) => ({
          date, meal, name: i.name, amount_desc: `${Math.round(i.grams)} g · AI photo`,
          kcal: Math.round(i.kcal), protein_g: r1(i.protein_g), carbs_g: r1(i.carbs_g), fat_g: r1(i.fat_g), source: "ai_photo" as const,
        }))
      );
      refreshDiary();
      leaveScanner();
    } catch (e) {
      showDialog({
        icon: "alert-circle",
        title: "Couldn't save",
        message: (e as Error).message || "Your meal wasn't saved. Please try again.",
        primary: { label: "Try again", onPress: save },
        secondary: { label: "Cancel", onPress: () => {} },
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScanScreen
      titles={{ camera: "Snap a meal", scanning: "Scanning", results: "Your meal" }}
      hint="Fit the whole plate in the frame"
      scanTitle="Detecting food…"
      scanSteps={["Finding food items", "Estimating portions", "Calculating nutrition"]}
      notFound={{ icon: "search", title: "No food found", message: "We couldn't spot any food in this photo. Try a clear, top-down shot with the whole plate in good light." }}
      switchAction={{ icon: "tag", caption: "Label", label: "Scan a nutrition label instead", onPress: () => router.replace({ pathname: "/scan/label", params: { meal } }) }}
      analyze={(p) => analyze(p.base64)}
      onReset={() => { setAnalysis(null); setItems([]); }}
      photoLabels={items.map((i) => i.name)}
      meal={meal}
      onMealChange={setMeal}
    >
      {analysis ? (
        <>
          <LinearGradient colors={[colors.heroTop, colors.heroBottom]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: radius.md, padding: space(4), marginBottom: space(3) }}>
            <Chip label={CONFIDENCE_LABEL[analysis.confidence]} tone="lime" />
            <Text style={{ fontSize: 22, fontWeight: "800", color: colors.onHero, marginTop: 10 }}>{analysis.meal_name}</Text>
            <View style={{ flexDirection: "row", alignItems: "flex-end", marginTop: space(2), marginBottom: space(2) }}>
              <Text style={{ fontSize: 36, fontWeight: "900", color: colors.lime }}>{Math.round(totals.kcal)}</Text>
              <Text style={{ fontSize: 14, color: colors.onHeroMuted, marginBottom: 6, marginLeft: 6 }}>kcal</Text>
            </View>
            <View style={{ backgroundColor: colors.card, borderRadius: radius.sm, padding: space(2) }}>
              <MacroRow protein={totals.p} carbs={totals.c} fat={totals.f} />
            </View>
          </LinearGradient>

          {analysis.notes ? <Notice>{analysis.notes}</Notice> : null}
          {analysis.confidence === "low" ? <Notice>The AI isn't very sure about this one. Check the items below.</Notice> : null}

          <MealPicker value={meal} onChange={setMeal} />

          <Text style={[styles.h2, { marginTop: space(2) }]}>Detected items</Text>
          <Text style={[styles.muted, { marginBottom: space(2) }]}>Adjust grams if the portion looks off.</Text>
          {items.map((it, idx) => {
            const s = scaled(it);
            return (
              <Card key={idx}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.body, { fontWeight: "700" }]}>{it.name}</Text>
                    <Text style={styles.muted}>{Math.round(s.kcal)} kcal</Text>
                  </View>
                  <TextInput
                    value={it.gramsText}
                    onChangeText={(t) => setItems((prev) => prev.map((p, i) => (i === idx ? { ...p, gramsText: t } : p)))}
                    keyboardType="decimal-pad"
                    accessibilityLabel={`Grams of ${it.name}`}
                    style={[styles.input, { width: 76, minHeight: minTouch, textAlign: "right" }]}
                  />
                  <Text style={styles.muted}>g</Text>
                </View>
              </Card>
            );
          })}

          <Button title={`Save ${Math.round(totals.kcal)} kcal`} icon="check" onPress={save} loading={saving} disabled={finalItems.length === 0} />
        </>
      ) : null}
    </ScanScreen>
  );
}

const r1 = (n: number) => Math.round(n * 10) / 10;
