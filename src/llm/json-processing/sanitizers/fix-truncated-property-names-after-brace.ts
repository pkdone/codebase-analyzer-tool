import { Sanitizer, SanitizerResult } from "./sanitizers-types";

/**
 * Sanitizer that fixes truncated property names after closing braces in arrays.
 *
 * This sanitizer addresses cases where LLM responses contain array elements where:
 * 1. A previous object closes with `},`
 * 2. The next object should start with `{` but it's missing
 * 3. The property name is truncated (e.g., `se":` instead of `"name":` or `"purpose":`)
 *
 * Examples of issues this sanitizer handles:
 * - `},\nse": "value",` -> `},\n    {\n      "name": "value",`
 * - `},\n  pu": "value",` -> `},\n    {\n      "purpose": "value",`
 * - `},\n  na": "value",` -> `},\n    {\n      "name": "value",`
 *
 * Strategy:
 * Detects patterns where after `},` + newline, there's a 2-3 character lowercase string
 * followed by `":` (truncated property name) and a value. Inserts the missing opening
 * brace and fixes the property name based on common truncation patterns.
 */
export const fixTruncatedPropertyNamesAfterBrace: Sanitizer = (
  jsonString: string,
): SanitizerResult => {
  try {
    let sanitized = jsonString;
    let hasChanges = false;
    const diagnostics: string[] = [];

    // Mapping of truncated property name patterns to full property names
    // These are common truncations that occur when LLMs cut off property names
    const truncatedPropertyMappings: Record<string, string> = {
      // "name" truncations
      se: "name", // "na" -> "se" (truncated)
      na: "name",
      nam: "name",
      // "purpose" truncations
      pu: "purpose",
      pur: "purpose",
      purp: "purpose",
      purpo: "purpose",
      purpos: "purpose",
      // "description" truncations
      de: "description",
      des: "description",
      desc: "description",
      descr: "description",
      descri: "description",
      descrip: "description",
      descript: "description",
      descripti: "description",
      descriptio: "description",
      // "parameters" truncations
      pa: "parameters",
      par: "parameters",
      para: "parameters",
      param: "parameters",
      parame: "parameters",
      paramet: "parameters",
      paramete: "parameters",
      // "returnType" truncations
      re: "returnType",
      ret: "returnType",
      retu: "returnType",
      retur: "returnType",
      return: "returnType",
      returnT: "returnType",
      returnTy: "returnType",
      returnTyp: "returnType",
      // "implementation" truncations
      im: "implementation",
      imp: "implementation",
      impl: "implementation",
      imple: "implementation",
      implem: "implementation",
      impleme: "implementation",
      implement: "implementation",
      implementa: "implementation",
      implementat: "implementation",
      implementati: "implementation",
      implementatio: "implementation",
    };

    // Pattern: }, + newline + whitespace + 2-4 lowercase chars + ": + value (quoted string or array)
    // This matches truncated property names like `se": "value"` or `par": []` where the opening quote
    // and part of the property name are missing
    // The pattern captures:
    // - The closing brace-comma and following whitespace/newline
    // - The indentation before the truncated property
    // - The truncated property name (2-4 lowercase chars)
    // - The quote and colon (":)
    // - The value (quoted string with escaped quotes, or empty array [])
    // - Optional comma after
    const truncatedPropertyAfterBracePattern =
      /(\}\s*,)\s*\n(\s*)([a-z]{2,4})"\s*:\s*((?:\[\]|"(?:[^"\\]|\\.)*"))(\s*,?)/g;

    // Helper function to check if we're in an array context
    function isInArrayContext(matchIndex: number, content: string): boolean {
      const beforeMatch = content.substring(Math.max(0, matchIndex - 500), matchIndex);

      // Count braces and brackets to determine if we're in an array of objects
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
            // If we've balanced braces and found a bracket, we're likely in an array of objects
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

    // Process matches in a loop, re-running the regex after each fix to handle position shifts
    let previousSanitized = "";
    while (previousSanitized !== sanitized) {
      previousSanitized = sanitized;
      const regex = new RegExp(truncatedPropertyAfterBracePattern);
      const matches: { match: RegExpMatchArray; index: number }[] = [];
      let match;
      while ((match = regex.exec(sanitized)) !== null) {
        matches.push({ match, index: match.index });
      }

      // Process matches in reverse order to avoid position shifts
      for (let i = matches.length - 1; i >= 0; i--) {
        const { match: matchResult, index: matchIndex } = matches[i];
        const closingBraceComma = matchResult[1] || "";
        const whitespace = matchResult[2] || "";
        const truncatedProperty = matchResult[3] || "";
        const propertyValue = matchResult[4] || "";
        const commaAfter = matchResult[5] || "";

        // Check if we're in an array context
        const isLikelyArrayContext = isInArrayContext(matchIndex, sanitized);

        if (isLikelyArrayContext) {
          // Check if the truncated property matches a known pattern
          const fullPropertyName = truncatedPropertyMappings[truncatedProperty.toLowerCase()];

          if (fullPropertyName) {
            hasChanges = true;

            // Determine proper indentation: use the existing indent if present,
            // otherwise use a standard 4 spaces (typical for JSON formatting)
            const properIndent = whitespace || "    ";
            const innerIndent = properIndent + "  "; // Indent for properties inside object

            diagnostics.push(
              `Fixed truncated property name after brace: "${truncatedProperty}" -> "${fullPropertyName}" and inserted missing opening brace`,
            );

            // Reconstruct the fixed pattern:
            // - Keep the closing brace-comma
            // - Ensure newline is present
            // - Add proper indentation
            // - Add opening brace
            // - Add newline with inner indentation
            // - Add the fixed property name
            // - Add the value (propertyValue already includes quotes if it's a string, or [] if it's an array)
            // - Keep the comma after if present
            const matchText = matchResult[0];
            const replacement = `${closingBraceComma}\n${properIndent}{\n${innerIndent}"${fullPropertyName}": ${propertyValue}${commaAfter}`;
            sanitized =
              sanitized.substring(0, matchIndex) +
              replacement +
              sanitized.substring(matchIndex + matchText.length);
            break; // Break out of the loop to re-run regex on the updated string
          }
        }
      }
    }

    // Ensure hasChanges reflects actual changes
    hasChanges = sanitized !== jsonString;

    return {
      content: sanitized,
      changed: hasChanges,
      description: hasChanges
        ? "Fixed truncated property names after closing braces in arrays"
        : undefined,
      diagnostics: hasChanges && diagnostics.length > 0 ? diagnostics : undefined,
    };
  } catch (error) {
    // If sanitization fails, return the original string
    console.warn(`fixTruncatedPropertyNamesAfterBrace sanitizer failed: ${String(error)}`);
    return {
      content: jsonString,
      changed: false,
      description: undefined,
      diagnostics: [`Sanitizer failed: ${String(error)}`],
    };
  }
};
