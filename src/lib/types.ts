// Database type definitions matching the schema in 001_initial_schema.sql
// These are manually maintained to match the database exactly

export type UserRole = 'user' | 'admin';
export type Sex = 'male' | 'female';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active';
export type Goal = 'cut' | 'maintain' | 'bulk';
export type UnitSystem = 'metric' | 'imperial';
export type FoodSource = 'barcode' | 'label_scan' | 'manual';
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export type EquipmentStatus = 'pending' | 'approved' | 'rejected';

export interface Profile {
  id: string;
  display_name: string | null;
  role: UserRole;
  sex: Sex | null;
  birth_year: number | null;
  height_cm: number | null;
  activity_level: ActivityLevel | null;
  goal: Goal | null;
  unit_system: UnitSystem;
  created_at: string;
  updated_at: string;
}

export interface Food {
  id: string;
  owner_id: string | null;
  barcode: string | null;
  name: string;
  brand: string | null;
  kcal_100g: number;
  protein_100g: number;
  carbs_100g: number;
  fat_100g: number;
  fiber_100g: number | null;
  sugar_100g: number | null;
  serving_g: number | null;
  source: FoodSource;
  needs_review: boolean;
  review_reason: string | null;
  image_path: string | null;
  created_at: string;
  updated_at: string;
}

export interface FoodLog {
  id: string;
  user_id: string;
  food_id: string;
  logged_on: string;
  meal: MealType;
  quantity_g: number;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  client_id: string;
  created_at: string;
  // Joined fields (optional)
  food?: Food;
}

export interface BodyWeight {
  id: string;
  user_id: string;
  measured_on: string;
  weight_kg: number;
  created_at: string;
}

export interface DailyTarget {
  id: string;
  user_id: string;
  effective_from: string;
  kcal: number;
  protein_g: number;
  reason: string;
  created_at: string;
}

export interface Equipment {
  id: string;
  name: string;
  muscle_group: string;
  image_path: string | null;
  status: EquipmentStatus;
  submitted_by: string;
  reviewed_by: string | null;
  review_note: string | null;
  created_at: string;
  updated_at: string;
}

export interface Exercise {
  id: string;
  name: string;
  muscle_group: string;
  equipment_id: string | null;
  owner_id: string | null;
  rep_range_low: number;
  rep_range_high: number;
  created_at: string;
}

export interface Routine {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
}

export interface RoutineExercise {
  id: string;
  routine_id: string;
  exercise_id: string;
  position: number;
}

export interface WorkoutSession {
  id: string;
  user_id: string;
  started_at: string;
  ended_at: string | null;
  routine_id: string | null;
  notes: string | null;
  created_at: string;
}

export interface WorkoutSet {
  id: string;
  session_id: string;
  user_id: string;
  exercise_id: string;
  set_no: number;
  weight_kg: number;
  reps: number;
  rpe: number | null;
  is_warmup: boolean;
  est_1rm: number | null;
  is_pr: boolean;
  client_id: string;
  created_at: string;
}

export interface ScanUsage {
  id: string;
  user_id: string;
  used_on: string;
  count: number;
}

export interface AuditLog {
  id: string;
  actor_id: string;
  action: string;
  entity: string;
  entity_id: string;
  details: Record<string, unknown> | null;
  created_at: string;
}

// Dashboard computed types
export interface DailySummary {
  date: string;
  kcal_eaten: number;
  protein_eaten: number;
  carbs_eaten: number;
  fat_eaten: number;
  kcal_target: number;
  protein_target: number;
}

export interface MealBreakdown {
  meal: MealType;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  logs: FoodLog[];
}
