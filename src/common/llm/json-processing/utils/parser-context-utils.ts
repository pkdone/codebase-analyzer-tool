/**
 * Utility functions for parsing JSON context during sanitization.
 * These helpers are used by multiple sanitizers to determine parsing context.
 */

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
 *
 * @param matchIndex - The character position to check
 * @param content - The full content string
 * @returns True if the position is inside an array
 */
export function isInArrayContext(matchIndex: number, content: string): boolean {
  const beforeMatch = content.substring(Math.max(0, matchIndex - 500), matchIndex);

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
