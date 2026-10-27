import { describe, it, expect } from 'vitest';
import {
  calculatePortionNutrition,
  validateMacroSum,
  calculateExpectedCalories,
  checkCalorieDiscrepancy,
} from './nutrition';

describe('nutrition logic', () => {
  const chickenBreast = {
    kcal_100g: 165,
    protein_100g: 31,
    carbs_100g: 0,
    fat_100g: 3.6,
    fiber_100g: 0,
    sugar_100g: 0,
  };

  it('scales nutrients proportionally to portion size', () => {
    const macros = calculatePortionNutrition(chickenBreast, 200);
    expect(macros.kcal).toBe(330);
    expect(macros.protein).toBe(62);
    expect(macros.carbs).toBe(0);
    expect(macros.fat).toBe(7.2);
  });

  it('handles zero or negative portions gracefully', () => {
    const macros = calculatePortionNutrition(chickenBreast, 0);
    expect(macros.kcal).toBe(0);
    expect(macros.protein).toBe(0);
  });

  it('validates macro sum per 100g', () => {
    expect(validateMacroSum(30, 40, 20)).toBe(true); // 90g <= 102
    expect(validateMacroSum(50, 40, 20)).toBe(false); // 110g > 102
    expect(validateMacroSum(-5, 40, 20)).toBe(false);
  });

  it('calculates expected Atwater calories', () => {
    // 30g P (120) + 50g C (200) + 10g F (90) = 410 kcal
    expect(calculateExpectedCalories(30, 50, 10)).toBe(410);
  });

  it('detects calorie discrepancies correctly', () => {
    // Expected: 410, Reported: 415 -> <15% diff
    const ok = checkCalorieDiscrepancy(415, 30, 50, 10);
    expect(ok.hasDiscrepancy).toBe(false);

    // Expected: 410, Reported: 200 -> large diff
    const bad = checkCalorieDiscrepancy(200, 30, 50, 10);
    expect(bad.hasDiscrepancy).toBe(true);
  });
});
