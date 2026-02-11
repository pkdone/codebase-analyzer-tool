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
 * Rules can now use the generic tuple extractor:
 * ```typescript
 * const [delimiter, whitespace, value] = getSafeGroups(groups, 3);
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
  return groups.at(index) ?? "";
}

/**
 * Generic tuple extractor for a specified number of capture groups.
 * Extracts `count` groups from the match, defaulting each to empty string if undefined.
 *
 * @param groups - The capture groups array from a regex match
 * @param count - The number of groups to extract
 * @returns An array of `count` guaranteed strings
 *
 * @example
 * ```typescript
 * const [delimiter, whitespace, value] = getSafeGroups(groups, 3);
 * const [a, b, c, d] = getSafeGroups(groups, 4);
 * ```
 */
export function getSafeGroups(groups: readonly (string | undefined)[], count: number): string[] {
  const result: string[] = [];
  for (let i = 0; i < count; i++) {
    result.push(groups.at(i) ?? "");
  }
  return result;
}
