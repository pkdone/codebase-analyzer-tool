/**
 * Dynamic property name matching utility.
 * Provides schema-agnostic matching of truncated, typo'd, or corrupted property names
 * against a list of known property names.
 */

/**
 * Configuration for property name matching behavior.
 */
export interface PropertyMatcherConfig {
  /** Minimum length for a fragment to be considered for prefix matching */
  readonly minPrefixLength: number;
  /** Maximum Levenshtein distance allowed for fuzzy matching (use 0 for dynamic threshold) */
  readonly maxLevenshteinDistance: number;
  /** Minimum length for a fragment to be considered for fuzzy matching */
  readonly minFuzzyLength: number;
  /** Whether to perform case-insensitive matching */
  readonly caseInsensitive: boolean;
  /** Whether to normalize identifiers (camelCase/snake_case/kebab-case) before comparison */
  readonly normalizeIdentifiers: boolean;
  /** Minimum length for a fragment to be considered for contains matching */
  readonly minContainsLength: number;
  /** Whether to use dynamic Levenshtein threshold based on string length */
  readonly useDynamicLevenshteinThreshold: boolean;
}

/**
 * Default configuration for property name matching.
 */
export const DEFAULT_MATCHER_CONFIG: PropertyMatcherConfig = {
  minPrefixLength: 2,
  maxLevenshteinDistance: 2,
  minFuzzyLength: 4,
  caseInsensitive: true,
  normalizeIdentifiers: true,
  minContainsLength: 4,
  useDynamicLevenshteinThreshold: true,
};

/**
 * Calculates a dynamic Levenshtein distance threshold based on string length.
 * Longer strings can tolerate more edits while still being considered a match.
 *
 * @param length - The length of the string being matched
 * @param baseThreshold - The base threshold from config (used as minimum)
 * @returns The calculated threshold
 *
 * @example
 * calculateDynamicLevenshteinThreshold(4) // 2 (minimum)
 * calculateDynamicLevenshteinThreshold(8) // 2
 * calculateDynamicLevenshteinThreshold(12) // 3
 * calculateDynamicLevenshteinThreshold(20) // 4
 */
export function calculateDynamicLevenshteinThreshold(length: number, baseThreshold = 2): number {
  // For short strings (< 6 chars), use the base threshold
  if (length < 6) {
    return baseThreshold;
  }
  // For medium strings (6-10 chars), allow up to 2 edits
  if (length < 10) {
    return Math.max(baseThreshold, 2);
  }
  // For longer strings, allow ~20% of length as edits, capped at 5
  return Math.min(5, Math.max(baseThreshold, Math.floor(length * 0.2)));
}

/**
 * Normalizes an identifier by converting from various naming conventions to a common format.
 * Handles camelCase, PascalCase, snake_case, kebab-case, and mixed formats.
 *
 * @param identifier - The identifier to normalize
 * @returns Normalized identifier (lowercase, no separators)
 *
 * @example
 * normalizeIdentifier("userName") // "username"
 * normalizeIdentifier("user_name") // "username"
 * normalizeIdentifier("user-name") // "username"
 * normalizeIdentifier("UserName") // "username"
 */
export function normalizeIdentifier(identifier: string): string {
  if (!identifier) return "";

  // First, insert a separator before capital letters in camelCase/PascalCase
  // e.g., "userName" -> "user_Name", "APIEndpoint" -> "API_Endpoint"
  const withSeparators = identifier.replace(/([a-z])([A-Z])/g, "$1_$2");

  // Remove all separators (underscores and hyphens) and convert to lowercase
  return withSeparators.replace(/[-_]/g, "").toLowerCase();
}

/**
 * Result of a property name match attempt.
 */
export interface PropertyMatchResult {
  /** The matched property name, or undefined if no match */
  readonly matched: string | undefined;
  /** The type of match that was found */
  readonly matchType: "exact" | "prefix" | "suffix" | "contains" | "fuzzy" | "none";
  /** Confidence score (0-1) for the match */
  readonly confidence: number;
}

