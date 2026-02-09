/**
 * Utility functions for parsing JSON context during sanitization.
 * These helpers are used by multiple sanitizers to determine parsing context.
 *
 * This module provides two categories of context checking functions:
 * 1. Position-based functions (take offset and content string)
 * 2. ContextInfo-based functions (take a ContextInfo object from rule execution)
 */

import { parsingHeuristics } from "../constants/json-processing.config";
import type { ContextInfo } from "../../types/sanitizer-config.types";

// ============================================================================
// String Boundary Cache - O(log N) lookups for repeated isInString checks
// ============================================================================

/**
 * Represents a string literal boundary in JSON content.
 * Start is the position of the opening quote, end is the position after the closing quote.
 */
export interface StringBoundary {
  /** Position of the opening quote (inclusive) */
  start: number;
  /** Position after the closing quote (exclusive) */
  end: number;
}

/**
 * Pre-computes string literal boundaries for a content string.
 * This allows O(log N) lookups instead of O(N) scanning when checking
 * multiple positions in the same content string.
 *
 * @param content - The JSON content string to analyze
 * @returns Array of string boundaries sorted by start position
 */
function computeStringBoundaries(content: string): StringBoundary[] {
  const boundaries: StringBoundary[] = [];
  let i = 0;

  while (i < content.length) {
    const char = content[i];

    if (char === '"') {
      const start = i;
      i++; // Move past opening quote

      // Find the closing quote, handling escapes
      while (i < content.length) {
        if (content[i] === "\\") {
          i += 2; // Skip escaped character
          continue;
        }

        if (content[i] === '"') {
          i++; // Move past closing quote
          boundaries.push({ start, end: i });
          break;
        }

        i++;
      }
    } else {
      i++;
    }
  }

  return boundaries;
}

/**
 * Binary search to check if a position falls inside any string boundary.
 * Uses the pre-computed boundaries array for O(log N) lookup.
 *
 * @param position - The character position to check
 * @param boundaries - Pre-computed string boundaries (sorted by start)
 * @returns True if the position is inside a string literal
 */
function isPositionInString(position: number, boundaries: readonly StringBoundary[]): boolean {
  if (boundaries.length === 0) return false;

  let left = 0;
  let right = boundaries.length - 1;

  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    const boundary = boundaries[mid];

    if (position >= boundary.start && position < boundary.end) {
      // Position is inside this string (between opening quote and after closing quote)
      // But we need to check if it's actually inside the string content (after opening quote)
      return position > boundary.start;
    }

    if (position < boundary.start) {
      right = mid - 1;
    } else {
      left = mid + 1;
    }
  }

  return false;
}

/**
 * Creates a cached string boundary checker for efficient repeated lookups.
 * Pre-computes string boundaries once, then provides O(log N) lookups.
 *
 * Use this when you need to check multiple positions in the same content string,
 * such as during regex replacement callbacks in sanitizers.
 *
 * @param content - The JSON content string to analyze
 * @returns A function that checks if a position is inside a string literal
 *
 * @example
 * ```typescript
 * const isInString = createStringBoundaryChecker(jsonContent);
 * // Now each check is O(log N) instead of O(N)
 * sanitized = sanitized.replace(pattern, (match, offset) => {
 *   if (isInString(offset)) return match;
 *   // ... process match
 * });
 * ```
 */
export function createStringBoundaryChecker(content: string): (position: number) => boolean {
  const boundaries = computeStringBoundaries(content);
  return (position: number) => isPositionInString(position, boundaries);
}

/**
 * Checks if a given position in a string is inside a JSON string literal.
 * Handles escaped quotes correctly.
 *
 * Note: For repeated checks on the same content, use `createStringBoundaryChecker`
 * which pre-computes boundaries for O(log N) lookups instead of O(N) scanning.
 *
 * @param position - The character position to check
 * @param content - The full content string
 * @returns True if the position is inside a string literal
 */
export function isInStringAt(position: number, content: string): boolean {
  let inString = false;
  let escaped = false;

  for (let i = 0; i < position; i++) {
    const char = content[i];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === "\\") {
      escaped = true;
    } else if (char === '"') {
      inString = !inString;
    }
  }

  return inString;
}

