/**
 * Options for deep traversal with object transformation.
 */
export interface DeepMapObjectOptions {
  /**
   * Transform a key before processing its value.
   * Return the new key, or null/undefined to skip the property.
   */
  transformKey?: (
    key: string,
    value: unknown,
    obj: Record<string, unknown>,
  ) => string | null | undefined;
  /**
   * Determine if a property should be included in the result.
   * Return false to omit the property.
   */
  shouldInclude?: (key: string, value: unknown) => boolean;
}

/**
 * Generic deep traversal utility for JSON transformations.
 *
 * This utility provides a reusable pattern for recursively traversing JSON objects
 * and arrays while handling:
 * - Circular references (using WeakSet)
 * - Arrays (mapping over elements)
 * - Plain objects (processing string and symbol keys)
 * - Special built-in objects (preserved as-is)
 *
 * The visitor function receives the current value and the visited WeakSet,
 * allowing it to perform transformations while maintaining circular reference safety.
 *
 * @template T - The expected return type
 * @param value - The value to traverse (can be any JSON-serializable type)
 * @param visitor - Function that transforms each value during traversal
 * @param visited - WeakSet to track visited objects (for circular reference detection)
 * @returns The transformed value
 *
 * @example
 * ```typescript
 * // Convert all null values to undefined
 * const result = deepMap(data, (val) => val === null ? undefined : val);
 *
 * // Coerce string values to arrays for specific properties
 * const result = deepMap(data, (val, visited) => {
 *   if (typeof val === 'object' && val !== null && !visited.has(val)) {
 *     // Custom transformation logic
 *   }
 *   return val;
 * });
 * ```
 */
export function deepMap(
  value: unknown,
  visitor: (value: unknown, visited: WeakSet<object>) => unknown,
  visited = new WeakSet<object>(),
): unknown {
  // Handle primitives and null
  if (value === null || typeof value !== "object") {
    return visitor(value, visited);
  }

  // Prevent infinite recursion on circular references
  if (visited.has(value)) {
    return value;
  }

  // Handle arrays
  if (Array.isArray(value)) {
    visited.add(value);
    const mapped = value.map((item) => deepMap(item, visitor, visited));
    visited.delete(value);
    return mapped;
  }

  // Preserve special built-in objects (Date, RegExp, etc.) as-is
  // Only process plain objects from JSON.parse
  if (value.constructor !== Object) {
    return visitor(value, visited);
  }

  // Handle plain objects
  visited.add(value);
  const obj = value as Record<string | symbol, unknown>;
  const result: Record<string | symbol, unknown> = {};

  // Process string keys
  for (const [key, val] of Object.entries(obj)) {
    result[key] = deepMap(val, visitor, visited);
  }

  // Handle symbol keys (preserve them as-is)
  const symbols = Object.getOwnPropertySymbols(obj);
  for (const sym of symbols) {
    const symObj = obj as Record<symbol, unknown>;
    const resultSym = result as Record<symbol, unknown>;
    resultSym[sym] = deepMap(symObj[sym], visitor, visited);
  }

  visited.delete(value);
  return visitor(result, visited);
}

/**
 * Deep traversal utility with support for object key transformation and conditional inclusion.
 *
 * This is a specialized version of deepMap that allows transforming object keys
 * and conditionally including/excluding properties during traversal.
 *
 * @template T - The expected return type
 * @param value - The value to traverse
 * @param visitor - Function that transforms each value during traversal
 * @param options - Options for object key transformation and property inclusion
 * @param visited - WeakSet to track visited objects (for circular reference detection)
 * @returns The transformed value
 */
export function deepMapObject(
  value: unknown,
  visitor: (value: unknown, visited: WeakSet<object>) => unknown,
  options: DeepMapObjectOptions = {},
  visited = new WeakSet<object>(),
): unknown {
  // First apply visitor to the value
  const visitedValue = visitor(value, visited);

  // Handle primitives and null after visitor transformation
  if (visitedValue === null || typeof visitedValue !== "object") {
    return visitedValue;
  }

  // Prevent infinite recursion on circular references
  if (typeof value === "object" && value !== null && visited.has(value)) {
    return visitedValue;
  }

  // Handle arrays
  if (Array.isArray(visitedValue)) {
    if (typeof value === "object" && value !== null) {
      visited.add(value);
    }
    const mapped = visitedValue.map((item) => deepMapObject(item, visitor, options, visited));
    if (typeof value === "object" && value !== null) {
      visited.delete(value);
    }
    return mapped;
  }

  // Preserve special built-in objects (Date, RegExp, etc.) as-is
  // Only process plain objects from JSON.parse
  if (visitedValue.constructor !== Object) {
    return visitedValue;
  }

  // Handle plain objects
  if (typeof value === "object" && value !== null) {
    visited.add(value);
  }
  const obj = visitedValue as Record<string | symbol, unknown>;
  const result: Record<string | symbol, unknown> = {};

  // Process string keys with optional transformation
  for (const [key, val] of Object.entries(obj)) {
    // Recursively process the value
    const transformedVal = deepMapObject(val, visitor, options, visited);

    // Check if property should be included
    if (options.shouldInclude && !options.shouldInclude(key, transformedVal)) {
      continue;
    }

    // Transform key if needed
    let finalKey: string | null | undefined = key;
    if (options.transformKey) {
      finalKey = options.transformKey(key, transformedVal, obj);
      if (finalKey === null || finalKey === undefined) {
        continue; // Skip this property
      }
    }

    result[finalKey] = transformedVal;
  }

  // Handle symbol keys (preserve them as-is, no transformation)
  const symbols = Object.getOwnPropertySymbols(obj);
  for (const sym of symbols) {
    const symObj = obj as Record<symbol, unknown>;
    const resultSym = result as Record<symbol, unknown>;
    const transformedVal = deepMapObject(symObj[sym], visitor, options, visited);

    // Check if property should be included
    if (options.shouldInclude && !options.shouldInclude(String(sym), transformedVal)) {
      continue;
    }

    resultSym[sym] = transformedVal;
  }

  if (typeof value === "object" && value !== null) {
    visited.delete(value);
  }
  return result;
}
