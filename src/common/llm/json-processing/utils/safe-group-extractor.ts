/**
 * Utilities for safely extracting regex capture groups in sanitizer rules.
 *
 * These helpers eliminate repetitive null-coalescing boilerplate code that appears
 * throughout sanitizer rule definitions. Instead of writing:
 * ```typescript
 * const [delimiter, whitespace, value] = groups;
 * const delimiterStr = delimiter ?? "";
 * const whitespaceStr = whitespace ?? "";
 * const valueStr = value ?? "";
 * ```
 *
 * Rules can now use:
 * ```typescript
 * const [delimiter, whitespace, value] = safeGroups(groups, 3);
 * // All values are guaranteed to be strings (empty string if undefined)
 * ```
 */

/**
 * Safely extracts a single regex capture group at the specified index.
 * Returns empty string if the group is undefined or the index is out of bounds.
 *
 * @param groups - The capture groups array from a regex match
 * @param index - The index of the group to extract (0-based)
 * @returns The captured string, or empty string if undefined
 *
 * @example
 * ```typescript
 * const delimiter = safeGroup(groups, 0);
 * const whitespace = safeGroup(groups, 1);
 * ```
 */
export function safeGroup(groups: readonly (string | undefined)[], index: number): string {
  return groups[index] ?? "";
}

/**
 * Safely extracts multiple regex capture groups into an array of guaranteed strings.
 * All undefined values are converted to empty strings.
 *
 * @param groups - The capture groups array from a regex match
 * @param count - Number of groups to extract (starting from index 0)
 * @returns Array of strings with the requested number of elements
 *
 * @example
 * ```typescript
 * // Extract first 3 groups as guaranteed strings
 * const [delimiter, whitespace, value] = safeGroups(groups, 3);
 *
 * // All values are strings - no null coalescing needed
 * return `${delimiter}${whitespace}"${value}"`;
 * ```
 */
export function safeGroups(
  groups: readonly (string | undefined)[],
  count: number,
): readonly string[] {
  const result: string[] = [];
  for (let i = 0; i < count; i++) {
    result.push(groups[i] ?? "");
  }
  return result;
}

/**
 * Type-safe tuple extractor for exactly 3 capture groups.
 * Provides better type inference than the generic safeGroups function.
 *
 * @param groups - The capture groups array from a regex match
 * @returns Tuple of 3 guaranteed strings
 */
export function safeGroups3(
  groups: readonly (string | undefined)[],
): readonly [string, string, string] {
  return [groups[0] ?? "", groups[1] ?? "", groups[2] ?? ""];
}

/**
 * Type-safe tuple extractor for exactly 4 capture groups.
 * Provides better type inference than the generic safeGroups function.
 *
 * @param groups - The capture groups array from a regex match
 * @returns Tuple of 4 guaranteed strings
 */
export function safeGroups4(
  groups: readonly (string | undefined)[],
): readonly [string, string, string, string] {
  return [groups[0] ?? "", groups[1] ?? "", groups[2] ?? "", groups[3] ?? ""];
}

/**
 * Type-safe tuple extractor for exactly 5 capture groups.
 * Provides better type inference than the generic safeGroups function.
 *
 * @param groups - The capture groups array from a regex match
 * @returns Tuple of 5 guaranteed strings
 */
export function safeGroups5(
  groups: readonly (string | undefined)[],
): readonly [string, string, string, string, string] {
  return [groups[0] ?? "", groups[1] ?? "", groups[2] ?? "", groups[3] ?? "", groups[4] ?? ""];
}
