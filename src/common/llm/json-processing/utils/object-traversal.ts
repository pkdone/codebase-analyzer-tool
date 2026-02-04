/**
 * Type alias for plain objects with string and symbol keys.
 * Used for objects that pass the isPlainObject type guard.
 */
type PlainObject = Record<string | symbol, unknown>;

/**
 * Type guard to check if a value is a plain object (not an array, not null, constructed by Object).
 * This narrows the type from unknown to a record type, allowing property access without casting.
 *
 * @param value - The value to check
 * @returns True if the value is a plain object, false otherwise
 */
export function isPlainObject(value: unknown): value is PlainObject {
  return value !== null && typeof value === "object" && value.constructor === Object;
}

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
 * Type for the visitor function used in deepMap and deepMapObject.
 */
export type DeepMapVisitor = (value: unknown, visited: WeakSet<object>) => unknown;

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
 * // Type-preserving transformation
 * interface MyData { items: string[]; count: number; }
 * const data: MyData = { items: ["a", "b"], count: 2 };
 * const result = deepMap(data, (val) => val); // result is MyData
 * ```
 */
export function deepMap<T>(value: T, visitor: DeepMapVisitor, visited?: WeakSet<object>): T;

/**
 * Implementation of deepMap.
 * Optimized to avoid unnecessary object allocation when nothing changes.
 */
export function deepMap(
  value: unknown,
  visitor: DeepMapVisitor,
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
    const mapped = value.map((item: unknown) => deepMap(item, visitor, visited));
    visited.delete(value);
    return mapped;
  }

  // Preserve special built-in objects (Date, RegExp, etc.) as-is
  // Only process plain objects from JSON.parse
  if (!isPlainObject(value)) {
    return visitor(value, visited);
  }

  // Handle plain objects - value is now narrowed to PlainObject
  visited.add(value);
  const result: PlainObject = {};
  let hasChanges = false;

  // Process string keys using for...in loop to avoid Object.entries allocation
  for (const key in value) {
    if (Object.hasOwn(value, key)) {
      const original = value[key];
      const transformed = deepMap(original, visitor, visited);
      result[key] = transformed;
      if (transformed !== original) {
        hasChanges = true;
      }
    }
  }

  // Handle symbol keys (preserve them as-is)
  const symbols = Object.getOwnPropertySymbols(value);
  for (const sym of symbols) {
    const original = value[sym];
    const transformed = deepMap(original, visitor, visited);
    result[sym] = transformed;
    if (transformed !== original) {
      hasChanges = true;
    }
  }

  visited.delete(value);

  // If nothing changed internally, pass the original value to the visitor
  // The visitor might still transform the object itself
  const sourceValue = hasChanges ? result : value;
  const visitorResult = visitor(sourceValue, visited);

  // If the visitor also returns the value unchanged, return original reference
  return visitorResult === sourceValue && !hasChanges ? value : visitorResult;
}

/**
 * Deep traversal utility with support for object key transformation and conditional inclusion.
 *
 * This is a specialized version of deepMap that allows transforming object keys
 * and conditionally including/excluding properties during traversal.
 *
 * @param value - The value to traverse
 * @param visitor - Function that transforms each value during traversal
 * @param options - Options for object key transformation and property inclusion
 * @param visited - WeakSet to track visited objects (for circular reference detection)
 * @returns The transformed value
 */
export function deepMapObject<T>(
  value: T,
  visitor: DeepMapVisitor,
  options?: DeepMapObjectOptions,
  visited?: WeakSet<object>,
): T;

/**
 * Implementation of deepMapObject.
 * Optimized to avoid unnecessary object allocation when nothing changes.
 */
export function deepMapObject(
  value: unknown,
  visitor: DeepMapVisitor,
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
    const mapped = visitedValue.map((item: unknown) =>
      deepMapObject(item, visitor, options, visited),
    );
    if (typeof value === "object" && value !== null) {
      visited.delete(value);
    }
    return mapped;
  }

  // Preserve special built-in objects (Date, RegExp, etc.) as-is
  // Only process plain objects from JSON.parse
  if (!isPlainObject(visitedValue)) {
    return visitedValue;
  }

  // Handle plain objects - visitedValue is now narrowed to PlainObject
  if (typeof value === "object" && value !== null) {
    visited.add(value);
  }
  const result: PlainObject = {};
  let hasChanges = visitedValue !== value; // Already changed if visitor transformed it
  let propertiesSkipped = false;

  // Process string keys with optional transformation using for...in loop to avoid Object.entries allocation
  for (const key in visitedValue) {
    if (Object.prototype.hasOwnProperty.call(visitedValue, key)) {
      const val = visitedValue[key];

      // Recursively process the value
      const transformedVal = deepMapObject(val, visitor, options, visited);

      // Check if property should be included
      if (options.shouldInclude && !options.shouldInclude(key, transformedVal)) {
        propertiesSkipped = true;
        continue;
      }

      // Transform key if needed
      let finalKey: string | null | undefined = key;
      if (options.transformKey) {
        finalKey = options.transformKey(key, transformedVal, visitedValue);
        if (finalKey === null || finalKey === undefined) {
          propertiesSkipped = true;
          continue; // Skip this property
        }
        if (finalKey !== key) {
          hasChanges = true;
        }
      }

      result[finalKey] = transformedVal;
      if (transformedVal !== val) {
        hasChanges = true;
      }
    }
  }

  // Handle symbol keys (preserve them as-is, no transformation)
  const symbols = Object.getOwnPropertySymbols(visitedValue);
  for (const sym of symbols) {
    const original = visitedValue[sym];
    const transformedVal = deepMapObject(original, visitor, options, visited);

    // Check if property should be included
    if (options.shouldInclude && !options.shouldInclude(String(sym), transformedVal)) {
      propertiesSkipped = true;
      continue;
    }

    result[sym] = transformedVal;
    if (transformedVal !== original) {
      hasChanges = true;
    }
  }

  if (typeof value === "object" && value !== null) {
    visited.delete(value);
  }

  // Return original object if nothing changed and no properties were skipped
  if (!hasChanges && !propertiesSkipped && isPlainObject(value)) {
    return value;
  }
  return result;
}
