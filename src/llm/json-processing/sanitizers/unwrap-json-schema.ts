import { Sanitizer } from "./sanitizers-types";

/**
 * Unwraps JSON content when the LLM mistakenly returns a JSON Schema definition
 * instead of the actual data. Detects the pattern where the response has:
 * - "type": "object" at the top level
 * - "properties": {...} containing the actual data values
 *
 * This transforms:
 *   { "type": "object", "properties": { "field": "value" } }
 * Into:
 *   { "field": "value" }
 *
 * Only applies the transformation when:
 * 1. The JSON can be parsed
 * 2. It has exactly "type" and "properties" as top-level keys (or just those two plus optional additional metadata)
 * 3. "type" is "object"
 * 4. "properties" is a non-null object
 */
export const unwrapJsonSchema: Sanitizer = (input) => {
  try {
    const parsed = JSON.parse(input) as unknown;

    // Check if this looks like a JSON Schema object definition
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      !Array.isArray(parsed) &&
      "type" in parsed &&
      "properties" in parsed
    ) {
      const obj = parsed as Record<string, unknown>;

      // Verify it's a JSON Schema "object" type with properties
      if (
        obj.type === "object" &&
        typeof obj.properties === "object" &&
        obj.properties !== null &&
        !Array.isArray(obj.properties)
      ) {
        // Extract the properties content
        const unwrapped = obj.properties;

        // Only unwrap if properties is non-empty
        if (Object.keys(unwrapped as Record<string, unknown>).length > 0) {
          return {
            content: JSON.stringify(unwrapped, null, 2),
            changed: true,
            description: "Unwrapped JSON Schema to extract properties",
          };
        }
      }
    }

    // Not a JSON Schema pattern, return unchanged
    return { content: input, changed: false };
  } catch {
    // If parsing fails, return unchanged and let other sanitizers handle it
    return { content: input, changed: false };
  }
};
