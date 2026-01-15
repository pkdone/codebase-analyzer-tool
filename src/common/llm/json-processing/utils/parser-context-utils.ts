/**
 * Utility functions for parsing JSON context during sanitization.
 * These helpers are used by multiple sanitizers to determine parsing context.
 *
 * This module provides two categories of context checking functions:
 * 1. Position-based functions (take offset and content string)
 * 2. ContextInfo-based functions (take a ContextInfo object from rule execution)
 */

import { parsingHeuristics } from "../constants/json-processing.config";
import type { ContextInfo } from "../sanitizers/rules/replacement-rule.types";

/**
 * Checks if a given position in a string is inside a JSON string literal.
 * Handles escaped quotes correctly.
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
