import { Sanitizer, SanitizerResult } from "./sanitizers-types";

/**
 * Sanitizer that fixes truncated property names in JSON responses.
 *
 * This sanitizer addresses cases where LLM responses contain property names
 * that appear to be truncated or corrupted, which creates invalid JSON syntax.
 *
 * Examples of issues this sanitizer handles:
 * - Truncated property names: {"eferences": []} -> {"references": []}
 * - Malformed property names: {"refere": []} -> {"references": []}
 *
 * The sanitizer uses heuristics to identify likely truncated property names
 * and attempts to fix them based on common patterns.
 */
export const fixTruncatedPropertyNames: Sanitizer = (jsonString: string): SanitizerResult => {
  try {
    let sanitized = jsonString;
    let hasChanges = false;
    const diagnostics: string[] = [];

    // Common property name mappings for truncated names
    // Only include mappings that are clearly truncated versions of common property names
    const propertyMappings: Record<string, string> = {
      // References variations - the main case from the error log
      eferences: "references",
      refere: "references",
      refer: "references",
      
      // Name variations - handles truncations like "se" (from "name")
      se: "name",
      nam: "name",
      na: "name",

      // PublicMethods variations - handles "alues" -> "publicMethods"
      alues: "publicMethods",
      lues: "publicMethods",
      ues: "publicMethods",
      es: "publicMethods",

      // Integration variations
      integra: "integration",
      integrat: "integration",

      // Implementation variations
      implemen: "implementation",
      implement: "implementation",

      // Purpose variations
      purpos: "purpose",
      purpo: "purpose",

      // Description variations
      descriptio: "description",
      descripti: "description",
      descript: "description",

      // Parameters variations
      paramete: "parameters",
      paramet: "parameters",

      // Return variations
      retur: "return",

      // Methods variations
      metho: "methods",
      method: "methods",

      // Constants variations
      constan: "constants",
      consta: "constants",

      // Database variations
      databas: "database",

      // Quality variations
      qualit: "quality",

      // Metrics variations
      metric: "metrics",
      metri: "metrics",

      // Smells variations
      smell: "smells",
      smel: "smells",

      // Complexity variations
      complexi: "complexity",
      complex: "complexity",

      // Average variations
      averag: "average",
      avera: "average",

      // Maximum variations
      maxim: "maximum",
      maxi: "maximum",

      // Minimum variations
      minim: "minimum",
      mini: "minimum",

      // Length variations
      lengt: "length",
      leng: "length",

      // Total variations
      total: "total",
      tota: "total",

      // File variations
      file: "file",

      // Class variations
      clas: "class",

      // Interface variations
      interfac: "interface",
      interfa: "interface",
      interf: "interface",
      inter: "interface",

      // Namespace variations
      namespac: "namespace",
      namespa: "namespace",
      namesp: "namespace",
      names: "namespace",

      // Public variations
      public: "public",
      publi: "public",
      publ: "public",

      // Private variations
      privat: "private",
      priva: "private",
      priv: "private",

      // Protected variations
      protec: "protected",
      prote: "protected",
      prot: "protected",

      // Static variations
      static: "static",
      stati: "static",
      stat: "static",

      // Final variations
      final: "final",
      fina: "final",

      // Abstract variations
      abstract: "abstract",
      abstrac: "abstract",
      abstra: "abstract",
      abst: "abstract",

      // Synchronized variations
      synchronize: "synchronized",
      synchroniz: "synchronized",
      synchroni: "synchronized",
      synchron: "synchronized",
      synchro: "synchronized",
      synchr: "synchronized",
      synch: "synchronized",
      sync: "synchronized",

      // Volatile variations
      volatil: "volatile",
      volati: "volatile",
      volat: "volatile",
      vola: "volatile",

      // Transient variations
      transien: "transient",
      transie: "transient",
      transi: "transient",
      trans: "transient",
      tran: "transient",

      // Native variations
      nativ: "native",
      nati: "native",

      // Strictfp variations
      strictf: "strictfp",
      strict: "strictfp",
      stric: "strictfp",
      stri: "strictfp",
    };

    // Single-character mappings for cases where property names are severely truncated
    // These are common single-character truncations in JSON responses
    const singleCharMappings: Record<string, string> = {
      // "name" truncated - most common case where only last character remains
      e: "name",
      // Other common truncations (less likely but possible)
      n: "name", // if "name" was truncated to just "n"
      m: "name", // if truncated differently
    };
    
    // Two-character mappings for cases where property names are truncated to 2 chars
    const twoCharMappings: Record<string, string> = {
      // "name" truncated to 2 chars
      se: "name",
      na: "name",
      am: "name",
      me: "name",
    };

    // Pattern 1: Fix truncated property names with missing opening quote and colon
    // Matches patterns like: e": "value"  (should be "name": "value")
    // This handles cases where the opening quote and most of the property name are missing
    // We match when the pattern appears after certain delimiters (}, ], comma, newline)
    // This ensures we're at a property boundary, not inside a valid property name
    // Allow optional newlines and whitespace between delimiter and the truncated property
    const missingOpeningQuotePattern = /([}\],]|^)(\n?\s*)([a-zA-Z])"\s*:/gm;

    // Pattern 1b: Fix truncated property names with missing opening quote and missing colon
    // Matches patterns like: e"value", (should be "name": "value",)
    // This handles cases where both the opening quote and colon are missing
    // The pattern matches: delimiter + whitespace + single char + quote + value + comma
    const missingOpeningQuoteAndColonPattern = /([}\],]|^)(\n?\s*)([a-zA-Z])"([^"]+)"(\s*,)/gm;

    const beforeFirstPass = sanitized;
    sanitized = sanitized.replace(
      missingOpeningQuotePattern,
      (match, delimiter, whitespace, singleChar) => {
        const lowerChar = (singleChar as string).toLowerCase();

        // Check if this single character maps to a known property name
        if (singleCharMappings[lowerChar]) {
          const fixedName = singleCharMappings[lowerChar];
          hasChanges = true;
          diagnostics.push(
            `Fixed missing opening quote in truncated property: ${singleChar as string}" -> "${fixedName}"`,
          );
          return `${delimiter}${whitespace}"${fixedName}":`;
        }

        return match; // Keep as is if no mapping found
      },
    );
    
    // Pattern 1a: Fix truncated property names with 2 characters (e.g., "se": -> "name":)
    const missingOpeningQuotePattern2Char = /([}\],]|^)(\n?\s*)([a-zA-Z]{2})"\s*:/gm;
    sanitized = sanitized.replace(
      missingOpeningQuotePattern2Char,
      (match, delimiter, whitespace, twoChars) => {
        const lowerTwoChars = (twoChars as string).toLowerCase();

        // Check if this two-character sequence maps to a known property name
        if (twoCharMappings[lowerTwoChars]) {
          const fixedName = twoCharMappings[lowerTwoChars];
          hasChanges = true;
          diagnostics.push(
            `Fixed missing opening quote in truncated property (2-char): ${twoChars as string}" -> "${fixedName}"`,
          );
          return `${delimiter}${whitespace}"${fixedName}":`;
        }

        return match; // Keep as is if no mapping found
      },
    );

    // Apply Pattern 1b: Fix truncated property names missing both opening quote and colon
    // IMPORTANT: This pattern must NOT match array string values (e.g., e"value", in an array).
    // Those should be handled by fixStrayTextBeforePropertyNames instead.
    const beforeFirstPassB = sanitized;
    sanitized = sanitized.replace(
      missingOpeningQuoteAndColonPattern,
      (match, delimiter, whitespace, singleChar, propertyValue, comma, offset, string) => {
        const lowerChar = (singleChar as string).toLowerCase();
        const offsetNum = typeof offset === "number" ? offset : undefined;
        const stringStr = typeof string === "string" ? string : sanitized;

        // Check if we're in an array context - if so, skip this pattern
        // Array string values like e"value", should be handled by fixStrayTextBeforePropertyNames
        let isInArray = false;
        if (offsetNum !== undefined && stringStr) {
          const beforeMatch = stringStr.substring(Math.max(0, offsetNum - 500), offsetNum);
          let bracketDepth = 0; // Positive = inside array, 0 = outside array
          let braceDepth = 0; // Positive = inside object, 0 = outside object
          let inString = false;
          let escapeNext = false;

          // Iterate backwards to find if we're inside an array
          // When iterating backwards from inside an array:
          // - We see [ first (the opening bracket), which means we're inside that array
          // - We see ] later (after our position), so we don't see it when looking backwards
          // So if we find [ and bracketDepth is 0 (no unmatched ]), we're inside that array
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
                bracketDepth++; // Going backwards, ] means we're entering an array (from the future)
              } else if (char === "[") {
                bracketDepth--; // Going backwards, [ means we're leaving an array
                // If bracketDepth is 0 or negative and braces are balanced, we found the opening of the array we're in
                // This means we're currently inside this array (haven't seen its closing ] yet)
                if (bracketDepth <= 0 && braceDepth === 0) {
                  isInArray = true;
                  break;
                }
              } else if (char === "}") {
                braceDepth++; // Going backwards, } means we're entering an object
              } else if (char === "{") {
                braceDepth--; // Going backwards, { means we're leaving an object
              }
            }
          }
          // If we have unmatched closing brackets (bracketDepth > 0), we're inside an array
          // Also check if we're after a comma (which is common in arrays)
          const isAfterComma = delimiter === ",";
          if (bracketDepth > 0 && braceDepth === 0) {
            isInArray = true;
          } else if (isAfterComma && bracketDepth > 0) {
            // Even if braces aren't balanced, if we're after a comma and have open brackets, likely an array
            isInArray = true;
          }
        }

        // Check if this single character maps to a known property name
        // If we're in an array context, we need to distinguish between:
        // 1. Array of strings: ["value1", e"value2", "value3"] - should NOT fix (let fixStrayTextBeforePropertyNames handle it)
        // 2. Array of objects: [{...}, e"value", "property": ...] - SHOULD fix (truncated property name)
        // The key indicator is whether there's a closing brace } before the delimiter, which indicates
        // we're in an array of objects context (the previous object closed with },)
        // Check if there's a } immediately before the delimiter (within the last few characters)
        let isInArrayOfObjects = false;
        let isInArrayOfStrings = false;
        if (isInArray && offsetNum !== undefined && typeof stringStr === "string") {
          const beforeDelimiter = stringStr.substring(Math.max(0, offsetNum - 10), offsetNum);
          // Check if there's a } before the delimiter (indicating }, pattern)
          const hasClosingBraceBefore = beforeDelimiter.includes("}");
          isInArrayOfObjects = hasClosingBraceBefore;
          isInArrayOfStrings = !hasClosingBraceBefore;
        } else if (isInArray && typeof delimiter === "string") {
          // Fallback: check delimiter directly (though this won't catch }, pattern)
          isInArrayOfObjects = delimiter.includes("}");
          isInArrayOfStrings = !delimiter.includes("}");
        }

        // If we have a known mapping and we're NOT in an array of strings, we should fix it
        // This handles:
        // - Object context: e"value", -> "name": "value",
        // - Array of objects: }, e"value", -> }, "name": "value",
        // But NOT array of strings: , e"value", -> let fixStrayTextBeforePropertyNames handle it
        if (singleCharMappings[lowerChar]) {
          const fixedName = singleCharMappings[lowerChar];
          // Skip if we're in an array of strings - let fixStrayTextBeforePropertyNames handle it
          if (isInArrayOfStrings) {
            return match;
          }
          hasChanges = true;
          if (isInArrayOfObjects) {
            diagnostics.push(
              `Fixed missing opening quote and colon in truncated property (array of objects context): ${singleChar as string}"${propertyValue as string}" -> "${fixedName}": "${propertyValue as string}"`,
            );
          } else {
            diagnostics.push(
              `Fixed missing opening quote and colon in truncated property: ${singleChar as string}"${propertyValue as string}" -> "${fixedName}": "${propertyValue as string}"`,
            );
          }
          return `${delimiter}${whitespace}"${fixedName}": "${propertyValue as string}"${comma as string}`;
        }

        // If we're in an array context and no mapping found, skip it - let fixStrayTextBeforePropertyNames handle it
        if (isInArray) {
          return match;
        }

        return match; // Keep as is if no mapping found
      },
    );

    // Track changes from first pass
    if (sanitized !== beforeFirstPass || sanitized !== beforeFirstPassB) {
      hasChanges = true;
    }

    // Pattern 2: Fix truncated property names that are missing opening quote
    // This matches patterns like: alues": [  (should be "publicMethods": [)
    // The pattern matches: whitespace + truncated property name + " + : + whitespace + next token
    const truncatedMissingOpeningQuotePattern = /(\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)"\s*:/g;

    const beforeSecondPass = sanitized;
    sanitized = sanitized.replace(
      truncatedMissingOpeningQuotePattern,
      (match, whitespace, propertyName, offset: unknown) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        const whitespaceStr = typeof whitespace === "string" ? whitespace : "";
        const propertyNameStr = typeof propertyName === "string" ? propertyName : "";
        const lowerPropertyName = propertyNameStr.toLowerCase();

        // Check if there's already an opening quote before this (shouldn't match if properly quoted)
        if (numericOffset > 0 && sanitized[numericOffset - 1] === '"') {
          return match; // Already properly quoted, skip
        }

        // Check if this looks like a truncated property name
        if (propertyMappings[lowerPropertyName]) {
          const fixedName = propertyMappings[lowerPropertyName];
          hasChanges = true;
          diagnostics.push(
            `Fixed truncated property name with missing opening quote: ${propertyNameStr}" -> "${fixedName}"`,
          );
          return `${whitespaceStr}"${fixedName}":`;
        }

        return match; // Keep as is if no mapping found
      },
    );

    // Pattern 3: Fix truncated property names that are clearly incomplete (with quotes)
    // This matches property names that look like they were cut off
    const truncatedPropertyPattern = /(\s*)"([a-zA-Z_$][a-zA-Z0-9_$]*)"\s*(?=:|,|\})/g;

    // Apply property name fixes
    const beforeThirdPass = sanitized;
    sanitized = sanitized.replace(truncatedPropertyPattern, (match, whitespace, propertyName) => {
      const lowerPropertyName = (propertyName as string).toLowerCase();

      // Check if this looks like a truncated property name
      if (propertyMappings[lowerPropertyName]) {
        const fixedName = propertyMappings[lowerPropertyName];
        hasChanges = true;
        diagnostics.push(
          `Fixed truncated property name: ${propertyName as string} -> ${fixedName}`,
        );
        return `${whitespace}"${fixedName}"`;
      }

      return match; // Keep as is if no mapping found
    });

    // Track changes from passes
    if (sanitized !== beforeSecondPass || sanitized !== beforeThirdPass) {
      hasChanges = true;
    }

    return {
      content: sanitized,
      changed: hasChanges,
      description: hasChanges ? "Fixed truncated property names" : undefined,
      diagnostics: hasChanges ? diagnostics : undefined,
    };
  } catch (error) {
    // If sanitization fails, return the original string
    console.warn(`fixTruncatedPropertyNames sanitizer failed: ${String(error)}`);
    return {
      content: jsonString,
      changed: false,
      description: undefined,
      diagnostics: [`Sanitizer failed: ${String(error)}`],
    };
  }
};