/**
 * Calculates the Levenshtein distance between two strings.
 * Used for fuzzy matching of property names with typos.
 *
 * @param str1 - First string
 * @param str2 - Second string
 * @returns The edit distance between the strings
 */
export function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;

  // Early exit for empty strings
  if (m === 0) return n;
  if (n === 0) return m;

  // Early exit: if length difference exceeds reasonable edit distance threshold,
  // return the length difference immediately. This avoids expensive computation
  // when the strings are clearly too different to match.
  const lengthDiff = Math.abs(m - n);
  if (lengthDiff > 3) return lengthDiff;

  // Use two rows instead of full matrix for memory efficiency
  let prevRow: number[] = new Array(n + 1).fill(0) as number[];
  let currRow: number[] = new Array(n + 1).fill(0) as number[];

  // Initialize first row
  for (let j = 0; j <= n; j++) {
    prevRow[j] = j;
  }

  for (let i = 1; i <= m; i++) {
    currRow[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      currRow[j] = Math.min(
        currRow[j - 1] + 1, // insertion
        prevRow[j] + 1, // deletion
        prevRow[j - 1] + cost, // substitution
      );
    }
    // Swap rows
    [prevRow, currRow] = [currRow, prevRow];
  }

  return prevRow[n];
}

/**
 * Attempts to match a fragment against known property names using multiple strategies.
 *
 * Matching strategies (in order of preference):
 * 1. Exact match (case-insensitive if configured)
 * 2. Prefix match - fragment is the start of a known property
 * 3. Suffix match - fragment is the end of a known property (for truncated starts)
 * 4. Normalized identifier match (camelCase/snake_case agnostic)
 * 5. Contains match - fragment appears in the middle of a known property
 * 6. Fuzzy match - Levenshtein distance within threshold (dynamic or fixed)
 *
 * @param fragment - The potentially corrupted property name fragment
 * @param knownProperties - List of valid property names to match against
 * @param config - Optional configuration for matching behavior
 * @returns The match result with the best matching property name
 */
