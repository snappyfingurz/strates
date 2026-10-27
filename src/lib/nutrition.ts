import type { Food } from './types';

export interface PortionMacros {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number | null;
  sugar: number | null;
}

/**
 * Calculates scaled macronutrients and calories for a given portion in grams
 * based on the 100g nutritional profile.
 */
export function calculatePortionNutrition(
  food: Pick<Food, 'kcal_100g' | 'protein_100g' | 'carbs_100g' | 'fat_100g' | 'fiber_100g' | 'sugar_100g'>,
  quantityG: number
): PortionMacros {
  if (quantityG <= 0) {
    return {
      kcal: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: null,
      sugar: null,
    };
  }

  const factor = quantityG / 100;

  return {
    kcal: Math.round(food.kcal_100g * factor * 10) / 10,
    protein: Math.round(food.protein_100g * factor * 10) / 10,
    carbs: Math.round(food.carbs_100g * factor * 10) / 10,
    fat: Math.round(food.fat_100g * factor * 10) / 10,
    fiber: food.fiber_100g !== null && food.fiber_100g !== undefined
      ? Math.round(food.fiber_100g * factor * 10) / 10
      : null,
    sugar: food.sugar_100g !== null && food.sugar_100g !== undefined
      ? Math.round(food.sugar_100g * factor * 10) / 10
      : null,
  };
}

/**
 * Checks whether the physical sum of macronutrients (protein + carbs + fat)
 * is chemically plausible per 100g (allowing a slight 2g margin for measurement errors, up to 102g).
 */
export function validateMacroSum(protein: number, carbs: number, fat: number): boolean {
  if (protein < 0 || carbs < 0 || fat < 0) return false;
  return protein + carbs + fat <= 102;
}

/**
 * Calculates expected calories using standard Atwater general factors:
 * - Protein: 4 kcal/g
 * - Carbohydrates: 4 kcal/g
 * - Fat: 9 kcal/g
 */
export function calculateExpectedCalories(protein: number, carbs: number, fat: number): number {
  const p = Math.max(0, protein);
  const c = Math.max(0, carbs);
  const f = Math.max(0, fat);
  return Math.round((p * 4 + c * 4 + f * 9) * 10) / 10;
}

/**
 * Checks if the reported calories deviate significantly (>15%) from the Atwater macro estimation.
 */
export function checkCalorieDiscrepancy(
  reportedKcal: number,
  protein: number,
  carbs: number,
  fat: number,
  thresholdPercent = 15
): { hasDiscrepancy: boolean; expectedKcal: number; diffPercent: number } {
  const expectedKcal = calculateExpectedCalories(protein, carbs, fat);
  if (expectedKcal === 0 && reportedKcal === 0) {
    return { hasDiscrepancy: false, expectedKcal: 0, diffPercent: 0 };
  }

  const denominator = Math.max(expectedKcal, reportedKcal, 1);
  const diff = Math.abs(reportedKcal - expectedKcal);
  const diffPercent = Math.round((diff / denominator) * 100 * 10) / 10;

  return {
    hasDiscrepancy: diffPercent > thresholdPercent,
    expectedKcal,
    diffPercent,
  };
}
