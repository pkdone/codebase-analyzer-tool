/**
 * Schema fixing transformation that recursively coerces string values to arrays
 * for properties that are expected to be arrays.
 *
 * LLMs sometimes return descriptive strings for properties that should be arrays
 * (e.g., `"parameters": "59 parameters including id, accountNo, status, etc."`).
 * This transformation converts these string values to arrays for property names
 * specified in the configuration.
 *
 * Enhanced behavior:
 * - Detects bulleted/numbered lists and converts them to arrays of items
 * - Detects comma/semicolon-separated values and splits them
 * - Falls back to empty array for purely descriptive strings
 *
 * Example:
 *   Input:  { parameters: "- item1\n- item2\n- item3" }
 *   Output: { parameters: ["item1", "item2", "item3"] }
 *
 *   Input:  { tags: "tag1, tag2, tag3" }
 *   Output: { tags: ["tag1", "tag2", "tag3"] }
 *
 *   Input:  { dependencies: "59 parameters including..." }
 *   Output: { dependencies: [] }
 *
 * This transformation:
 * - Recursively processes all nested plain objects and arrays
 * - Converts string values to arrays for configured property names
 * - Works at any nesting level (not just specific paths)
 * - Leaves array values unchanged
 * - Preserves all other values unchanged
 * - Handles symbol keys and preserves them
 * - Skips transformation if no arrayPropertyNames are configured
 */

import { deepMap, isPlainObject } from "../utils/object-traversal";

/**
 * Attempts to parse a string value as a list and convert it to an array.
 * Handles stringified JSON arrays, bulleted lists, numbered lists, and comma/semicolon-separated values.
 *
 * @param stringValue - The string to parse as a list
 * @returns An array of extracted items, or an empty array if no list structure detected
 */
function parseStringAsList(stringValue: string): string[] {
  const trimmed = stringValue.trim();

  // Empty string returns empty array
  if (!trimmed) {
    return [];
  }

  // Strategy 0: Try JSON.parse for stringified JSON arrays
  // Handles cases like: '["item1", "item2"]' or "['a', 'b']"
  if (trimmed.startsWith("[")) {
    try {
      const parsed: unknown = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.map(String);
      }
    } catch {
      // Try with single quotes converted to double quotes (common LLM output)
      try {
        const normalizedQuotes = trimmed.replace(/'/g, '"');
        const parsed: unknown = JSON.parse(normalizedQuotes);
        if (Array.isArray(parsed)) {
          return parsed.map(String);
        }
      } catch {
        // Not valid JSON, fall through to other strategies
      }
    }
  }

  // Strategy 1: Bulleted list (lines starting with -, *, •, or similar)
  // Pattern: "- item1\n- item2" or "* item1\n* item2" or "• item1\n• item2"
  // Extended to include additional Unicode bullet characters for robustness
  const bulletedListPattern = /^[\s]*[-*•◦▪▸►▹‣⁃○●◆◇■□→➤➢]\s+/m;
  if (bulletedListPattern.test(trimmed)) {
    const items = trimmed
      .split(/\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => line.replace(/^[-*•◦▪▸►▹‣⁃○●◆◇■□→➤➢]\s+/, "").trim())
      .filter((item) => item.length > 0);

    if (items.length > 0) {
      return items;
    }
  }

  // Strategy 2: Numbered list (lines starting with 1., 2., etc. or 1), 2), etc.)
  // Pattern: "1. item1\n2. item2" or "1) item1\n2) item2"
  const numberedListPattern = /^[\s]*\d+[.)]\s+/m;
  if (numberedListPattern.test(trimmed)) {
    const items = trimmed
      .split(/\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => line.replace(/^\d+[.)]\s+/, "").trim())
      .filter((item) => item.length > 0);

    if (items.length > 0) {
      return items;
    }
  }

  // Strategy 3: Simple comma/semicolon-separated values (no nested separators in items)
  // Only applies if the string contains multiple separators and doesn't look like a sentence
  // A simple heuristic: if there are multiple commas/semicolons and no periods/sentence structure
  const separatorCount = (trimmed.match(/[,;]/g) ?? []).length;
  const hasMultipleSeparators = separatorCount >= 2;
  const looksLikeSentence = /\.\s+[A-Z]/.test(trimmed) || trimmed.endsWith(".");

  if (hasMultipleSeparators && !looksLikeSentence) {
    const items = trimmed
      .split(/[,;]/)
      .map((item) => item.trim())
      .filter((item) => item.length > 0);

    // Only return if we got multiple items and they look like list items
    // (not too long, not containing sentence-like patterns)
    const avgItemLength = items.reduce((sum, item) => sum + item.length, 0) / items.length;
    if (items.length >= 2 && avgItemLength < 50) {
      return items;
    }
  }

  // Strategy 4: Newline-separated values (simple list without bullets)
  // Only applies if there are multiple lines and each line is short
  if (trimmed.includes("\n")) {
    const lines = trimmed
      .split(/\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    const avgLineLength = lines.reduce((sum, line) => sum + line.length, 0) / lines.length;
    // Only treat as list if we have multiple short lines (likely items, not paragraphs)
    if (lines.length >= 2 && avgLineLength < 60) {
      return lines;
    }
  }

  // No list structure detected - return empty array (fallback behavior)
  return [];
}

export function coerceStringToArray(
  value: unknown,
  config?: import("../../config/llm-module-config.types").LLMSanitizerConfig,
  visited = new WeakSet<object>(),
): unknown {
  const arrayPropertyNames = config?.arrayPropertyNames ?? [];

  // Skip transformation if no array property names are configured
  if (arrayPropertyNames.length === 0) {
    return value;
  }

  return deepMap(
    value,
    (val) => {
      // Handle primitives and null - return as-is
      if (val === null || typeof val !== "object") {
        return val;
      }

      // Handle arrays - return as-is (already processed by deepMap)
      // Array.isArray() narrows to any[] in TypeScript; cast to unknown[] for strict type safety
      if (Array.isArray(val)) {
        return val as unknown[];
      }

      // Handle plain objects - transform string values for configured properties
      // Use isPlainObject type guard to narrow val to Record<string | symbol, unknown>
      if (isPlainObject(val)) {
        const result: Record<string | symbol, unknown> = {};

        // Process string keys
        for (const [key, propVal] of Object.entries(val)) {
          // Convert string values to arrays for configured property names
          // Check the original value before it's processed recursively
          if (arrayPropertyNames.includes(key) && typeof propVal === "string") {
            // Try to parse as a list, falling back to empty array
            result[key] = parseStringAsList(propVal);
          } else {
            // Value will be processed recursively by deepMap
            result[key] = propVal;
          }
        }

        // Handle symbol keys (preserve them as-is, they'll be processed by deepMap)
        const symbols = Object.getOwnPropertySymbols(val);
        for (const sym of symbols) {
          result[sym] = val[sym];
        }

        // Return the object structure, deepMap will recursively process the values
        return result;
      }

      // Preserve special built-in objects (Date, RegExp, etc.) as-is
      return val;
    },
    visited,
  );
}
