import { z } from 'zod';

// ============================================================
// ENUMS
// ============================================================
export const SexEnum = z.enum(['male', 'female']);
export const ActivityLevelEnum = z.enum(['sedentary', 'light', 'moderate', 'active']);
export const GoalEnum = z.enum(['cut', 'maintain', 'bulk']);
export const UnitSystemEnum = z.enum(['metric', 'imperial']);
export const MealEnum = z.enum(['breakfast', 'lunch', 'dinner', 'snack']);
export const FoodSourceEnum = z.enum(['barcode', 'label_scan', 'manual']);
export const EquipmentStatusEnum = z.enum(['pending', 'approved', 'rejected']);
export const UserRoleEnum = z.enum(['user', 'admin']);

// ============================================================
// PROFILE
// ============================================================
export const profileSchema = z.object({
  display_name: z.string().min(1).max(100).optional(),
  sex: SexEnum.optional(),
  birth_year: z.number().int().min(1900).max(new Date().getFullYear()).optional(),
  height_cm: z.number().positive().max(300).optional(),
  activity_level: ActivityLevelEnum.optional(),
  goal: GoalEnum.optional(),
  unit_system: UnitSystemEnum.default('metric'),
});

export type ProfileInput = z.infer<typeof profileSchema>;

// ============================================================
// FOOD
// ============================================================
export const foodSchema = z.object({
  barcode: z.string().max(50).nullable().optional(),
  name: z.string().min(1).max(200),
  brand: z.string().max(200).nullable().optional(),
  kcal_100g: z.number().min(0).max(900),
  protein_100g: z.number().min(0).max(100),
  carbs_100g: z.number().min(0).max(100),
  fat_100g: z.number().min(0).max(100),
  fiber_100g: z.number().min(0).max(100).nullable().optional(),
  sugar_100g: z.number().min(0).max(100).nullable().optional(),
  serving_g: z.number().positive().nullable().optional(),
  source: FoodSourceEnum.default('manual'),
  needs_review: z.boolean().default(false),
  review_reason: z.string().nullable().optional(),
}).refine(
  (data) => data.protein_100g + data.carbs_100g + data.fat_100g <= 102,
  { message: 'Sum of protein, carbs, and fat per 100g must not exceed 102g' }
).refine(
  (data) => !data.sugar_100g || !data.carbs_100g || data.sugar_100g <= data.carbs_100g,
  { message: 'Sugar per 100g cannot exceed carbs per 100g' }
).refine(
  (data) => !data.fiber_100g || !data.carbs_100g || data.fiber_100g <= data.carbs_100g,
  { message: 'Fiber per 100g cannot exceed carbs per 100g' }
);

export type FoodInput = z.infer<typeof foodSchema>;

// ============================================================
// FOOD LOG
// ============================================================
export const foodLogSchema = z.object({
  food_id: z.string().min(1, 'Valid food ID is required'),
  logged_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
  meal: MealEnum,
  quantity_g: z.number().positive().max(10000),
  client_id: z.string().min(1).max(100),
});

export type FoodLogInput = z.infer<typeof foodLogSchema>;

// ============================================================
// BODY WEIGHT
// ============================================================
export const bodyWeightSchema = z.object({
  measured_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
  weight_kg: z.number().positive().max(500),
});

export type BodyWeightInput = z.infer<typeof bodyWeightSchema>;

// ============================================================
// WORKOUT SESSION
// ============================================================
export const workoutSessionSchema = z.object({
  routine_id: z.string().min(1).nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
});

export type WorkoutSessionInput = z.infer<typeof workoutSessionSchema>;

// ============================================================
// WORKOUT SET
// ============================================================
export const workoutSetSchema = z.object({
  session_id: z.string().min(1, 'Valid session ID is required'),
  exercise_id: z.string().min(1, 'Valid exercise ID is required'),
  set_no: z.number().int().positive(),
  weight_kg: z.number().min(0).max(1000),
  reps: z.number().int().positive().max(100),
  rpe: z.number().min(1).step(0.5).nullable().optional(),
  is_warmup: z.boolean().default(false),
  client_id: z.string().min(1).max(100),
});

export type WorkoutSetInput = z.infer<typeof workoutSetSchema>;

// ============================================================
// EQUIPMENT
// ============================================================
export const equipmentSubmitSchema = z.object({
  name: z.string().min(1).max(200),
  muscle_group: z.string().min(1).max(100),
});

export const equipmentReviewSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  review_note: z.string().max(500).nullable().optional(),
});

export type EquipmentSubmitInput = z.infer<typeof equipmentSubmitSchema>;
export type EquipmentReviewInput = z.infer<typeof equipmentReviewSchema>;

// ============================================================
// AUTH
// ============================================================
export const signUpSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  display_name: z.string().min(1, 'Display name is required').max(100),
});

export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

export type SignUpInput = z.infer<typeof signUpSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
