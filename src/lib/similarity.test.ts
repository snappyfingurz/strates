import { describe, it, expect } from 'vitest';
import {
  normalizeName,
  trigramSimilarity,
  levenshteinDistance,
  levenshteinSimilarity,
  isEquipmentMatch,
} from './similarity';

describe('similarity matching', () => {
  it('normalizes names by stripping special characters and lowercasing', () => {
    expect(normalizeName('  Incline-Chest-Press (Machine)  ')).toBe('incline chest press machine');
    expect(normalizeName('')).toBe('');
  });

  it('computes accurate Levenshtein distance', () => {
    expect(levenshteinDistance('barbell', 'barbell')).toBe(0);
    expect(levenshteinDistance('barbell', 'dumbbell')).toBe(4);
    expect(levenshteinDistance('', 'bench')).toBe(5);
  });

  it('computes Levenshtein similarity between 0 and 1', () => {
    expect(levenshteinSimilarity('barbell', 'barbell')).toBe(1.0);
    expect(levenshteinSimilarity('cable', 'table')).toBe(0.8);
  });

  it('computes trigram similarity for similar equipment names', () => {
    const identical = trigramSimilarity('Cable Crossover', 'cable crossover');
    expect(identical).toBe(1.0);

    const similar = trigramSimilarity('Leg Press Machine', 'Leg Press');
    expect(similar).toBeGreaterThan(0.5);

    const different = trigramSimilarity('Squat Rack', 'Lat Pulldown');
    expect(different).toBeLessThan(0.3);
  });

  it('detects equipment duplicates with isEquipmentMatch', () => {
    const match1 = isEquipmentMatch('Smith Machine', 'smith machine');
    expect(match1.isMatch).toBe(true);
    expect(match1.score).toBe(1.0);

    const match2 = isEquipmentMatch('Leg Press 45 Degree', 'Leg Press');
    expect(match2.isMatch).toBe(true);

    const nonMatch = isEquipmentMatch('Dumbbell Bench', 'Seated Row Cable');
    expect(nonMatch.isMatch).toBe(false);
  });
});
