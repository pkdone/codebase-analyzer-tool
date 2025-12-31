/**
 * Utility functions for parsing JSON context during sanitization.
 * These helpers are used by multiple sanitizers to determine parsing context.
 */

/**
 * Result type for the replaceInContext helper function.
 */
export interface ReplaceInContextResult {
  content: string;
  changed: boolean;
  diagnostics: string[];
}

/**
 * Options for configuring the replaceInContext helper function.
 */
export interface ReplaceInContextOptions {
  /** Maximum number of diagnostic messages to collect */
  maxDiagnostics?: number;
  /** Additional context check function (receives the substring before the match) */
  contextCheck?: (beforeMatch: string) => boolean;
}

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

/**
 * Higher-order helper function for performing context-aware regex replacements in JSON content.
 * Abstracts the common pattern of:
 * 1. Checking if a match is inside a string literal
 * 2. Optionally checking additional context conditions
 * 3. Tracking changes and collecting diagnostics
 *
 * @param content - The string content to process
 * @param pattern - The regex pattern to match (should have the 'g' flag)
 * @param replacement - Function that returns the replacement string for each match
 * @param diagnosticMessage - Message to log when a replacement is made (or function that generates message)
 * @param options - Optional configuration for context checking and diagnostics
 * @returns Result containing the modified content, change flag, and diagnostics
 */
export function replaceInContext(
  content: string,
  pattern: RegExp,
  replacement: (match: string, ...groups: string[]) => string,
  diagnosticMessage: string | ((match: string, ...groups: string[]) => string),
  options: ReplaceInContextOptions = {},
): ReplaceInContextResult {
  const { maxDiagnostics = 20, contextCheck } = options;
  const diagnostics: string[] = [];
  let changed = false;

  const result = content.replace(pattern, (match: string, ...args: unknown[]) => {
    // The last two arguments from replace are offset and the full string
    const argsArray = args as (string | number)[];
    const offset = argsArray[argsArray.length - 2] as number;
    const groups = argsArray.slice(0, -2) as string[];

    // Skip if inside a string literal
    if (isInStringAt(offset, content)) {
      return match;
    }

    // Apply additional context check if provided
    if (contextCheck) {
      const beforeMatch = content.substring(Math.max(0, offset - 500), offset);
      if (!contextCheck(beforeMatch)) {
        return match;
      }
    }

    // Apply the replacement
    const replacementValue = replacement(match, ...groups);

    // Only track changes if the replacement is different
    if (replacementValue !== match) {
      changed = true;
      if (diagnostics.length < maxDiagnostics) {
        const message =
          typeof diagnosticMessage === "function"
            ? diagnosticMessage(match, ...groups)
            : diagnosticMessage;
        diagnostics.push(message);
      }
    }

    return replacementValue;
  });

  return { content: result, changed, diagnostics };
}
