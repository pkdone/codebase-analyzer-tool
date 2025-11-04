import { Sanitizer, SanitizerResult } from "./sanitizers-types";
import { SANITIZATION_STEP } from "../config/sanitization-steps.config";

/**
 * Sanitizer that fixes binary corruption patterns in LLM responses.
 *
 * This sanitizer addresses cases where LLM responses contain binary corruption markers
 * or stray text that replace parts of property names or appear before JSON structures.
 *
 * Examples of issues this sanitizer handles:
 * - `<y_bin_305>OfCode":` -> `"linesOfCode":` (binary marker replacing "lines")
 * - `<y_bin_XXX>PropertyName":` -> `"propertyName":` (binary marker in property name)
 * - `so{` -> `    {` (stray text before opening brace in array)
 * - `word{` -> `    {` (stray text before opening brace)
 *
 * Strategy:
 * 1. Detects binary corruption markers like `<y_bin_XXX>` and reconstructs the property name
 * 2. Detects stray text before opening braces in array contexts and removes it
 * 3. Uses known property name patterns to reconstruct corrupted names
 */
export const fixBinaryCorruptionPatterns: Sanitizer = (jsonString: string): SanitizerResult => {
  try {
    let sanitized = jsonString;
    let hasChanges = false;
    const diagnostics: string[] = [];

    // Pattern 1: Binary corruption markers like <y_bin_XXX>OfCode"
    // Matches: <y_bin_XXX>OfCode": where the binary marker replaced part of the property name
    // Common patterns: <y_bin_XXX>OfCode -> linesOfCode, <y_bin_XXX>OfCode -> linesOfCode
    const binaryCorruptionPattern = /<y_bin_\d+>([A-Z][a-zA-Z]*)"\s*:/g;

    sanitized = sanitized.replace(
      binaryCorruptionPattern,
      (match, remainingPart, offset: unknown) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        const remainingStr = typeof remainingPart === "string" ? remainingPart : "";

        // Check if we're inside a string literal
        if (isInStringAt(numericOffset, sanitized)) {
          return match;
        }

        // Try to reconstruct the property name based on common patterns
        // Common property names that end with "OfCode": "linesOfCode"
        // Common property names that end with other patterns: check mappings
        let reconstructedName: string | null = null;

        if (remainingStr === "OfCode") {
          reconstructedName = "linesOfCode";
        } else if (remainingStr.endsWith("OfCode")) {
          // Try to infer: if it ends with OfCode, it's likely linesOfCode
          reconstructedName = "linesOfCode";
        }

        if (reconstructedName) {
          hasChanges = true;
          diagnostics.push(
            `Fixed binary corruption marker: <y_bin_XXX>${remainingStr}" -> "${reconstructedName}"`,
          );
          return `"${reconstructedName}":`;
        }

        return match;
      },
    );

    // Pattern 2: Stray text before opening braces in array contexts
    // Matches: }, word{ or ], word{ where word is stray text (2-10 chars typically)
    // This handles cases like: }, so{ -> },    { or ], so{ -> ],    {
    // The pattern matches delimiter (}, ], or ,), optional whitespace, newline, whitespace, stray text, brace
    const strayTextBeforeBracePattern = /([}\],])\s*\n\s*([a-zA-Z]{2,10})\{/g;

    sanitized = sanitized.replace(
      strayTextBeforeBracePattern,
      (match, delimiter, strayText, offset: unknown) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        const delimiterStr = typeof delimiter === "string" ? delimiter : "";
        const strayTextStr = typeof strayText === "string" ? strayText : "";
        
        // Extract whitespace before the brace from the match
        // The match is: delimiter + \s* + \n + \s* + strayText + {
        // We need to preserve the whitespace after the newline
        const whitespaceMatch = /\n(\s*)[a-zA-Z]/.exec(match);
        const whitespaceAfterNewline = whitespaceMatch?.[1] ?? "    ";

        // Check if we're inside a string literal
        if (isInStringAt(numericOffset, sanitized)) {
          return match;
        }

        // Check if we're in an array context by looking backwards
        const beforeMatch = sanitized.substring(Math.max(0, numericOffset - 500), numericOffset);
        const isInArray = isInArrayContext(beforeMatch);
        
        // Also check if we're after a closing brace-comma or bracket-comma pattern,
        // which strongly suggests we're in an array of objects
        const isAfterArrayDelimiter = /[}\],]\s*\n\s*$/.test(beforeMatch);

        if (isInArray || isAfterArrayDelimiter) {
          hasChanges = true;
          diagnostics.push(`Removed stray text "${strayTextStr}" before opening brace in array`);
          return `${delimiterStr}\n${whitespaceAfterNewline}{`;
        }

        return match;
      },
    );

    // Pattern 3: More general binary corruption - any <y_bin_XXX> pattern
    // This catches cases where the binary marker appears but we couldn't reconstruct
    // We'll remove it and try to fix the structure
    const generalBinaryPattern = /<y_bin_\d+>/g;

    sanitized = sanitized.replace(generalBinaryPattern, (match, offset: unknown) => {
      const numericOffset = typeof offset === "number" ? offset : 0;

      // Check if we're inside a string literal
      if (isInStringAt(numericOffset, sanitized)) {
        return match;
      }

      // Check context after the marker to see if we should add a quote
      const afterMarker = sanitized.substring(
        numericOffset + match.length,
        Math.min(numericOffset + match.length + 20, sanitized.length),
      );

      // If after the marker we have something like "OfCode":, we know it's a property name
      if (/^[A-Z][a-zA-Z]*"\s*:/.test(afterMarker)) {
        const propertyMatch = /^([A-Z][a-zA-Z]*)"\s*:/.exec(afterMarker);
        if (propertyMatch && propertyMatch[1] === "OfCode") {
          hasChanges = true;
          diagnostics.push(`Removed binary marker and reconstructed property name`);
          return '"lines';
        }
      }

      // Otherwise, just remove the marker (let other sanitizers handle the rest)
      hasChanges = true;
      diagnostics.push(`Removed binary corruption marker: ${match}`);
      return "";
    });

    // Ensure hasChanges reflects actual changes
    hasChanges = sanitized !== jsonString;

    return {
      content: sanitized,
      changed: hasChanges,
      description: hasChanges ? SANITIZATION_STEP.FIXED_BINARY_CORRUPTION_PATTERNS : undefined,
      diagnostics: hasChanges && diagnostics.length > 0 ? diagnostics : undefined,
    };
  } catch (error) {
    // If sanitization fails, return the original string
    console.warn(`fixBinaryCorruptionPatterns sanitizer failed: ${String(error)}`);
    return {
      content: jsonString,
      changed: false,
      description: undefined,
      diagnostics: [`Sanitizer failed: ${String(error)}`],
    };
  }
};

