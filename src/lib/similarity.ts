/**
 * Text similarity utilities for fuzzy matching (replaces PostgreSQL pg_trgm extension).
 * Pure functions with zero database dependencies.
 */

/**
 * Normalizes a string for comparison:
 * - Lowercase
 * - Strips non-alphanumeric characters (except spaces)
 * - Collapses consecutive spaces
 */
export function normalizeName(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extracts character trigrams from a string padded with front and back spaces.
 */
export function getTrigrams(str: string): Set<string> {
  const normalized = normalizeName(str);
  const trigrams = new Set<string>();

  if (!normalized) return trigrams;

  // Pad string with spaces as in pg_trgm standard
  const padded = `  ${normalized} `;

  for (let i = 0; i < padded.length - 2; i++) {
    trigrams.add(padded.slice(i, i + 3));
  }

  return trigrams;
}

/**
 * Calculates trigram similarity between two strings using the Sørensen–Dice coefficient.
 * Returns a score between 0 (completely dissimilar) and 1 (identical).
 */
export function trigramSimilarity(str1: string, str2: string): number {
  const norm1 = normalizeName(str1);
  const norm2 = normalizeName(str2);

  if (norm1 === norm2) return 1.0;
  if (!norm1 || !norm2) return 0.0;

  const trigrams1 = getTrigrams(norm1);
  const trigrams2 = getTrigrams(norm2);

  let intersectionCount = 0;
  for (const tri of trigrams1) {
    if (trigrams2.has(tri)) {
      intersectionCount++;
    }
  }

  const total = trigrams1.size + trigrams2.size;
  if (total === 0) return 0.0;

  return Math.round(((2 * intersectionCount) / total) * 1000) / 1000;
}

/**
 * Calculates Levenshtein edit distance between two strings.
 */
export function levenshteinDistance(a: string, b: string): number {
  const s1 = normalizeName(a);
  const s2 = normalizeName(b);

  if (s1 === s2) return 0;
  if (s1.length === 0) return s2.length;
  if (s2.length === 0) return s1.length;

  const matrix: number[][] = [];

  for (let i = 0; i <= s2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= s1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= s2.length; i++) {
    for (let j = 1; j <= s1.length; j++) {
      if (s2.charAt(i - 1) === s1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[s2.length][s1.length];
}

/**
 * Calculates normalized Levenshtein similarity score between 0.0 and 1.0.
 */
export function levenshteinSimilarity(a: string, b: string): number {
  const s1 = normalizeName(a);
  const s2 = normalizeName(b);

  if (s1 === s2) return 1.0;
  const maxLen = Math.max(s1.length, s2.length);
  if (maxLen === 0) return 1.0;

  const distance = levenshteinDistance(s1, s2);
  return Math.round((1 - distance / maxLen) * 1000) / 1000;
}

/**
 * Checks if two equipment names are duplicates or close matches.
 * Returns combined similarity score and match boolean based on threshold (default 0.70).
 */
export function isEquipmentMatch(
  query: string,
  target: string,
  threshold = 0.7
): { score: number; isMatch: boolean } {
  const normQ = normalizeName(query);
  const normT = normalizeName(target);

  if (normQ === normT) {
    return { score: 1.0, isMatch: true };
  }

  const tokensQ = normQ.split(' ');
  const tokensT = normT.split(' ');

  // Word token containment check (e.g. "leg press" in "leg press 45 degree")
  const isSubset =
    tokensT.every((t) => tokensQ.includes(t)) ||
    tokensQ.every((t) => tokensT.includes(t));

  if (isSubset) {
    const minTokens = Math.min(tokensQ.length, tokensT.length);
    const maxTokens = Math.max(tokensQ.length, tokensT.length);
    if (minTokens / maxTokens >= 0.3) {
      return { score: 0.85, isMatch: true };
    }
  }

  const triScore = trigramSimilarity(query, target);
  const levScore = levenshteinSimilarity(query, target);

  // Blended score (trigram weighted 60%, levenshtein 40%)
  const score = Math.round((triScore * 0.6 + levScore * 0.4) * 1000) / 1000;

  return {
    score,
    isMatch: score >= threshold,
  };
}
