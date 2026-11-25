export type Meal = "breakfast" | "lunch" | "dinner" | "snacks";
export const MEALS: Meal[] = ["breakfast", "lunch", "dinner", "snacks"];
export const MEAL_LABEL: Record<Meal, string> = { breakfast: "Breakfast", lunch: "Lunch", dinner: "Dinner", snacks: "Snacks" };

export type Sex = "female" | "male";
export type Activity = "sedentary" | "light" | "moderate" | "active" | "very_active";
export type Goal = "lose" | "maintain" | "gain";

export interface User { id: number; name: string; email: string }

export interface Profile {
  sex: Sex;
  birth_year: number;
  height_cm: number;
  weight_kg: number;
  goal_weight_kg: number;
  activity: Activity;
  goal: Goal;
  weekly_rate_kg: number;
}

export interface Targets {
  bmr: number;
  tdee: number;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  bmi: number;
  warnings: string[];
}

export interface Macros { kcal: number; protein_g: number; carbs_g: number; fat_g: number }

export interface Food extends Macros {
  id: number;
  name: string;
  serving_desc: string;
  serving_g: number;
  source: string;
}

export interface DiaryEntry extends Macros {
  id: number;
  date: string;
  meal: Meal;
  name: string;
  amount_desc: string;
  source: "search" | "ai_photo" | "label" | "quick";
}

export type NewDiaryEntry = Omit<DiaryEntry, "id">;

export interface MealItem extends Macros { name: string; grams: number }
export interface MealAnalysis {
  is_food: boolean;
  meal_name: string;
  items: MealItem[];
  total_grams: number;
  confidence: "low" | "medium" | "high";
  notes: string;
}

export interface LabelAnalysis extends Macros {
  is_label: boolean;
  product_name: string;
  serving_desc: string;
  serving_g: number | null;
  servings_per_container: number | null;
  fiber_g: number | null;
  sugar_g: number | null;
  sodium_mg: number | null;
  notes: string;
}
