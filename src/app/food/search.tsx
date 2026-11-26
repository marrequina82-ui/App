import { Feather } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { FlatList, Text, TextInput, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Chip, Skeleton } from "@/components/nutrition";
import { Button, Card, EmptyState, ErrorText, Field, IconButton, MacroRow, MealPicker, Press, Reveal, Segmented, styles } from "@/components/ui";
import { api } from "@/lib/api";
import { useApp } from "@/lib/AppContext";
import { mealForNow } from "@/lib/date";
import { colors, minTouch, radius, space, themed } from "@/lib/theme";
import type { Food, Meal } from "@/lib/types";

const r1 = (n: number) => Math.round(n * 10) / 10;

export default function SearchFood() {
  const params = useLocalSearchParams<{ meal?: Meal }>();
  const { date, refreshDiary } = useApp();
  const [meal, setMeal] = useState<Meal>(params.meal ?? mealForNow());
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Food[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Food | null>(null);
  const [mode, setMode] = useState<"servings" | "grams">("servings");
  const [amount, setAmount] = useState("1");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debounced search. Only runs for two or more characters.
  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) { setResults(null); setSearching(false); setSearchError(null); return; }
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        setSearchError(null);
        setResults(await api.searchFoods(term));
      } catch (e) {
        setSearchError((e as Error).message);
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  const amountNum = Number(amount) || 0;
  const factor = selected ? (mode === "servings" ? amountNum : selected.serving_g > 0 ? amountNum / selected.serving_g : 0) : 0;
  const amountError = selected && factor <= 0 ? "Enter an amount greater than zero." : null;

  function choose(f: Food) {
    setSelected(f);
    setMode("servings");
    setAmount("1");
    setError(null);
  }

  async function add() {
    if (!selected || factor <= 0) return;
    setSaving(true);
    setError(null);
    try {
      await api.addEntries({
        date, meal, name: selected.name,
        amount_desc: mode === "servings" ? `${amount} × ${selected.serving_desc}` : `${amount} g`,
        kcal: Math.round(selected.kcal * factor), protein_g: r1(selected.protein_g * factor),
        carbs_g: r1(selected.carbs_g * factor), fat_g: r1(selected.fat_g * factor), source: "search",
      });
      refreshDiary();
      router.back();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (selected) {
    const kcal = Math.round(selected.kcal * factor);
    return (
      <View style={{ flex: 1, padding: space(5), backgroundColor: colors.bg }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: space(3) }}>
          <IconButton icon="chevron-left" label="Back to results" onPress={() => setSelected(null)} />
          <Text style={[styles.h2, { marginBottom: 0 }]}>Add food</Text>
          <View style={{ width: minTouch }} />
        </View>

        <Reveal>
          <MealPicker value={meal} onChange={setMeal} />
        </Reveal>

        <Reveal delay={60}>
          <Card>
            <Text accessibilityRole="header" style={[styles.h2, { fontSize: 20 }]}>{selected.name}</Text>
            <View style={{ flexDirection: "row", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
              <Chip label={selected.serving_desc} />
              <Chip label={selected.source === "label" ? "Saved label" : "Database"} tone="soft" />
            </View>
          </Card>
        </Reveal>

        <Segmented label="Measure by" options={[{ label: "Servings", value: "servings" }, { label: "Grams", value: "grams" }]} value={mode}
          onChange={(m) => { setMode(m); setAmount(m === "servings" ? "1" : String(selected.serving_g)); }} />

        <Field
          label={mode === "servings" ? "Number of servings" : "Grams"}
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          error={amountError}
        />
        <View style={{ flexDirection: "row", gap: 10, marginBottom: space(3) }}>
          <Press onPress={() => setAmount(String(r1(Math.max(0, amountNum - (mode === "servings" ? 0.5 : 10)))))} accessibilityLabel="Decrease amount" style={stepper}>
            <Feather name="minus" size={20} color={colors.primaryDark} />
          </Press>
          <Press onPress={() => setAmount(String(r1(amountNum + (mode === "servings" ? 0.5 : 10))))} accessibilityLabel="Increase amount" style={stepper}>
            <Feather name="plus" size={20} color={colors.primaryDark} />
          </Press>
        </View>

        <Reveal delay={120}>
          <Card style={{ backgroundColor: colors.primarySoft, borderColor: colors.primarySoft }}>
            <Text style={styles.muted}>Preview for this amount</Text>
            <Text style={{ fontSize: 34, fontWeight: "900", color: colors.primaryDark, marginTop: 2 }}>{Number.isFinite(kcal) ? kcal : 0} kcal</Text>
            <View style={{ marginTop: 8 }}>
              <MacroRow protein={selected.protein_g * factor} carbs={selected.carbs_g * factor} fat={selected.fat_g * factor} />
            </View>
          </Card>
        </Reveal>

        <ErrorText>{error}</ErrorText>
        <Button title={`Add to ${meal}`} icon="plus" onPress={add} loading={saving} disabled={factor <= 0} />
        <Button title="Choose a different food" variant="ghost" onPress={() => setSelected(null)} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, padding: space(5), backgroundColor: colors.bg }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: colors.card, borderRadius: radius.pill, borderWidth: 1.5, borderColor: colors.borderStrong, paddingHorizontal: 16 }}>
        <Feather name="search" size={20} color={colors.muted} accessible={false} importantForAccessibility="no" />
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Search e.g. adobo, rice, banana"
          placeholderTextColor={colors.placeholder}
          accessibilityLabel="Search foods"
          returnKeyType="search"
          style={{ flex: 1, minHeight: minTouch, fontSize: 16, color: colors.text }}
          autoFocus
        />
        {q ? <IconButton icon="x" label="Clear search" onPress={() => setQ("")} color={colors.muted} /> : null}
      </View>

      <ErrorText>{searchError}</ErrorText>

      {searching && !results ? (
        <View style={{ marginTop: 16, gap: 10 }}>
          <Skeleton width="80%" height={18} />
          <Skeleton width="55%" height={14} />
          <Skeleton width="70%" height={18} />
        </View>
      ) : null}

      <FlatList
        style={{ marginTop: 12 }}
        data={results ?? []}
        keyExtractor={(f) => String(f.id)}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          q.trim().length < 2 ? (
            <EmptyState icon="search" title="Search the food list" body="Type at least two letters. Dishes, staples and your saved label foods are included." />
          ) : searching ? undefined : (
            <EmptyState icon="x-circle" title="No matches" body="Try a different word, or scan the meal or label instead." />
          )
        }
        renderItem={({ item, index }) => (
          <Reveal delay={Math.min(index, 8) * 45}>
            <Press
              onPress={() => choose(item)}
              accessibilityLabel={`${item.name}, ${Math.round(item.kcal)} kcal per ${item.serving_desc}`}
              style={{ marginBottom: space(2) }}
            >
              <Card style={{ marginBottom: 0, flexDirection: "row", alignItems: "center", gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.body, { fontWeight: "700" }]} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.muted} numberOfLines={1}>{item.serving_desc}</Text>
                </View>
                {item.source === "label" ? <Chip label="Label" tone="accent" /> : null}
                <Text style={{ fontSize: 17, fontWeight: "800", color: colors.text }}>{Math.round(item.kcal)}</Text>
                <Feather name="chevron-right" size={18} color={colors.muted} accessible={false} importantForAccessibility="no" />
              </Card>
            </Press>
          </Reveal>
        )}
      />
    </View>
  );
}

const stepper = themed(() => ({
  flex: 1,
  minHeight: minTouch,
  borderRadius: radius.pill,
  backgroundColor: colors.glass,
  alignItems: "center" as const,
  justifyContent: "center" as const,
}));
