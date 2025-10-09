/**
 * Helper function to safely get a nested property value from an object using a dot-notation path.
 * Uses modern JavaScript features for cleaner implementation.
 * Returns unknown to force callers to validate the type with a type guard.
 * @param obj The object to extract the value from
 * @param path The dot-notation path (e.g., "response.choices[0].message.content")
 * @returns The value at the specified path as unknown, or undefined if not found
 */
export function getNestedValue(obj: unknown, path: string): unknown {
  if (path === "") return undefined;
  if (path.includes("][")) return undefined; // Double bracket notation not supported
  const normalizedPath = path.replace(/\[(\d+)\]/g, ".$1"); // Normalize path: 'choices[0].message' -> 'choices.0.message'
  const keys = normalizedPath.split(".").filter(Boolean); // filter(Boolean) removes empty strings
  let current: unknown = obj;

  for (const key of keys) {
    if (current === null || typeof current !== "object") {
      return undefined;
    }

    current = (current as Record<string, unknown>)[key];
  }

  return current;
}

/**
 * Helper function to get a nested property value from an object using multiple fallback paths.
 * Tries each path in order and returns the first non-null/non-undefined value found.
 * Returns unknown to force callers to validate the type with a type guard.
 * @param obj The object to extract the value from
 * @param paths Array of dot-notation paths to try in order
 * @returns The first value found at any of the specified paths as unknown, or undefined if none found
 */
export function getNestedValueWithFallbacks(obj: unknown, paths: string[]): unknown {
  for (const path of paths) {
    const value = getNestedValue(obj, path);
    if (value !== null && value !== undefined) {
      return value;
    }
  }
  return undefined;
}
