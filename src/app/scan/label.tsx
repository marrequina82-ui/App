import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Alert, Image, Text, View } from "react-native";
import { Chip, Skeleton, Viewfinder } from "@/components/nutrition";
import { Button, Card, ErrorText, Field, IconTile, MealPicker, Notice, Screen, Segmented, styles } from "@/components/ui";
import { api } from "@/lib/api";
import { useApp } from "@/lib/AppContext";
import { mealForNow } from "@/lib/date";
import { getPhoto, type PickedImage } from "@/lib/image";
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
  sugar_g: string;
  fiber_g: string;
  sodium_mg: string;
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
    sugar_g: s(l.sugar_g), fiber_g: s(l.fiber_g), sodium_mg: s(l.sodium_mg),
  };
}

export default function ScanLabel() {
  const params = useLocalSearchParams<{ meal?: Meal }>();
  const { date, refreshDiary } = useApp();
  const [meal, setMeal] = useState<Meal>(params.meal ?? mealForNow());
  const [photo, setPhoto] = useState<PickedImage | null>(null);
  const [label, setLabel] = useState<LabelAnalysis | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [mode, setMode] = useState<"servings" | "grams">("servings");
  const [amount, setAmount] = useState("1");
  const [saveToFoods, setSaveToFoods] = useState(true);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pickAndRead(source: "camera" | "library") {
    setError(null);
    try {
      const p = await getPhoto(source);
      if (!p) return;
      setPhoto(p);
      setLabel(null);
      setDraft(null);
      setLoading(true);
      const res = await api.analyzeLabel(p.base64);
      if (!res.is_label) {
        setError("I couldn't read a nutrition label. Get closer, avoid glare and keep the label flat.");
        return;
      }
      setLabel(res);
      setDraft(toDraft(res));
      setMode("servings");
      setAmount("1");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
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

  function update<K extends keyof Draft>(key: K, value: string) {
    setDraft((d) => (d ? { ...d, [key]: value } : d));
  }

  async function save() {
    if (!label || !draft || !perServing || !draftValid || factor <= 0) return;
    setSaving(true);
    setError(null);
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
      Alert.alert("Logged", `${Math.round(kcal)} kcal added to ${meal}.`);
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
          <Image source={{ uri: photo.uri }} accessibilityLabel="Photo of the nutrition label" style={{ width: "100%", aspectRatio: 3 / 4, maxHeight: 300 }} resizeMode="cover" />
        </View>
      ) : (
        <Viewfinder scanning={loading} aspectRatio={3 / 4}>
          <View style={{ alignItems: "center", paddingHorizontal: space(6) }}>
            <Feather name="tag" size={36} color={colors.lime} accessible={false} importantForAccessibility="no" />
            <Text style={{ color: colors.onPrimary, fontWeight: "700", fontSize: 16, marginTop: 10, textAlign: "center" }}>Frame the Nutrition Facts panel</Text>
            <Text style={{ color: colors.onHeroMuted, fontSize: 14, marginTop: 6, textAlign: "center", lineHeight: 20 }}>Straight on, in good light, with no glare.</Text>
          </View>
        </Viewfinder>
      )}

      <View style={{ flexDirection: "row", gap: 10 }}>
        <View style={{ flex: 1 }}><Button title={photo ? "Rescan" : "Camera"} icon="camera" onPress={() => pickAndRead("camera")} loading={loading} /></View>
        <View style={{ flex: 1 }}><Button title="Gallery" icon="image" onPress={() => pickAndRead("library")} variant="secondary" disabled={loading} /></View>
      </View>

      {loading && (
        <Card style={{ marginTop: 8 }} >
          <Text style={[styles.muted, { marginBottom: 10 }]}>Reading the label…</Text>
          <Skeleton width="60%" height={18} style={{ marginBottom: 10 }} />
          <Skeleton width="100%" height={12} style={{ marginBottom: 6 }} />
          <Skeleton width="100%" height={12} style={{ marginBottom: 6 }} />
          <Skeleton width="80%" height={12} />
        </Card>
      )}
      <ErrorText>{error}</ErrorText>

      {label && draft && (
        <>
          <Card style={{ marginTop: 8 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <IconTile name="check-circle" size={36} />
              <Text style={[styles.h2, { flex: 1, marginBottom: 0 }]}>Review what we read</Text>
            </View>
            <Text style={[styles.muted, { marginBottom: 12 }]}>Check each value against the label and correct anything that's wrong before you save.</Text>
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
            <View style={{ flexDirection: "row", gap: 12 }}>
              <View style={{ flex: 1 }}><Field label="Fat (g)" value={draft.fat_g} onChangeText={(v) => update("fat_g", v)} keyboardType="decimal-pad" /></View>
              <View style={{ flex: 1 }}><Field label="Sugar (g)" value={draft.sugar_g} onChangeText={(v) => update("sugar_g", v)} keyboardType="decimal-pad" /></View>
            </View>
            <View style={{ flexDirection: "row", gap: 12 }}>
              <View style={{ flex: 1 }}><Field label="Fiber (g)" value={draft.fiber_g} onChangeText={(v) => update("fiber_g", v)} keyboardType="decimal-pad" /></View>
              <View style={{ flex: 1 }}><Field label="Sodium (mg)" value={draft.sodium_mg} onChangeText={(v) => update("sodium_mg", v)} keyboardType="decimal-pad" /></View>
            </View>
            {label.servings_per_container ? <Chip label={`${label.servings_per_container} servings per pack`} /> : null}
          </Card>

          <Notice>Saturated fat isn't read from labels yet. Add it from the package if you need it.</Notice>
          {label.notes ? <Notice>{label.notes}</Notice> : null}

          <LinearGradient colors={[colors.heroTop, colors.heroBottom]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: radius.lg, padding: space(5), marginBottom: space(3) }}>
            <Text style={{ color: colors.onHeroMuted, fontSize: 13, fontWeight: "700" }}>THIS PORTION</Text>
            <View style={{ flexDirection: "row", alignItems: "flex-end", marginTop: 6 }}>
              <Text style={{ fontSize: 40, fontWeight: "900", color: colors.lime }}>{Number.isFinite(kcal) ? Math.round(kcal) : "–"}</Text>
              <Text style={{ fontSize: 16, color: colors.onHeroMuted, marginBottom: 6, marginLeft: 6 }}>kcal</Text>
            </View>
          </LinearGradient>

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

          {canGrams ? (
            <Segmented
              label="Save this product"
              options={[{ label: "Save to my foods", value: "yes" }, { label: "Don't save", value: "no" }]}
              value={saveToFoods ? "yes" : "no"}
              onChange={(v) => setSaveToFoods(v === "yes")}
              fullWidth
            />
          ) : null}
          <Button title={`Log ${Number.isFinite(kcal) ? Math.round(kcal) : 0} kcal to ${meal}`} icon="plus" onPress={save} loading={saving} disabled={!draftValid || factor <= 0} />
        </>
      )}
    </Screen>
  );
}

const r1 = (n: number) => Math.round(n * 10) / 10;
