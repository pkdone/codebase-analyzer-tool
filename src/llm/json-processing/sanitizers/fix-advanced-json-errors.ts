import { Sanitizer, SanitizerResult } from "./sanitizers-types";

/**
 * Advanced sanitizer that fixes complex JSON errors from LLM responses.
 *
 * This sanitizer handles:
 * 1. Duplicate/corrupted array entries (e.g., "extra.persistence.Version" after "jakarta.persistence.Version")
 * 2. Truncated property names (e.g., 'se":' -> '"name":')
 * 3. Text appearing outside string values (e.g., text after closing quote that should be inside)
 * 4. Stray text in JSON structures (e.g., "so many" between objects)
 * 5. Missing quotes after colons (e.g., '"name":isInterestTransfer":' -> '"name": "isInterestTransfer"')
 *
 * @param input - The raw string content to sanitize
 * @returns Sanitizer result with advanced fixes applied
 */
export const fixAdvancedJsonErrors: Sanitizer = (input: string): SanitizerResult => {
  try {
    if (!input) {
      return { content: input, changed: false };
    }

    let sanitized = input;
    let hasChanges = false;
    const diagnostics: string[] = [];

    // Helper to check if we're inside a string at a given position
    const isInStringAt = (position: number, content: string): boolean => {
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
    };

    // ===== Pattern 1: Remove duplicate/corrupted array entries =====
    // Pattern: "valid.entry",\n    corrupted.entry", or "valid.entry",\n    extra.entry",
    // where corrupted/extra entry is missing opening quote
    const duplicateEntryPattern1 = /"([^"]+)"\s*,\s*\n\s*([a-z]+)\.[^"]*"\s*,/g;
    sanitized = sanitized.replace(
      duplicateEntryPattern1,
      (match, validEntry, prefix, offset: unknown) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        if (isInStringAt(numericOffset, sanitized)) {
          return match;
        }

        // Check if we're in an array context and the prefix looks like a corruption marker
        const beforeMatch = sanitized.substring(Math.max(0, numericOffset - 100), numericOffset);
        const isInArrayContext = /[[,]\s*$/.test(beforeMatch) || /,\s*\n\s*$/.test(beforeMatch);
        const corruptionMarkers = ["extra", "duplicate", "repeat", "copy"];
        const prefixStr = typeof prefix === "string" ? prefix : "";

        if (isInArrayContext && corruptionMarkers.includes(prefixStr.toLowerCase())) {
          hasChanges = true;
          const validEntryStr = typeof validEntry === "string" ? validEntry : "";
          diagnostics.push(
            `Removed duplicate/corrupted array entry starting with "${prefixStr}" after "${validEntryStr}"`,
          );
          return `"${validEntryStr}",`;
        }

        return match;
      },
    );

    // Pattern 1b: "valid.entry",\n    "corrupted.entry", where corrupted starts with corruption marker
    const duplicateEntryPattern2 =
      /"([^"]+)"\s*,\s*\n\s*"(extra|duplicate|repeat|copy)[^"]*"(\s*,\s*|\s*\n)/g;
    sanitized = sanitized.replace(
      duplicateEntryPattern2,
      (match, validEntry, prefix, delimiter, offset: unknown) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        if (isInStringAt(numericOffset, sanitized)) {
          return match;
        }

        const beforeMatch = sanitized.substring(Math.max(0, numericOffset - 100), numericOffset);
        const isInArrayContext = /[[,]\s*$/.test(beforeMatch) || /,\s*\n\s*$/.test(beforeMatch);

        if (isInArrayContext) {
          hasChanges = true;
          const delimiterStr = typeof delimiter === "string" ? delimiter : "";
          diagnostics.push(
            `Removed duplicate/corrupted array entry starting with "${prefix}" after "${validEntry}"`,
          );
          return `"${validEntry}"${delimiterStr}`;
        }

        return match;
      },
    );

    // ===== Pattern 2: Fix truncated property names =====
    // Pattern: 'se":' or similar property name fragments followed by colon and value
    // This handles cases where the property name got truncated (e.g., "purpose" -> "se", "codeSmells" -> "alues")
    const truncatedPropertyPattern = /(\s*)([a-z]{2,10})"\s*:\s*/g;
    const commonPropertyStarts: Record<string, string> = {
      se: "purpose",
      na: "name",
      nam: "name",
      pu: "purpose",
      purpos: "purpose",
      purpo: "purpose",
      de: "description",
      descript: "description",
      im: "implementation",
      implemen: "implementation",
      pa: "parameters",
      re: "returnType",
      retur: "returnType",
      ty: "type",
      alues: "codeSmells",
      lues: "codeSmells",
      ues: "codeSmells",
      es: "codeSmells",
      eferences: "references",
      refere: "references",
      refer: "references",
    };

    sanitized = sanitized.replace(
      truncatedPropertyPattern,
      (match, whitespace, truncated, offset: unknown) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        if (isInStringAt(numericOffset, sanitized)) {
          return match;
        }

        // Check if this looks like a property name context (after comma, brace, or newline)
        const beforeMatch = sanitized.substring(Math.max(0, numericOffset - 50), numericOffset);
        const isPropertyContext =
          /[{,]\s*$/.test(beforeMatch) ||
          /}\s*,\s*\n\s*$/.test(beforeMatch) ||
          /\n\s*$/.test(beforeMatch) ||
          /\[\s*$/.test(beforeMatch);

        const truncatedStr = typeof truncated === "string" ? truncated : "";
        const fixedName = commonPropertyStarts[truncatedStr];
        if (isPropertyContext && fixedName) {
          hasChanges = true;
          diagnostics.push(`Fixed truncated property name: "${truncatedStr}" -> "${fixedName}"`);
          const whitespaceStr = typeof whitespace === "string" ? whitespace : "";
          return `${whitespaceStr}"${fixedName}": `;
        }

        return match;
      },
    );

    // ===== Pattern 3: Remove text appearing outside string values =====
    // Pattern: "value",\n    text that appears after closing quote
    // This handles cases like: "lombok.RequiredArgsConstructor",\nfrom the API layer...
    const textOutsideStringPattern =
      /"([^"]+)"\s*,\s*\n\s*([a-z][^"]{20,200}?)(?=\s*[,}\]]|\s*\n\s*"[a-zA-Z])/g;
    sanitized = sanitized.replace(
      textOutsideStringPattern,
      (match, value, strayText, offset: unknown) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        if (isInStringAt(numericOffset, sanitized)) {
          return match;
        }

        // Check if the stray text looks like descriptive text (not JSON structure)
        const strayTextStr = typeof strayText === "string" ? strayText : "";
        const looksLikeDescriptiveText =
          /\b(the|a|an|is|are|was|were|this|that|from|to|for|with|by|in|on|at|suggests|pattern|use|layer)\b/i.test(
            strayTextStr,
          ) &&
          !strayTextStr.includes('"') &&
          !strayTextStr.includes("{") &&
          !strayTextStr.includes("}") &&
          !strayTextStr.includes("[") &&
          !strayTextStr.includes("]");

        if (looksLikeDescriptiveText) {
          hasChanges = true;
          const valueStr = typeof value === "string" ? value : "";
          diagnostics.push(
            `Removed descriptive text outside string: "${valueStr}" + "${strayTextStr.substring(0, 50)}..."`,
          );
          return `"${valueStr}",`;
        }

        return match;
      },
    );

    // ===== Pattern 4: Remove stray text like "so many" =====
    // Pattern: },\n    stray text\n    {
    const strayTextPattern = /([}\]])\s*,\s*\n\s*([a-z\s]{2,50})\n\s*([{"])/g;
    sanitized = sanitized.replace(
      strayTextPattern,
      (match, delimiter, strayText, nextToken, offset: unknown) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        if (isInStringAt(numericOffset, sanitized)) {
          return match;
        }

        const strayTextStr = typeof strayText === "string" ? strayText : "";
        const delimiterStr = typeof delimiter === "string" ? delimiter : "";
        const nextTokenStr = typeof nextToken === "string" ? nextToken : "";

        // Check if it's clearly stray text (not JSON keywords or structure)
        const isStrayText =
          !strayTextStr.includes('"') &&
          !strayTextStr.includes("{") &&
          !strayTextStr.includes("}") &&
          !strayTextStr.includes("[") &&
          !strayTextStr.includes("]") &&
          !/^\s*(true|false|null|undefined)\s*$/.test(strayTextStr);

        if (isStrayText) {
          hasChanges = true;
          diagnostics.push(`Removed stray text: "${strayTextStr.trim()}"`);
          return `${delimiterStr},\n    ${nextTokenStr}`;
        }

        return match;
      },
    );

    // ===== Pattern 4b: Remove text appearing after JSON structure ends =====
    // Pattern: }\n    so many methods... I will stop here.
    // This handles cases where text appears after the final closing brace
    // Also handles: },\n    so many me
    const textAfterJsonEndPattern = /(}\s*)\n\s*([a-z][a-z\s]{5,200}?)(\.|\.\.\.|!|\?)?\s*$/i;
    sanitized = sanitized.replace(
      textAfterJsonEndPattern,
      (match, closingBrace, strayText, _punctuation, offset: unknown) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        if (isInStringAt(numericOffset, sanitized)) {
          return match;
        }

        const strayTextStr = typeof strayText === "string" ? strayText : "";
        const closingBraceStr = typeof closingBrace === "string" ? closingBrace : "";

        // Check if it looks like descriptive text (contains common words like "so many", "I will", "stop", etc.)
        const looksLikeDescriptiveText =
          /\b(so\s+many|I\s+will|stop|here|methods|continue|proceed|skip|ignore)\b/i.test(
            strayTextStr,
          ) &&
          !strayTextStr.includes('"') &&
          !strayTextStr.includes("{") &&
          !strayTextStr.includes("}") &&
          !strayTextStr.includes("[") &&
          !strayTextStr.includes("]");

        if (looksLikeDescriptiveText) {
          hasChanges = true;
          const displayText =
            strayTextStr.length > 50 ? `${strayTextStr.substring(0, 47)}...` : strayTextStr;
          diagnostics.push(`Removed text after JSON structure: "${displayText}"`);
          return closingBraceStr;
        }

        return match;
      },
    );

    // Pattern 4c: Remove text appearing after JSON structure in the middle (like "so many me" after a closing brace)
    // Pattern: },\n    so many me
    const textAfterJsonMiddlePattern = /(}\s*)\s*,\s*\n\s*([a-z][a-z\s]{2,50}?)(?=\s*[}\]]|$)/i;
    sanitized = sanitized.replace(
      textAfterJsonMiddlePattern,
      (match, closingBrace, strayText, offset: unknown) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        if (isInStringAt(numericOffset, sanitized)) {
          return match;
        }

        const strayTextStr = typeof strayText === "string" ? strayText : "";
        const closingBraceStr = typeof closingBrace === "string" ? closingBrace : "";

        // Check if it looks like descriptive text
        const looksLikeDescriptiveText =
          /\b(so\s+many|I\s+will|stop|here|methods|continue|proceed|skip|ignore)\b/i.test(
            strayTextStr,
          ) &&
          !strayTextStr.includes('"') &&
          !strayTextStr.includes("{") &&
          !strayTextStr.includes("}") &&
          !strayTextStr.includes("[") &&
          !strayTextStr.includes("]");

        if (looksLikeDescriptiveText) {
          hasChanges = true;
          const displayText =
            strayTextStr.length > 50 ? `${strayTextStr.substring(0, 47)}...` : strayTextStr;
          diagnostics.push(`Removed text after JSON structure: "${displayText}"`);
          return closingBraceStr;
        }

        return match;
      },
    );

    // ===== Pattern 5: Fix missing quotes after colons =====
    // Pattern: "name":isInterestTransfer": "boolean" -> "name": "isInterestTransfer",
    // The structure is: propertyName:unquotedValue": "nextPropertyValue"
    // This should become: propertyName: "unquotedValue",
    // Note: The "nextPropertyValue" appears to be orphaned and will be handled by subsequent sanitizers
    const missingQuoteAfterColonPattern =
      /"([^"]+)"\s*:\s*([a-zA-Z_$][a-zA-Z0-9_$]*)"\s*:\s*"([^"]+)"/g;
    sanitized = sanitized.replace(
      missingQuoteAfterColonPattern,
      (match, propertyName, unquotedValue, _nextValue, offset: unknown) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        if (isInStringAt(numericOffset, sanitized)) {
          return match;
        }

        const propertyNameStr = typeof propertyName === "string" ? propertyName : "";
        const unquotedValueStr = typeof unquotedValue === "string" ? unquotedValue : "";

        // Check if this looks like a property value (not a JSON keyword)
        const jsonKeywords = ["true", "false", "null", "undefined"];
        if (!jsonKeywords.includes(unquotedValueStr.toLowerCase())) {
          hasChanges = true;
          diagnostics.push(
            `Fixed missing quote after colon: "${propertyNameStr}":${unquotedValueStr}" -> "${propertyNameStr}": "${unquotedValueStr}"`,
          );
          // The pattern is: "name":isInterestTransfer": "boolean"
          // This should become: "name": "isInterestTransfer",
          // The "boolean" part will be cleaned up by subsequent sanitizers or may need manual fixing
          // For now, we just fix the immediate issue
          return `"${propertyNameStr}": "${unquotedValueStr}",`;
        }

        return match;
      },
    );

    // ===== Pattern 6: Fix text after property values (e.g., "is nullable") =====
    // Pattern: "type": "Long"\n    is nullable"\n    "nextProperty": -> "type": "Long",
    const textAfterValuePattern1 =
      /"([^"]+)"\s*:\s*"([^"]+)"\s*\n\s*([a-z\s]+)"\s*\n\s*"([^"]+)"\s*:/g;
    sanitized = sanitized.replace(
      textAfterValuePattern1,
      (match, prop1, value1, strayText, prop2, offset: unknown) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        if (isInStringAt(numericOffset, sanitized)) {
          return match;
        }

        const strayTextStr = typeof strayText === "string" ? strayText : "";
        const prop1Str = typeof prop1 === "string" ? prop1 : "";
        const value1Str = typeof value1 === "string" ? value1 : "";
        const prop2Str = typeof prop2 === "string" ? prop2 : "";

        // Check if stray text looks like a comment/annotation (e.g., "is nullable")
        if (
          /^(is|are|was|were|can|should|must|may)\s+[a-z]+/i.test(strayTextStr) ||
          strayTextStr.toLowerCase().includes("nullable")
        ) {
          hasChanges = true;
          diagnostics.push(
            `Removed annotation text after property value: "${prop1Str}": "${value1Str}" + "${strayTextStr}"`,
          );
          return `"${prop1Str}": "${value1Str}",\n    "${prop2Str}":`;
        }

        return match;
      },
    );

    // ===== Pattern 7: Remove stray text in arrays (e.g., "from ...", "because it ...") =====
    // Pattern: `"value",\nfrom "org.apache..."` -> `"value",\n    "org.apache...",`
    // Also handles: `"value",\nbecause it is a private..."org.apache..."` -> `"value",\n    "org.apache...",`
    const strayTextInArrayPattern =
      /"([^"]+)"\s*,\s*\n\s*(from|because|since|as|when|where|while|if|although|though)\s+[^"]{10,200}?"([^"]+)"\s*,/g;
    sanitized = sanitized.replace(
      strayTextInArrayPattern,
      (match, value1, _strayPrefix, value2, offset: unknown) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        if (isInStringAt(numericOffset, sanitized)) {
          return match;
        }

        // Check if we're in an array context
        const beforeMatch = sanitized.substring(Math.max(0, numericOffset - 200), numericOffset);
        const isInArray =
          /\[\s*$/.test(beforeMatch) ||
          /,\s*\n\s*$/.test(beforeMatch) ||
          /"\s*,\s*\n\s*$/.test(beforeMatch);

        if (isInArray) {
          hasChanges = true;
          const value1Str = typeof value1 === "string" ? value1 : "";
          const value2Str = typeof value2 === "string" ? value2 : "";
          diagnostics.push(`Removed stray text in array between "${value1Str}" and "${value2Str}"`);
          return `"${value1Str}",\n    "${value2Str}",`;
        }

        return match;
      },
    );

    // Pattern 7b: Handle stray text at end of array elements
    // Pattern: `"value",\nfrom "org.apache..."` -> `"value",\n    "org.apache..."` (when it's the last element)
    const strayTextAtEndOfArrayElementPattern =
      /"([^"]+)"\s*,\s*\n\s*(from|because|since|as|when|where|while|if|although|though)\s+[^"]{10,200}?"([^"]+)"\s*(\n\s*[}\],])/g;
    sanitized = sanitized.replace(
      strayTextAtEndOfArrayElementPattern,
      (match, value1, _strayPrefix, value2, terminator, offset: unknown) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        if (isInStringAt(numericOffset, sanitized)) {
          return match;
        }

        // Check if we're in an array context
        const beforeMatch = sanitized.substring(Math.max(0, numericOffset - 200), numericOffset);
        const isInArray =
          /\[\s*$/.test(beforeMatch) ||
          /,\s*\n\s*$/.test(beforeMatch) ||
          /"\s*,\s*\n\s*$/.test(beforeMatch);

        if (isInArray) {
          hasChanges = true;
          const value1Str = typeof value1 === "string" ? value1 : "";
          const value2Str = typeof value2 === "string" ? value2 : "";
          const terminatorStr = typeof terminator === "string" ? terminator : "";
          diagnostics.push(
            `Removed stray text in array and preserved both values: "${value1Str}" and "${value2Str}"`,
          );
          return `"${value1Str}",\n    "${value2Str}"${terminatorStr}`;
        }

        return match;
      },
    );

    // Pattern 7c: Handle stray text that ends with a quote but isn't a valid array element
    // Pattern: `"value",\nbecause it is a private inner class and not a public method.",\n    "nextValue",`
    // This handles cases where the stray text ends with a quote and comma, but isn't a valid JSON string
    const strayTextWithQuotePattern =
      /"([^"]+)"\s*,\s*\n\s*(from|because|since|as|when|where|while|if|although|though)\s+[^"]{10,200}?"\s*,\s*\n\s*"([^"]+)"\s*,/g;
    sanitized = sanitized.replace(
      strayTextWithQuotePattern,
      (match, value1, _strayPrefix, value2, offset: unknown) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        if (isInStringAt(numericOffset, sanitized)) {
          return match;
        }

        // Check if we're in an array context
        const beforeMatch = sanitized.substring(Math.max(0, numericOffset - 200), numericOffset);
        const isInArray =
          /\[\s*$/.test(beforeMatch) ||
          /,\s*\n\s*$/.test(beforeMatch) ||
          /"\s*,\s*\n\s*$/.test(beforeMatch);

        if (isInArray) {
          hasChanges = true;
          const value1Str = typeof value1 === "string" ? value1 : "";
          const value2Str = typeof value2 === "string" ? value2 : "";
          diagnostics.push(
            `Removed stray text with quote in array between "${value1Str}" and "${value2Str}"`,
          );
          return `"${value1Str}",\n    "${value2Str}",`;
        }

        return match;
      },
    );

    // Pattern 6b: "type": "Long"\n    "is nullable" -> "type": "Long",
    const textAfterValuePattern2 =
      /"([^"]+)"\s*:\s*"([^"]+)"\s*\n\s*"([^"]+)"\s*,\s*\n\s*"([^"]+)"\s*:/g;
    sanitized = sanitized.replace(
      textAfterValuePattern2,
      (match, prop1, value1, strayText, prop2, offset: unknown) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        if (isInStringAt(numericOffset, sanitized)) {
          return match;
        }

        const strayTextStr = typeof strayText === "string" ? strayText : "";
        const prop1Str = typeof prop1 === "string" ? prop1 : "";
        const value1Str = typeof value1 === "string" ? value1 : "";
        const prop2Str = typeof prop2 === "string" ? prop2 : "";

        // Check if stray text looks like a comment/annotation
        if (
          /^(is|are|was|were|can|should|must|may)\s+[a-z]+/i.test(strayTextStr) ||
          strayTextStr.toLowerCase().includes("nullable")
        ) {
          hasChanges = true;
          diagnostics.push(
            `Removed annotation text after property value: "${prop1Str}": "${value1Str}" + "${strayTextStr}"`,
          );
          return `"${prop1Str}": "${value1Str}",\n    "${prop2Str}":`;
        }

        return match;
      },
    );

    // Ensure hasChanges reflects actual changes
    hasChanges = sanitized !== input;

    if (!hasChanges) {
      return { content: input, changed: false };
    }

    return {
      content: sanitized,
      changed: true,
      description: "Fixed advanced JSON errors",
      diagnostics: diagnostics.length > 0 ? diagnostics : undefined,
    };
  } catch (error) {
    console.warn(`fixAdvancedJsonErrors sanitizer failed: ${String(error)}`);
    return {
      content: input,
      changed: false,
      description: undefined,
      diagnostics: [`Sanitizer failed: ${String(error)}`],
    };
  }
};