/**
 * Checks if a given position in a string is inside an array context.
 * Scans backwards from the position to determine if we're inside an array.
 * This is a general check that returns true if there is ANY containing array.
 *
 * @param matchIndex - The character position to check
 * @param content - The full content string
 * @returns True if the position is inside an array
 */
export function isInArrayContext(matchIndex: number, content: string): boolean {
  const beforeMatch = content.substring(
    Math.max(0, matchIndex - parsingHeuristics.CONTEXT_LOOKBACK_LENGTH),
    matchIndex,
  );

  let openBraces = 0;
  let openBrackets = 0;
  let inString = false;
  let escapeNext = false;
  let foundOpeningBracket = false;

  // Scan backwards to find context
  for (let i = beforeMatch.length - 1; i >= 0; i--) {
    const char = beforeMatch[i];

    if (escapeNext) {
      escapeNext = false;
      continue;
    }

    if (char === "\\") {
      escapeNext = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (!inString) {
      if (char === "{") {
        openBraces++;

        if (openBraces === 0 && openBrackets > 0 && foundOpeningBracket) {
          break;
        }
      } else if (char === "}") {
        openBraces--;
      } else if (char === "[") {
        openBrackets++;
        foundOpeningBracket = true;
      } else if (char === "]") {
        openBrackets--;
      }
    }
  }

  return foundOpeningBracket && openBrackets > 0;
}

/**
 * Checks if position is DIRECTLY inside an array context by scanning backwards.
 * This is a stricter check than `isInArrayContext` - it returns true only if
 * the position is directly inside an array (not inside a nested object within the array).
 *
 * Use this when you need to distinguish between:
 * - `["value"]` (directly in array) -> returns true
 * - `[{"key": "value"}]` (inside object within array) -> returns false
 *
 * @param offset - The character position to check
 * @param content - The full content string
 * @returns True if the position is directly inside an array (not nested in an object)
 */
export function isDirectlyInArrayContext(offset: number, content: string): boolean {
  const beforeMatch = content.substring(
    Math.max(0, offset - parsingHeuristics.CONTEXT_LOOKBACK_LENGTH),
    offset,
  );
  let bracketDepth = 0;
  let braceDepth = 0;
  let inString = false;
  let escape = false;

  for (let i = beforeMatch.length - 1; i >= 0; i--) {
    const char = beforeMatch[i];

    if (escape) {
      escape = false;
      continue;
    }

    if (char === "\\") {
      escape = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (!inString) {
      if (char === "]") {
        bracketDepth++;
      } else if (char === "[") {
        // When scanning backwards, hitting '[' with bracketDepth 0 means we found our containing array
        if (bracketDepth === 0 && braceDepth === 0) {
          return true;
        }

        bracketDepth--;
      } else if (char === "}") {
        braceDepth++;
      } else if (char === "{") {
        braceDepth--;
      }
    }
  }

  return false;
}

// ============================================================================
// ContextInfo-based context check functions
// ============================================================================
// These functions operate on ContextInfo objects passed from the rule executor,
// providing a consistent interface for rule context checking.

/**
 * Common context check: validates that the match is after a JSON structural delimiter.
 * Useful for property and value patterns that should only match at valid JSON positions.
 *
 * @param context - The context info from the rule execution
 * @returns true if the match is in a valid JSON structural context
 */
export function isAfterJsonDelimiter(context: ContextInfo): boolean {
  const { beforeMatch, offset } = context;
  return (
    /[}\],]\s*$/.test(beforeMatch) ||
    /^\s*$/.test(beforeMatch) ||
    offset < parsingHeuristics.START_OF_FILE_OFFSET_LIMIT ||
    /,\s*\n\s*$/.test(beforeMatch)
  );
}

/**
 * Common context check: validates that the match is in a property context.
 * Useful for patterns that should only match where a property name is expected.
 *
 * @param context - The context info from the rule execution
 * @returns true if the match is in a property context
 */
export function isInPropertyContext(context: ContextInfo): boolean {
  const { beforeMatch, offset } = context;
  return (
    /[{,]\s*$/.test(beforeMatch) ||
    /}\s*,\s*\n\s*$/.test(beforeMatch) ||
    /]\s*,\s*\n\s*$/.test(beforeMatch) ||
    /\n\s*$/.test(beforeMatch) ||
    offset < parsingHeuristics.PROPERTY_CONTEXT_OFFSET_LIMIT
  );
}

