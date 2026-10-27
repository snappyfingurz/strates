import { describe, it, expect } from 'vitest';
import {
  estimate1RM,
  checkIsPR,
  getProgressiveOverloadAdvice,
  calculateWorkoutVolume,
} from './workout';

describe('workout logic', () => {
  it('estimates 1RM accurately with 1 rep', () => {
    expect(estimate1RM(100, 1)).toBe(100);
  });

  it('estimates 1RM using Epley formula', () => {
    // 100kg x 10 reps -> 100 * (1 + 10/30) = 133.33 -> 133.3
    expect(estimate1RM(100, 10, 'epley')).toBe(133.3);
  });

  it('estimates 1RM using Brzycki formula', () => {
    // 100kg x 5 reps -> 100 / (1.0278 - 0.0278*5) = 100 / 0.8888 = 112.5
    expect(estimate1RM(100, 5, 'brzycki')).toBe(112.5);
  });

  it('identifies PRs correctly', () => {
    expect(checkIsPR(120, 115)).toBe(true);
    expect(checkIsPR(110, 115)).toBe(false);
    expect(checkIsPR(115, null)).toBe(true);
    expect(checkIsPR(0, 100)).toBe(false);
  });

  it('provides actionable progressive overload guidance', () => {
    // Exceeded high rep range (8-12) with 12 reps -> increase weight
    const topAdvice = getProgressiveOverloadAdvice(80, 12, 8, 12);
    expect(topAdvice.action).toBe('increase_weight');
    expect(topAdvice.suggestedWeightKg).toBe(82.5);

    // Below rep range with 6 reps -> decrease or maintain
    const lowAdvice = getProgressiveOverloadAdvice(80, 6, 8, 12);
    expect(lowAdvice.action).toBe('decrease_weight');

    // In the middle with 10 reps -> maintain weight
    const midAdvice = getProgressiveOverloadAdvice(80, 10, 8, 12);
    expect(midAdvice.action).toBe('maintain');
  });

  it('calculates total volume excluding warmup sets', () => {
    const sets = [
      { weight_kg: 50, reps: 10, is_warmup: true },
      { weight_kg: 100, reps: 8, is_warmup: false }, // 800
      { weight_kg: 100, reps: 7, is_warmup: false }, // 700
    ];
    expect(calculateWorkoutVolume(sets)).toBe(1500);
  });
});
