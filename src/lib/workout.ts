export type OneRMFormula = 'epley' | 'brzycki';

/**
 * Calculates estimated One-Rep Max (1RM).
 * Epley formula: weight * (1 + reps / 30)
 * Brzycki formula: reps === 1 ? weight : weight / (1.0278 - 0.0278 * reps)
 */
export function estimate1RM(
  weightKg: number,
  reps: number,
  formula: OneRMFormula = 'epley'
): number {
  if (weightKg <= 0 || reps <= 0) return 0;
  if (reps === 1) return Math.round(weightKg * 10) / 10;

  let est = 0;
  if (formula === 'brzycki') {
    // Brzycki is most accurate for reps <= 10; clamp at 10 to avoid denominator <= 0
    const clampedReps = Math.min(reps, 10);
    const denominator = 1.0278 - 0.0278 * clampedReps;
    est = denominator > 0 ? weightKg / denominator : weightKg;
  } else {
    // Epley formula
    est = weightKg * (1 + reps / 30);
  }

  return Math.round(est * 10) / 10;
}

/**
 * Determines if a new estimated 1RM qualifies as a personal record (PR).
 */
export function checkIsPR(newEst1RM: number, previousBest1RM: number | null | undefined): boolean {
  if (newEst1RM <= 0) return false;
  if (!previousBest1RM || previousBest1RM <= 0) return true;
  return newEst1RM > previousBest1RM;
}

export interface OverloadGuidance {
  action: 'increase_weight' | 'maintain' | 'decrease_weight';
  suggestedWeightKg: number;
  message: string;
}

/**
 * Provides actionable progressive overload guidance based on target rep ranges.
 */
export function getProgressiveOverloadAdvice(
  currentWeightKg: number,
  repsAchieved: number,
  repRangeLow: number,
  repRangeHigh: number
): OverloadGuidance {
  if (repsAchieved >= repRangeHigh) {
    // Top of range hit: recommend a standard 2.5kg increment (or 1.25kg microplates)
    const increment = currentWeightKg >= 100 ? 5 : 2.5;
    const nextWeight = currentWeightKg + increment;
    return {
      action: 'increase_weight',
      suggestedWeightKg: nextWeight,
      message: `Great job hitting ${repsAchieved} reps! Increase weight to ${nextWeight} kg next session.`,
    };
  }

  if (repsAchieved < repRangeLow) {
    // Below target rep range: recommend slight drop or focus on form
    const nextWeight = Math.max(0, currentWeightKg - 2.5);
    return {
      action: 'decrease_weight',
      suggestedWeightKg: nextWeight,
      message: `Reps (${repsAchieved}) were below the target minimum of ${repRangeLow}. Consider ${nextWeight} kg to build volume.`,
    };
  }

  return {
    action: 'maintain',
    suggestedWeightKg: currentWeightKg,
    message: `Within target rep range (${repRangeLow}-${repRangeHigh}). Repeat ${currentWeightKg} kg until reaching ${repRangeHigh} reps.`,
  };
}

/**
 * Calculates total working volume (weight * reps, excluding warmups).
 */
export function calculateWorkoutVolume(
  sets: Array<{ weight_kg: number; reps: number; is_warmup?: boolean }>
): number {
  return sets
    .filter((s) => !s.is_warmup)
    .reduce((total, s) => total + (s.weight_kg * s.reps), 0);
}