export function matchPropertyName(
  fragment: string,
  knownProperties: readonly string[],
  config: Partial<PropertyMatcherConfig> = {},
): PropertyMatchResult {
  const opts = { ...DEFAULT_MATCHER_CONFIG, ...config };

  if (!fragment || knownProperties.length === 0) {
    return { matched: undefined, matchType: "none", confidence: 0 };
  }

  const normalizedFragment = opts.caseInsensitive ? fragment.toLowerCase() : fragment;

  // Strategy 1: Exact match
  for (const prop of knownProperties) {
    const normalizedProp = opts.caseInsensitive ? prop.toLowerCase() : prop;
    if (normalizedFragment === normalizedProp) {
      return { matched: prop, matchType: "exact", confidence: 1.0 };
    }
  }

  // Strategy 2: Prefix match (fragment is start of property)
  if (fragment.length >= opts.minPrefixLength) {
    const prefixMatches: { prop: string; length: number }[] = [];

    for (const prop of knownProperties) {
      const normalizedProp = opts.caseInsensitive ? prop.toLowerCase() : prop;
      if (normalizedProp.startsWith(normalizedFragment)) {
        prefixMatches.push({ prop, length: prop.length });
      }
    }

    // Return the shortest matching property (most specific match)
    if (prefixMatches.length > 0) {
      const sortedMatches = prefixMatches.toSorted((a, b) => a.length - b.length);
      const confidence = Math.min(0.9, fragment.length / sortedMatches[0].length + 0.3);
      return { matched: sortedMatches[0].prop, matchType: "prefix", confidence };
    }
  }

  // Strategy 3: Suffix match (fragment is end of property - for truncated starts)
  if (fragment.length >= opts.minPrefixLength) {
    const suffixMatches: { prop: string; length: number }[] = [];

    for (const prop of knownProperties) {
      const normalizedProp = opts.caseInsensitive ? prop.toLowerCase() : prop;
      if (normalizedProp.endsWith(normalizedFragment)) {
        suffixMatches.push({ prop, length: prop.length });
      }
    }

    if (suffixMatches.length > 0) {
      const sortedMatches = suffixMatches.toSorted((a, b) => a.length - b.length);
      const confidence = Math.min(0.85, fragment.length / sortedMatches[0].length + 0.2);
      return { matched: sortedMatches[0].prop, matchType: "suffix", confidence };
    }
  }

  // Strategy 4: Normalized identifier match (camelCase/snake_case agnostic)
  // e.g., "user_name" matches "userName", "UserName", "user-name"
  // Only applies when caseInsensitive is also true (normalization implies case-insensitivity)
  if (
    opts.normalizeIdentifiers &&
    opts.caseInsensitive &&
    fragment.length >= opts.minPrefixLength
  ) {
    const normalizedSearchFragment = normalizeIdentifier(fragment);

    for (const prop of knownProperties) {
      const normalizedProp = normalizeIdentifier(prop);
      if (normalizedSearchFragment === normalizedProp) {
        // Return with high confidence since the normalized forms match exactly
        return { matched: prop, matchType: "fuzzy", confidence: 0.9 };
      }
    }

    // Also try prefix match on normalized identifiers
    const normalizedPrefixMatches: { prop: string; length: number }[] = [];
    for (const prop of knownProperties) {
      const normalizedProp = normalizeIdentifier(prop);
      if (normalizedProp.startsWith(normalizedSearchFragment)) {
        normalizedPrefixMatches.push({ prop, length: prop.length });
      }
    }

    if (normalizedPrefixMatches.length > 0) {
      const sortedMatches = normalizedPrefixMatches.toSorted((a, b) => a.length - b.length);
      const confidence = Math.min(
        0.85,
        normalizedSearchFragment.length / normalizeIdentifier(sortedMatches[0].prop).length + 0.2,
      );
      return { matched: sortedMatches[0].prop, matchType: "prefix", confidence };
    }
  }

  // Strategy 5: Contains match (fragment appears in the middle of a property)
  // Useful for medium-length fragments that are not at the start or end
  if (fragment.length >= opts.minContainsLength) {
    const containsMatches: { prop: string; length: number; index: number }[] = [];

    for (const prop of knownProperties) {
      const normalizedProp = opts.caseInsensitive ? prop.toLowerCase() : prop;
      const index = normalizedProp.indexOf(normalizedFragment);
      // Only match if fragment is truly "contained" (not at start or end)
      if (index > 0 && index + normalizedFragment.length < normalizedProp.length) {
        containsMatches.push({ prop, length: prop.length, index });
      }
    }

    if (containsMatches.length > 0) {
      // Prefer shorter properties (more specific match) and earlier position
      const sortedMatches = containsMatches.toSorted((a, b) => {
        if (a.length !== b.length) return a.length - b.length;
        return a.index - b.index;
      });
      // Lower confidence than prefix/suffix since position is ambiguous
      const confidence = Math.min(0.75, fragment.length / sortedMatches[0].length + 0.1);
      return { matched: sortedMatches[0].prop, matchType: "contains", confidence };
    }
  }

  // Strategy 6: Fuzzy match using Levenshtein distance
  if (fragment.length >= opts.minFuzzyLength) {
    // Calculate the effective threshold - dynamic or fixed
    const effectiveThreshold = opts.useDynamicLevenshteinThreshold
      ? calculateDynamicLevenshteinThreshold(fragment.length, opts.maxLevenshteinDistance)
      : opts.maxLevenshteinDistance;

    let bestMatch: { prop: string; distance: number } | undefined;

    for (const prop of knownProperties) {
      const normalizedProp = opts.caseInsensitive ? prop.toLowerCase() : prop;

      // Skip if length difference is too large (use max of fragment and prop length for threshold)
      const maxLength = Math.max(normalizedFragment.length, normalizedProp.length);
      const dynamicThresholdForPair = opts.useDynamicLevenshteinThreshold
        ? calculateDynamicLevenshteinThreshold(maxLength, opts.maxLevenshteinDistance)
        : opts.maxLevenshteinDistance;

      if (Math.abs(normalizedFragment.length - normalizedProp.length) > dynamicThresholdForPair) {
        continue;
      }

      const distance = levenshteinDistance(normalizedFragment, normalizedProp);
      if (distance <= effectiveThreshold) {
        if (!bestMatch || distance < bestMatch.distance) {
          bestMatch = { prop, distance };
        }
      }
    }

    if (bestMatch) {
      const maxDistance = Math.max(fragment.length, bestMatch.prop.length);
      const confidence = Math.max(0.5, 1 - bestMatch.distance / maxDistance);
      return { matched: bestMatch.prop, matchType: "fuzzy", confidence };
    }
  }

  return { matched: undefined, matchType: "none", confidence: 0 };
}

