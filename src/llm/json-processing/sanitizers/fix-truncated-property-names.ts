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

    // Apply Pattern 1b: Fix truncated property names missing both opening quote and colon
    const beforeFirstPassB = sanitized;
    sanitized = sanitized.replace(
      missingOpeningQuoteAndColonPattern,
      (match, delimiter, whitespace, singleChar, propertyValue, comma) => {
        const lowerChar = (singleChar as string).toLowerCase();

        // Check if this single character maps to a known property name
        if (singleCharMappings[lowerChar]) {
          const fixedName = singleCharMappings[lowerChar];
          hasChanges = true;
          diagnostics.push(
            `Fixed missing opening quote and colon in truncated property: ${singleChar as string}"${propertyValue as string}" -> "${fixedName}": "${propertyValue as string}"`,
          );
          return `${delimiter}${whitespace}"${fixedName}": "${propertyValue as string}"${comma as string}`;
        }

        return match; // Keep as is if no mapping found
      },
    );

    // Track changes from first pass
    if (sanitized !== beforeFirstPass || sanitized !== beforeFirstPassB) {
      hasChanges = true;
    }

    // Pattern 2: Fix truncated property names that are clearly incomplete
    // This matches property names that look like they were cut off
    const truncatedPropertyPattern = /(\s*)"([a-zA-Z_$][a-zA-Z0-9_$]*)"\s*(?=:|,|\})/g;

    // Apply property name fixes
    const beforeSecondPass = sanitized;
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

    // Track changes from second pass
    if (sanitized !== beforeSecondPass) {
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
