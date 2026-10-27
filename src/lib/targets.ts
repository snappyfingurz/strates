import type { ActivityLevel, Goal, Sex } from './types';

export interface TargetCalculationInput {
  sex: Sex;
  birthYear: number;
  heightCm: number;
  weightKg: number;
  activityLevel: ActivityLevel;
  goal: Goal;
}

export interface TargetCalculationResult {
  bmr: number;
  tdee: number;
  targetKcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  goalDeltaKcal: number;
}

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
};

const GOAL_CALORIE_DELTAS: Record<Goal, number> = {
  cut: -500,
  maintain: 0,
  bulk: 300,
};

// Protein multipliers in grams per kg of total bodyweight
const PROTEIN_PER_KG: Record<Goal, number> = {
  cut: 2.2,      // Higher protein to spare lean tissue in deficit
  maintain: 2.0, // Standard athletic requirement
  bulk: 1.8,     // Ample calories allow slightly lower g/kg ratio
};

/**
 * Calculates BMR using the Mifflin-St Jeor equation.
 * Male: 10 * weight(kg) + 6.25 * height(cm) - 5 * age + 5
 * Female: 10 * weight(kg) + 6.25 * height(cm) - 5 * age - 161
 */
export function calculateBMR(
  sex: Sex,
  weightKg: number,
  heightCm: number,
  age: number
): number {
  const safeAge = Math.max(15, Math.min(100, age));
  const base = 10 * weightKg + 6.25 * heightCm - 5 * safeAge;
  const result = sex === 'male' ? base + 5 : base - 161;
  return Math.round(result);
}

/**
 * Calculates Total Daily Energy Expenditure (TDEE).
 */
export function calculateTDEE(bmr: number, activityLevel: ActivityLevel): number {
  const multiplier = ACTIVITY_MULTIPLIERS[activityLevel] ?? 1.2;
  return Math.round(bmr * multiplier);
}

/**
 * Calculates tailored daily nutrition targets based on scientific formulas.
 */
export function calculateDailyTargets(input: TargetCalculationInput): TargetCalculationResult {
  const currentYear = new Date().getFullYear();
  const age = currentYear - input.birthYear;

  const bmr = calculateBMR(input.sex, input.weightKg, input.heightCm, age);
  const tdee = calculateTDEE(bmr, input.activityLevel);

  const delta = GOAL_CALORIE_DELTAS[input.goal] ?? 0;
  // Floor calories at safe minimum (1200 kcal)
  const targetKcal = Math.max(1200, Math.round(tdee + delta));

  // Protein target
  const proteinRatio = PROTEIN_PER_KG[input.goal] ?? 2.0;
  const proteinG = Math.round(input.weightKg * proteinRatio);

  // Fat target: ~25% of total calories, 9 kcal/g (floor at 0.7g/kg for hormone regulation)
  const fatCalories = targetKcal * 0.25;
  const minimumFatG = Math.round(input.weightKg * 0.7);
  const fatG = Math.max(minimumFatG, Math.round(fatCalories / 9));

  // Remainder to Carbs: (Total Kcal - Protein Kcal - Fat Kcal) / 4 kcal/g
  const proteinKcal = proteinG * 4;
  const fatKcal = fatG * 9;
  const remainingKcal = Math.max(0, targetKcal - proteinKcal - fatKcal);
  const carbsG = Math.round(remainingKcal / 4);

  return {
    bmr,
    tdee,
    targetKcal,
    proteinG,
    carbsG,
    fatG,
    goalDeltaKcal: delta,
  };
}
