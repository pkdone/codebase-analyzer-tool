/**
 * Schema fixing transformation that removes incomplete/truncated items from arrays.
 *
 * LLMs sometimes run out of tokens mid-response, leaving array items incomplete
 * (missing required properties that sibling items have). This transform detects
 * and removes such truncated items from the end of arrays.
 *
 * Detection heuristics:
 * - Only examines arrays of plain objects
 * - Compares property counts of items to their siblings
 * - Items at the end with significantly fewer properties (< 50% of average) are removed
 * - Only removes from the end of arrays (not middle) to preserve intentionally sparse items
 *
 * Example:
 *   Input: {
 *     items: [
 *       { name: "item1", description: "desc1", value: 1 },
 *       { name: "item2", description: "desc2", value: 2 },
 *       { name: "item3" }  // Truncated - missing description and value
 *     ]
 *   }
 *   Output: {
 *     items: [
 *       { name: "item1", description: "desc1", value: 1 },
 *       { name: "item2", description: "desc2", value: 2 }
 *     ]
 *   }
 */

import { isPlainObject } from "../utils/object-traversal.js";

/**
 * Minimum number of items required in an array before we consider removing incomplete items.
 * Single-item arrays are never modified since we have no siblings for comparison.
 */
const MIN_ITEMS_FOR_REMOVAL = 2;

/**
 * Threshold ratio for determining if an item is incomplete.
 * Items with property count less than this ratio of the average are considered truncated.
 */
const INCOMPLETENESS_THRESHOLD = 0.5;

/**
 * Minimum number of properties an item must be missing to be considered incomplete.
 * This prevents removing items that are only slightly below the threshold.
 */
const MIN_MISSING_PROPERTIES = 2;

/**
 * Checks if a value is a plain object suitable for property comparison.
 */
function isObjectForComparison(value: unknown): value is Record<string, unknown> {
  return isPlainObject(value);
}

/**
 * Gets the property count of an object.
 */
function getPropertyCount(obj: Record<string, unknown>): number {
  return Object.keys(obj).length;
}

/**
 * Calculates the average property count of objects in an array.
 * Only considers the first N-1 items to avoid including the potentially truncated last item.
 */
function calculateAveragePropertyCount(items: Record<string, unknown>[]): number {
  if (items.length <= 1) {
    return items.length === 1 ? getPropertyCount(items[0]) : 0;
  }

  // Exclude the last item from average calculation
  const itemsForAverage = items.slice(0, -1);
  const totalProperties = itemsForAverage.reduce((sum, item) => sum + getPropertyCount(item), 0);
  return totalProperties / itemsForAverage.length;
}

/**
 * Determines if the last item in an array appears to be truncated/incomplete
 * based on comparison with its siblings.
 */
function isLastItemIncomplete(items: Record<string, unknown>[]): boolean {
  if (items.length < MIN_ITEMS_FOR_REMOVAL) {
    return false;
  }

  const lastItem = items.at(-1);
  if (!lastItem) return false; // Type guard - should never happen after length check
  const lastItemPropCount = getPropertyCount(lastItem);
  const avgPropCount = calculateAveragePropertyCount(items);

  // Check if the last item has significantly fewer properties than average
  const isSignificantlySmaller = lastItemPropCount < avgPropCount * INCOMPLETENESS_THRESHOLD;
  const isMissingEnoughProperties = avgPropCount - lastItemPropCount >= MIN_MISSING_PROPERTIES;

  return isSignificantlySmaller && isMissingEnoughProperties;
}

/**
 * Processes an array and removes incomplete trailing items.
 * Returns a new array with truncated items removed, or the original if no changes needed.
 */
function processArray(arr: unknown[]): { result: unknown[]; changed: boolean } {
  // First, recursively process all items in the array
  let anyChildChanged = false;
  const processedItems = arr.map((item) => {
    const processed = processValue(item);
    if (processed.changed) {
      anyChildChanged = true;
    }
    return processed.result;
  });

  // Check if this is an array of objects that we can analyze
  const objectItems = processedItems.filter(isObjectForComparison);
  if (objectItems.length !== processedItems.length || objectItems.length < MIN_ITEMS_FOR_REMOVAL) {
    // Not all items are objects, or not enough items - return processed items without removal
    return { result: processedItems, changed: anyChildChanged };
  }

  // Check if the last item appears incomplete
  if (isLastItemIncomplete(objectItems)) {
    // Remove the last item
    return { result: processedItems.slice(0, -1), changed: true };
  }

  return { result: processedItems, changed: anyChildChanged };
}

/**
 * Processes a plain object, recursively handling nested arrays and objects.
 */
function processObject(obj: Record<string, unknown>): {
  result: Record<string, unknown>;
  changed: boolean;
} {
  let anyChanged = false;
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    const processed = processValue(value);
    if (processed.changed) {
      anyChanged = true;
    }
    result[key] = processed.result;
  }

  return { result, changed: anyChanged };
}

/**
 * Recursively processes a value, handling arrays, objects, and primitives.
 */
function processValue(value: unknown): { result: unknown; changed: boolean } {
  if (value === null || value === undefined) {
    return { result: value, changed: false };
  }

  if (Array.isArray(value)) {
    return processArray(value);
  }

  if (isObjectForComparison(value)) {
    return processObject(value);
  }

  // Primitives and other types pass through unchanged
  return { result: value, changed: false };
}

/**
 * Removes incomplete/truncated items from the end of arrays in parsed JSON data.
 *
 * This transformation identifies arrays where the last item appears to be truncated
 * (has significantly fewer properties than its siblings) and removes those items.
 *
 * @param value - The parsed JSON data to transform
 * @param _config - Optional sanitizer configuration (unused, for interface compatibility)
 * @returns The transformed data with incomplete trailing array items removed
 */
export function removeIncompleteArrayItems(
  value: unknown,
  _config?: import("../../config/llm-module-config.types.js").LLMSanitizerConfig,
): unknown {
  const processed = processValue(value);
  return processed.result;
}