/**
 * Checks if a string looks like a valid JSON property name identifier.
 * Used to filter out obvious non-property-name content.
 *
 * @param str - The string to check
 * @returns True if the string looks like a valid identifier
 */
export function looksLikePropertyName(str: string): boolean {
  if (!str || str.length === 0) return false;

  // Must start with letter, underscore, or dollar sign
  // Can contain letters, digits, underscores, dollar signs
  // Common JSON property patterns also allow dots and hyphens in some cases
  return /^[a-zA-Z_$][a-zA-Z0-9_$.-]*$/.test(str);
}

/**
 * Checks if a string looks like a dot-separated identifier (e.g., package name).
 * This is a generic check that doesn't rely on specific package prefixes.
 *
 * @param str - The string to check
 * @returns True if the string looks like a dot-separated identifier
 */
export function looksLikeDotSeparatedIdentifier(str: string): boolean {
  if (!str || str.length < 3) return false;

  // Must contain at least one dot
  if (!str.includes(".")) return false;

  // Each segment must be a valid identifier
  const segments = str.split(".");
  if (segments.length < 2) return false;

  return segments.every((segment) => /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(segment));
}

/**
 * Common short property name fragments that are frequently truncated.
 * These are generic patterns that don't depend on a specific schema.
 */
export const COMMON_SHORT_FRAGMENTS: Readonly<Record<string, readonly string[]>> = {
  // Single/double letter fragments often map to common property names
  n: ["name"],
  na: ["name"],
  ty: ["type"],
  va: ["value"],
  id: ["id"],
  // Truncated endings that often indicate specific properties
  es: ["values", "types", "names", "codeSmells"],
  ue: ["value", "true"],
  pe: ["type", "scope"],
};

/**
 * Attempts to infer a property name from a very short fragment using common patterns.
 * This is used as a fallback when the fragment is too short for prefix/fuzzy matching.
 *
 * @param fragment - The short fragment (1-2 characters)
 * @param knownProperties - Optional list of known properties to validate against
 * @returns The inferred property name or undefined
 */
export function inferFromShortFragment(
  fragment: string,
  knownProperties?: readonly string[],
): string | undefined {
  const lowerFragment = fragment.toLowerCase();

  // Check if the fragment exists as a key before accessing
  if (!(lowerFragment in COMMON_SHORT_FRAGMENTS)) {
    return undefined;
  }

  const candidates = COMMON_SHORT_FRAGMENTS[lowerFragment];

  // If we have known properties, find the first candidate that matches
  if (knownProperties && knownProperties.length > 0) {
    const knownLower = new Set(knownProperties.map((p) => p.toLowerCase()));
    for (const candidate of candidates) {
      if (knownLower.has(candidate.toLowerCase())) {
        // Return the original casing from knownProperties
        const match = knownProperties.find((p) => p.toLowerCase() === candidate.toLowerCase());
        return match ?? candidate;
      }
    }
  }

  // Default to first candidate if no known properties match
  return candidates[0];
}
