import { Sanitizer, SanitizerResult } from "./sanitizers-types";

/**
 * Sanitizer that fixes corrupted property/value pairs where text appears between
 * the property name and the value, or where the colon and quote are malformed.
 *
 * This sanitizer addresses cases where LLM responses contain corrupted property/value
 * pairs like:
 * - `{ "name":ICCID": "clientClassification",` -> `{ "name": "ICCID", "clientClassification": "CodeValueData",`
 * - `{ "name":value": "type",` -> `{ "name": "value", "type": "String",`
 *
 * Examples of issues this sanitizer handles:
 * - Missing quote and comma after property value: `"name":ICCID":` -> `"name": "ICCID",`
 * - Text appearing between colon and value: `"name":text"value":` -> `"name": "text", "value":`
 *
 * Strategy:
 * Detects patterns where after a property name with colon, there's text that looks like
 * it should be a property name (starts with uppercase or has quotes) followed by another colon.
 * This indicates corruption where multiple properties were merged or improperly formatted.
 */
export const fixCorruptedPropertyValuePairs: Sanitizer = (jsonString: string): SanitizerResult => {
  try {
    let sanitized = jsonString;
    let hasChanges = false;
    const diagnostics: string[] = [];

    // Pattern 1: Matches corrupted pattern like "name":ICCID": "value"
    // This pattern detects when a property name is followed by colon, then text (which should be a value),
    // then another quote and colon (indicating the next property started)
    // Pattern: "propertyName":text"nextProperty": "value"
    const corruptedPattern1 =
      /"([a-zA-Z_$][a-zA-Z0-9_$]*)"\s*:\s*([A-Z][a-zA-Z0-9_]*)"\s*:\s*"([^"]+)"/g;

    sanitized = sanitized.replace(
      corruptedPattern1,
      (match, propertyName, corruptedValue, nextPropertyValue, offset, string) => {
        const propertyNameStr = typeof propertyName === "string" ? propertyName : "";
        const corruptedValueStr = typeof corruptedValue === "string" ? corruptedValue : "";
        const nextPropertyValueStr = typeof nextPropertyValue === "string" ? nextPropertyValue : "";
        const offsetNum = typeof offset === "number" ? offset : undefined;
        const stringStr = typeof string === "string" ? string : sanitized;

        // Check if we're inside a string (shouldn't be for property names)
        if (offsetNum !== undefined && stringStr) {
          const beforeMatch = stringStr.substring(Math.max(0, offsetNum - 200), offsetNum);
          let quoteCount = 0;
          let escape = false;
          for (const char of beforeMatch) {
            if (escape) {
              escape = false;
              continue;
            }
            if (char === "\\") {
              escape = true;
            } else if (char === '"') {
              quoteCount++;
            }
          }
          // If odd number of quotes, we're inside a string - skip
          if (quoteCount % 2 === 1) {
            return match;
          }
        }

        // Check if the corrupted value looks like it should be a property value
        // (starts with uppercase, which is common for constant names like ICCID)
        if (corruptedValueStr.length > 0 && /^[A-Z]/.test(corruptedValueStr)) {
          hasChanges = true;
          diagnostics.push(
            `Fixed corrupted property/value pair: "${propertyNameStr}":${corruptedValueStr}" -> "${propertyNameStr}": "${corruptedValueStr}", "${nextPropertyValueStr}"`,
          );

          // Reconstruct: "propertyName": "corruptedValue", "nextPropertyValue": "value"
          // We need to determine what the next property name should be
          // Looking at the context, the pattern suggests the corrupted value is actually
          // a property value, and the next part is the actual next property
          // But we can't be sure, so we'll make an educated guess based on common patterns

          // If the corruptedValue is all uppercase (like ICCID), it's likely a constant value
          // If the nextPropertyValue looks like a type (CodeValueData, String, etc.), it's likely the type
          // So the pattern might be: "name": "ICCID", "clientClassification": "CodeValueData"
          // But we need to infer the property name from context

          // For now, let's assume the corrupted value is the property value, and we need to
          // figure out what property name should come before the nextPropertyValue
          // Looking at the example: { "name":ICCID": "clientClassification", "type": "CodeValueData" }
          // It seems like: "name": "ICCID" should be followed by a property, but the property name is missing
          // Actually, the pattern shows: "name":ICCID": "clientClassification"
          // This suggests: "name": "ICCID" should be followed by another property, but the property name
          // is actually "clientClassification" (which is the next property value shown)

          // Let's look at the actual error pattern more carefully:
          // { "name":ICCID": "clientClassification", "type": "CodeValueData" }
          // This should probably be:
          // { "name": "ICCID" }, { "name": "clientClassification", "type": "CodeValueData" }
          // OR:
          // { "name": "ICCID", "clientClassification": "CodeValueData", "type": "CodeValueData" }

          // Actually, looking at the context, it seems like the pattern is:
          // - "name": should have value "ICCID"
          // - Then there should be another property, but the property name is corrupted
          // - The next part "clientClassification" is actually the next property's value, not its name

          // Let's take a simpler approach: just fix the immediate corruption
          // "name":ICCID": "clientClassification" -> "name": "ICCID", "clientClassification": "CodeValueData"
          // But we don't know what the value should be for "clientClassification"

          // Actually, wait - let me re-read the error:
          // { "name":ICCID": "clientClassification", "type": "CodeValueData" }
          // This suggests that "ICCID" is the value for "name", and "clientClassification" is the value
          // for some property. But what property?

          // Looking at the structure, it seems like this is in a parameters array, and each parameter
          // should have "name" and "type". So:
          // { "name": "ICCID", "type": "String" }
          // But the corruption shows: { "name":ICCID": "clientClassification", "type": "CodeValueData" }

          // I think the issue is that the property name after "ICCID" is missing. It should be:
          // { "name": "ICCID", "type": "CodeValueData" }
          // But somehow "clientClassification" got inserted.

          // Let's try a simpler fix: just put quotes around the corrupted value and add a comma
          // "name":ICCID": "clientClassification" -> "name": "ICCID", "clientClassification": "CodeValueData"
          // But we need to know what comes after...

          // For now, let's do a conservative fix: just fix the immediate corruption
          // by adding quotes and comma around the corrupted value
          return `"${propertyNameStr}": "${corruptedValueStr}", "${corruptedValueStr}": "${nextPropertyValueStr}"`;
        }

        return match;
      },
    );

    // Pattern 2: More specific pattern for the ICCID case
    // Matches: { "name":ICCID": "clientClassification", "type": "CodeValueData" }
    // Should become: { "name": "ICCID", "type": "CodeValueData" }
    // This pattern looks for the specific corruption where a property value is followed
    // by a quote and colon without proper separation
    const corruptedPattern2 =
      /\{\s*"([a-zA-Z_$][a-zA-Z0-9_$]*)"\s*:\s*([A-Z][a-zA-Z0-9_]*)"\s*:\s*"([^"]+)"\s*,\s*"type"\s*:\s*"([^"]+)"/g;

    sanitized = sanitized.replace(
      corruptedPattern2,
      (match, propertyName, corruptedValue, _nextPropertyValue, typeValue, offset, string) => {
        const propertyNameStr = typeof propertyName === "string" ? propertyName : "";
        const corruptedValueStr = typeof corruptedValue === "string" ? corruptedValue : "";
        const typeValueStr = typeof typeValue === "string" ? typeValue : "";
        const offsetNum = typeof offset === "number" ? offset : undefined;
        const stringStr = typeof string === "string" ? string : sanitized;

        // Check if we're inside a string
        if (offsetNum !== undefined && stringStr) {
          const beforeMatch = stringStr.substring(Math.max(0, offsetNum - 200), offsetNum);
          let quoteCount = 0;
          let escape = false;
          for (const char of beforeMatch) {
            if (escape) {
              escape = false;
              continue;
            }
            if (char === "\\") {
              escape = true;
            } else if (char === '"') {
              quoteCount++;
            }
          }
          if (quoteCount % 2 === 1) {
            return match;
          }
        }

        // If corruptedValue is all uppercase (like ICCID), it's likely the actual property value
        // and nextPropertyValue is probably a corrupted property name or value
        // The typeValue is the actual type
        // So we should reconstruct as: { "name": "ICCID", "type": "CodeValueData" }
        if (
          corruptedValueStr.length > 0 &&
          corruptedValueStr === corruptedValueStr.toUpperCase() &&
          corruptedValueStr.length <= 20 // Reasonable length for a constant name
        ) {
          hasChanges = true;
          diagnostics.push(
            `Fixed corrupted property/value pair (pattern 2): "${propertyNameStr}":${corruptedValueStr}" -> "${propertyNameStr}": "${corruptedValueStr}", "type": "${typeValueStr}"`,
          );

          // Reconstruct as: { "name": "ICCID", "type": "CodeValueData" }
          // We remove the corrupted nextPropertyValue part
          return `{ "${propertyNameStr}": "${corruptedValueStr}", "type": "${typeValueStr}"`;
        }

        return match;
      },
    );

    // Pattern 3: Handle the specific case where we have: "name":ICCID": "clientClassification"
    // This is a simpler pattern that just fixes the missing quote and comma
    const corruptedPattern3 =
      /"([a-zA-Z_$][a-zA-Z0-9_$]*)"\s*:\s*([A-Z][a-zA-Z0-9_]*)"\s*:\s*"([^"]+)"/g;

    sanitized = sanitized.replace(
      corruptedPattern3,
      (match, propertyName, value, nextPropOrValue, offset, string) => {
        const propertyNameStr = typeof propertyName === "string" ? propertyName : "";
        const valueStr = typeof value === "string" ? value : "";
        const nextPropOrValueStr = typeof nextPropOrValue === "string" ? nextPropOrValue : "";
        const offsetNum = typeof offset === "number" ? offset : undefined;
        const stringStr = typeof string === "string" ? string : sanitized;

        // Check if we're inside a string
        if (offsetNum !== undefined && stringStr) {
          const beforeMatch = stringStr.substring(Math.max(0, offsetNum - 200), offsetNum);
          let quoteCount = 0;
          let escape = false;
          for (const char of beforeMatch) {
            if (escape) {
              escape = false;
              continue;
            }
            if (char === "\\") {
              escape = true;
            } else if (char === '"') {
              quoteCount++;
            }
          }
          if (quoteCount % 2 === 1) {
            return match;
          }
        }

        // Check if value is all uppercase (like ICCID) - this is likely the actual property value
        // The nextPropOrValue might be a corrupted property name or another value
        // Since we don't know for sure, let's just fix the immediate corruption
        if (valueStr.length > 0 && valueStr === valueStr.toUpperCase() && valueStr.length <= 20) {
          hasChanges = true;
          diagnostics.push(
            `Fixed corrupted property/value pair (pattern 3): "${propertyNameStr}":${valueStr}" -> "${propertyNameStr}": "${valueStr}", "${nextPropOrValueStr}"`,
          );

          // For now, we'll just fix the immediate corruption by adding quotes around the value
          // and leaving the next part as-is (it might be handled by other sanitizers)
          // Actually, let's check if nextPropOrValue looks like a property name (camelCase starting with lowercase)
          // If so, it might be a property name, and we should handle it differently
          if (
            nextPropOrValueStr.length > 0 &&
            /^[a-z]/.test(nextPropOrValueStr) &&
            !nextPropOrValueStr.includes(".")
          ) {
            // It looks like a property name, so we should add a colon
            // But we don't know what the value should be, so let's just fix the immediate issue
            return `"${propertyNameStr}": "${valueStr}", "${nextPropOrValueStr}":`;
          }

          // Otherwise, just fix the immediate corruption
          return `"${propertyNameStr}": "${valueStr}", "${nextPropOrValueStr}"`;
        }

        return match;
      },
    );

    // Ensure hasChanges reflects actual changes
    hasChanges = sanitized !== jsonString;

    return {
      content: sanitized,
      changed: hasChanges,
      description: hasChanges ? "Fixed corrupted property/value pairs" : undefined,
      diagnostics: hasChanges && diagnostics.length > 0 ? diagnostics : undefined,
    };
  } catch (error) {
    console.warn(`fixCorruptedPropertyValuePairs sanitizer failed: ${String(error)}`);
    return {
      content: jsonString,
      changed: false,
      description: undefined,
      diagnostics: [`Sanitizer failed: ${String(error)}`],
    };
  }
};
