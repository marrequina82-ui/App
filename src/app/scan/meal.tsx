import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Alert, Image, Text, TextInput, View } from "react-native";
import { Chip, Skeleton, Viewfinder } from "@/components/nutrition";
import { Button, Card, ErrorText, Field, MacroRow, MealPicker, Notice, Screen, Segmented, styles } from "@/components/ui";
import { api } from "@/lib/api";
import { useApp } from "@/lib/AppContext";
import { mealForNow } from "@/lib/date";
import { getPhoto, type PickedImage } from "@/lib/image";
import { colors, minTouch, radius, space } from "@/lib/theme";
import type { Meal, MealAnalysis, MealItem } from "@/lib/types";

/** Item as returned by AI plus the user's edited grams. Per-gram values let us rescale. */
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
  const [photo, setPhoto] = useState<PickedImage | null>(null);
  const [weight, setWeight] = useState("");
  const [unit, setUnit] = useState<"g" | "kg">("g");
  const [note, setNote] = useState("");
  const [analysis, setAnalysis] = useState<MealAnalysis | null>(null);
  const [items, setItems] = useState<EditableItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const weightNum = Number(weight);
  const weightError = weight && (!Number.isFinite(weightNum) || weightNum <= 0) ? "Enter a weight greater than zero, or leave it empty." : null;
  const totalGrams = weight && !weightError ? weightNum * (unit === "kg" ? 1000 : 1) : null;

  async function pick(source: "camera" | "library") {
    try {
      setError(null);
      const p = await getPhoto(source);
      if (p) {
        setPhoto(p);
        setAnalysis(null);
        setItems([]);
      }
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function analyze() {
    if (!photo) return;
    if (weightError) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.analyzeMeal(photo.base64, totalGrams && totalGrams > 0 ? totalGrams : null, note.trim() || null);
      if (!res.is_food || res.items.length === 0) {
        setError("I couldn't find food in this photo. Try a clearer, top-down shot of the plate.");
        return;
      }
      setAnalysis(res);
      setItems(res.items.map((i) => ({ ...i, baseGrams: i.grams, gramsText: String(Math.round(i.grams)) })));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const finalItems = items.map(scaled).filter((i) => i.grams > 0);
  const totals = finalItems.reduce(
    (t, i) => ({ kcal: t.kcal + i.kcal, p: t.p + i.protein_g, c: t.c + i.carbs_g, f: t.f + i.fat_g, g: t.g + i.grams }),
    { kcal: 0, p: 0, c: 0, f: 0, g: 0 }
  );

  async function save() {
    if (finalItems.length === 0) return;
    setSaving(true);
    setError(null);
    try {
      await api.addEntries(
        finalItems.map((i) => ({
          date, meal, name: i.name, amount_desc: `${Math.round(i.grams)} g · AI photo`,
          kcal: Math.round(i.kcal), protein_g: r1(i.protein_g), carbs_g: r1(i.carbs_g), fat_g: r1(i.fat_g), source: "ai_photo" as const,
        }))
      );
      refreshDiary();
      Alert.alert("Logged", `${Math.round(totals.kcal)} kcal added to ${meal}.`);
      router.back();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen edges={["bottom"]}>
      <MealPicker value={meal} onChange={setMeal} />

      {photo ? (
        <View style={{ borderRadius: radius.lg, overflow: "hidden", marginBottom: space(3) }}>
          <Image source={{ uri: photo.uri }} accessibilityLabel="Photo of your meal" style={{ width: "100%", aspectRatio: 4 / 3 }} resizeMode="cover" />
        </View>
      ) : (
        <Viewfinder scanning={loading}>
          <View style={{ alignItems: "center", paddingHorizontal: space(6) }}>
            <Feather name="aperture" size={36} color={colors.lime} accessible={false} importantForAccessibility="no" />
            <Text style={{ color: colors.onPrimary, fontWeight: "700", fontSize: 16, marginTop: 10, textAlign: "center" }}>Take a clear photo of your plate</Text>
            <Text style={{ color: colors.onHeroMuted, fontSize: 14, marginTop: 6, textAlign: "center", lineHeight: 20 }}>Top-down, in good light, with the whole meal in frame.</Text>
          </View>
        </Viewfinder>
      )}

      <View style={{ flexDirection: "row", gap: 10 }}>
        <View style={{ flex: 1 }}><Button title={photo ? "Retake" : "Camera"} icon="camera" onPress={() => pick("camera")} variant={photo ? "secondary" : "primary"} disabled={loading} /></View>
        <View style={{ flex: 1 }}><Button title="Gallery" icon="image" onPress={() => pick("library")} variant="secondary" disabled={loading} /></View>
      </View>

      {photo && !analysis && (
        <Card style={{ marginTop: 8 }}>
          <Text style={styles.h2}>Total weight of the meal</Text>
          <Text style={[styles.muted, { marginBottom: 12 }]}>Weigh it if you can. It makes the estimate much more accurate.</Text>
          <View style={{ flexDirection: "row", gap: 10, alignItems: "flex-start" }}>
            <View style={{ flex: 1 }}>
              <Field label="Weight" value={weight} onChangeText={setWeight} keyboardType="decimal-pad" placeholder={unit === "g" ? "350" : "0.35"} error={weightError} />
            </View>
            <View style={{ paddingTop: 24 }}>
              <Segmented label="Weight unit" options={[{ label: "g", value: "g" }, { label: "kg", value: "kg" }]} value={unit} onChange={setUnit} />
            </View>
          </View>
          <Field label="Anything the photo can't show? (optional)" value={note} onChangeText={setNote} placeholder="e.g. fried in butter, 1 cup rice, no skin" />
          <Text style={[styles.muted, { marginBottom: 12 }]}>Leave the weight empty and the AI will estimate portion sizes (less accurate).</Text>
          <Button title={loading ? "Analyzing…" : "Estimate calories"} icon="star" onPress={analyze} loading={loading} disabled={!!weightError} />
          {loading ? (
            <View style={{ marginTop: 12, gap: 8 }} accessibilityLabel="Analyzing your meal">
              <Skeleton width="70%" height={20} />
              <Skeleton width="45%" height={34} />
              <Skeleton width="100%" height={12} />
            </View>
          ) : null}
        </Card>
      )}

      <ErrorText>{error}</ErrorText>

      {analysis && (
        <>
          <LinearGradient colors={[colors.heroTop, colors.heroBottom]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: radius.lg, padding: space(5), marginTop: 8, marginBottom: space(3) }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
              <Chip label={CONFIDENCE_LABEL[analysis.confidence]} tone="lime" />
              <Text style={{ color: colors.onHeroMuted, fontSize: 13 }}>{Math.round(totals.g)} g total</Text>
            </View>
            <Text accessibilityRole="header" style={{ fontSize: 20, fontWeight: "800", color: colors.onPrimary, marginTop: 10 }}>{analysis.meal_name}</Text>
            <View style={{ flexDirection: "row", alignItems: "flex-end", marginTop: space(3) }}>
              <Text style={{ fontSize: 44, fontWeight: "900", color: colors.lime }}>{Math.round(totals.kcal)}</Text>
              <Text style={{ fontSize: 16, color: colors.onHeroMuted, marginBottom: 8, marginLeft: 6 }}>kcal (estimate)</Text>
            </View>
            <View style={{ marginTop: space(3) }}>
              <MacroRow protein={totals.p} carbs={totals.c} fat={totals.f} />
            </View>
          </LinearGradient>

          {analysis.notes ? <Notice>{analysis.notes}</Notice> : null}
          {analysis.confidence === "low" && <Notice>The AI isn't very sure about this one. Check the items and grams below.</Notice>}

          <Text style={[styles.h2, { marginTop: 8 }]}>Items: adjust grams if needed</Text>
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
                    style={[styles.input, { width: 92, minHeight: minTouch, textAlign: "right" }]}
                  />
                  <Text style={styles.muted}>g</Text>
                </View>
              </Card>
            );
          })}
          <Text style={[styles.muted, { marginBottom: 12 }]}>Set an item to 0 g to leave it out. AI estimates can be off by 20% or more.</Text>
          <Button title={`Save ${Math.round(totals.kcal)} kcal to ${meal}`} icon="check" onPress={save} loading={saving} disabled={finalItems.length === 0} />
          <Button title="Start over" variant="ghost" icon="refresh-cw" onPress={() => { setAnalysis(null); setItems([]); }} />
        </>
      )}
    </Screen>
  );
}

const r1 = (n: number) => Math.round(n * 10) / 10;
