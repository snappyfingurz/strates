import { describe, it, expect } from 'vitest';
import { calculateBMR, calculateTDEE, calculateDailyTargets } from './targets';

describe('targets logic', () => {
  it('calculates BMR using Mifflin-St Jeor equation for male and female', () => {
    // Male: 80kg, 180cm, 30yo -> 10*80 + 6.25*180 - 5*30 + 5 = 800 + 1125 - 150 + 5 = 1780
    const bmrMale = calculateBMR('male', 80, 180, 30);
    expect(bmrMale).toBe(1780);

    // Female: 60kg, 165cm, 25yo -> 10*60 + 6.25*165 - 5*25 - 161 = 600 + 1031.25 - 125 - 161 = 1345.25 -> 1345
    const bmrFemale = calculateBMR('female', 60, 165, 25);
    expect(bmrFemale).toBe(1345);
  });

  it('calculates TDEE using activity multipliers', () => {
    const bmr = 1800;
    expect(calculateTDEE(bmr, 'sedentary')).toBe(2160);
    expect(calculateTDEE(bmr, 'moderate')).toBe(2790);
  });

  it('calculates daily targets with appropriate deficit for cut', () => {
    const targets = calculateDailyTargets({
      sex: 'male',
      birthYear: 1995,
      heightCm: 180,
      weightKg: 85,
      activityLevel: 'moderate',
      goal: 'cut',
    });

    expect(targets.goalDeltaKcal).toBe(-500);
    expect(targets.targetKcal).toBeLessThan(targets.tdee);
    expect(targets.proteinG).toBe(Math.round(85 * 2.2)); // 2.2g/kg for cut
    expect(targets.fatG).toBeGreaterThan(0);
    expect(targets.carbsG).toBeGreaterThan(0);
  });

  it('calculates surplus for bulk and standard maintenance', () => {
    const bulkTargets = calculateDailyTargets({
      sex: 'male',
      birthYear: 2000,
      heightCm: 175,
      weightKg: 75,
      activityLevel: 'active',
      goal: 'bulk',
    });
    expect(bulkTargets.goalDeltaKcal).toBe(300);
    expect(bulkTargets.targetKcal).toBeGreaterThan(bulkTargets.tdee);
  });
});
