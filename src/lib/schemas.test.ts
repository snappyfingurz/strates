import { describe, it, expect } from 'vitest';
import { foodSchema, profileSchema, workoutSetSchema } from './schemas';

describe('Zod schemas validation', () => {
  it('validates a correct food schema', () => {
    const valid = foodSchema.safeParse({
      name: 'Greek Yogurt 0%',
      kcal_100g: 59,
      protein_100g: 10,
      carbs_100g: 3.6,
      fat_100g: 0,
      serving_g: 170,
    });
    expect(valid.success).toBe(true);
  });

  it('rejects foods exceeding 102g of macros per 100g', () => {
    const invalid = foodSchema.safeParse({
      name: 'Impossible Bar',
      kcal_100g: 600,
      protein_100g: 50,
      carbs_100g: 50,
      fat_100g: 20, // sum = 120 > 102
    });
    expect(invalid.success).toBe(false);
  });

  it('validates profile inputs', () => {
    const valid = profileSchema.safeParse({
      display_name: 'Alex Lifter',
      sex: 'male',
      birth_year: 1996,
      height_cm: 182,
      activity_level: 'moderate',
      goal: 'bulk',
    });
    expect(valid.success).toBe(true);
  });

  it('validates workout set inputs and allows rpe > 10', () => {
    const valid = workoutSetSchema.safeParse({
      session_id: '99999999-9999-9999-9999-999999999999',
      exercise_id: '88888888-8888-8888-8888-888888888888',
      set_no: 1,
      weight_kg: 100,
      reps: 8,
      rpe: 12,
      is_warmup: false,
      client_id: 'local-set-1',
    });
    expect(valid.success).toBe(true);
  });
});