/**
 * Helper to determine if a position is inside a string literal
 */
function isInStringAt(position: number, content: string): boolean {
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
 * Helper to check if we're in an array context
 * This checks if we're inside an array by scanning backwards for opening brackets
 */
function isInArrayContext(beforeMatch: string): boolean {
  let bracketDepth = 0;
  let braceDepth = 0;
  let inString = false;
  let escapeNext = false;
  let foundOpeningBracket = false;

  // Scan backwards to find if we're in an array
  // When scanning backwards: ] increments depth (we're entering an array), [ decrements (we're leaving)
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
      if (char === "]") {
        bracketDepth++;
      } else if (char === "[") {
        bracketDepth--;
        foundOpeningBracket = true;
        // If we find [ and we haven't seen more [ than ] yet (bracketDepth >= 0),
        // and we're not deeply nested in objects (braceDepth <= 0), we're in this array
        if (bracketDepth >= 0 && braceDepth <= 0) {
          return true;
        }
      } else if (char === "}") {
        braceDepth++;
      } else if (char === "{") {
        braceDepth--;
      }
    }
  }

  // Fallback: if we found an opening bracket and braces are balanced or we're at object level,
  // we're likely in an array (even if bracket counting didn't work perfectly)
  if (foundOpeningBracket && braceDepth <= 0) {
    return true;
  }

  return false;
}

