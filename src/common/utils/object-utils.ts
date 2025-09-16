/**
 * Helper function to safely get a nested property value from an object using a dot-notation path.
 * Uses modern JavaScript features for cleaner implementation.
 * @param obj The object to extract the value from
 * @param path The dot-notation path (e.g., "response.choices[0].message.content")
 * @returns The value at the specified path, or undefined if not found
 */
export function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce((current: unknown, key: string) => {
    if (current == null) return undefined;

    const arrayMatch = /^(\w+)\[(\d+)\]$/.exec(key);
    if (arrayMatch) {
      const [, arrayKey, index] = arrayMatch;
      const currentObj = current as Record<string, unknown>;
      const arrayValue = currentObj[arrayKey];
      if (Array.isArray(arrayValue)) {
        return arrayValue[parseInt(index, 10)];
      }
      return undefined;
    }

    const currentObj = current as Record<string, unknown>;
    return currentObj[key];
  }, obj);
}

/**
 * Helper function to get a nested property value from an object using multiple fallback paths.
 * Tries each path in order and returns the first non-null/non-undefined value found.
 * @param obj The object to extract the value from
 * @param paths Array of dot-notation paths to try in order
 * @returns The first value found at any of the specified paths, or undefined if none found
 */
export function getNestedValueWithFallbacks(
  obj: Record<string, unknown>,
  paths: string[],
): unknown {
  for (const path of paths) {
    const value = getNestedValue(obj, path);
    if (value !== null && value !== undefined) {
      return value;
    }
  }
  return undefined;
}