/**
 * Simple context check: validates that the match is in an array context using regex.
 * This is a fast check using beforeMatch content only.
 * For a more thorough check, use `isDeepArrayContext`.
 *
 * @param context - The context info from the rule execution
 * @returns true if the match appears to be in an array context
 */
export function isInArrayContextSimple(context: ContextInfo): boolean {
  const { beforeMatch } = context;
  return (
    /\[\s*$/.test(beforeMatch) ||
    /,\s*\n\s*$/.test(beforeMatch) ||
    /"\s*,\s*\n\s*$/.test(beforeMatch)
  );
}

/**
 * Deep array context check using backward scanning.
 * This combines the simple `isInArrayContextSimple` check with a more thorough
 * `isDirectlyInArrayContext` scan for cases where the simple check misses
 * the array context.
 *
 * @param context - The context info from the rule execution
 * @returns true if the match is in an array context (either by simple or deep scan)
 */
export function isDeepArrayContext(context: ContextInfo): boolean {
  if (isInArrayContextSimple(context)) {
    return true;
  }

  return isDirectlyInArrayContext(context.offset, context.fullContent);
}

// ============================================================================
// JSON Value Parsing Utilities
// ============================================================================
// These utilities are used to find the boundaries of JSON values during
// sanitization, consolidating common parsing logic in one place.

/**
 * Result of finding the end of a JSON value.
 */
export interface JsonValueEndResult {
  /** The position immediately after the value ends */
  endPosition: number;
  /** Whether the value was successfully parsed (balanced braces/brackets, closed strings) */
  success: boolean;
}

/**
 * Finds the end position of a JSON value starting at the given position.
 * Handles all JSON value types: objects, arrays, strings, and primitives.
 * Correctly handles escaped characters within strings.
 *
 * This utility consolidates the value-skipping logic used by multiple sanitizers
 * to avoid code duplication and ensure consistent parsing behavior.
 *
 * @param content - The content string to parse
 * @param startPos - The position where the value starts (may include leading whitespace)
 * @returns The end position and success status
 */
export function findJsonValueEnd(content: string, startPos: number): JsonValueEndResult {
  let pos = startPos;

  // Skip leading whitespace
  while (pos < content.length && /\s/.test(content[pos])) {
    pos++;
  }

  if (pos >= content.length) {
    return { endPosition: pos, success: false };
  }

  const firstChar = content[pos];
  let inString = false;
  let escaped = false;

  // Handle object values
  if (firstChar === "{") {
    let braceCount = 1;
    pos++;

    while (braceCount > 0 && pos < content.length) {
      if (escaped) {
        escaped = false;
      } else if (content[pos] === "\\") {
        escaped = true;
      } else if (content[pos] === '"') {
        inString = !inString;
      } else if (!inString) {
        if (content[pos] === "{") {
          braceCount++;
        } else if (content[pos] === "}") {
          braceCount--;
        }
      }

      pos++;
    }

    return { endPosition: pos, success: braceCount === 0 };
  }

  // Handle array values
  if (firstChar === "[") {
    let bracketCount = 1;
    pos++;

    while (bracketCount > 0 && pos < content.length) {
      if (escaped) {
        escaped = false;
      } else if (content[pos] === "\\") {
        escaped = true;
      } else if (content[pos] === '"') {
        inString = !inString;
      } else if (!inString) {
        if (content[pos] === "[") {
          bracketCount++;
        } else if (content[pos] === "]") {
          bracketCount--;
        }
      }

      pos++;
    }

    return { endPosition: pos, success: bracketCount === 0 };
  }

  // Handle string values
  if (firstChar === '"') {
    pos++;

    while (pos < content.length) {
      if (escaped) {
        escaped = false;
      } else if (content[pos] === "\\") {
        escaped = true;
      } else if (content[pos] === '"') {
        pos++;
        return { endPosition: pos, success: true };
      }

      pos++;
    }

    return { endPosition: pos, success: false };
  }

  // Handle primitives (numbers, booleans, null) - read until delimiter
  while (pos < content.length && !/[,}\]\s]/.test(content[pos])) {
    pos++;
  }

  return { endPosition: pos, success: true };
}
