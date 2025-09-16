/**
 * Helper function to safely get a nested property value from an object using a dot-notation path.
 * Uses modern JavaScript features for cleaner implementation.
 * @param obj The object to extract the value from
 * @param path The dot-notation path (e.g., "response.choices[0].message.content")
 * @returns The value at the specified path, or undefined if not found
 */
export function getNestedValue<T = unknown>(obj: unknown, path: string): T | undefined {
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

  return current as T | undefined;
}

/**
 * Helper function to get a nested property value from an object using multiple fallback paths.
 * Tries each path in order and returns the first non-null/non-undefined value found.
 * @param obj The object to extract the value from
 * @param paths Array of dot-notation paths to try in order
 * @returns The first value found at any of the specified paths, or undefined if none found
 */
export function getNestedValueWithFallbacks<T = unknown>(
  obj: unknown,
  paths: string[],
): T | undefined {
  for (const path of paths) {
    const value = getNestedValue<T>(obj, path);
    if (value !== null && value !== undefined) {
      return value;
    }
  }
  return undefined;
}
