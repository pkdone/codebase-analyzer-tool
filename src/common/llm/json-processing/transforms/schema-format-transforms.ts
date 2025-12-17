import type { LLMSanitizerConfig } from "../../config/llm-module-config.types";

/**
 * Generic schema fixing transformations that operate on already-parsed JSON objects.
 * These transformations are schema-agnostic and work with any JSON structure.
 */

/**
 * Unwraps JSON Schema structures where the LLM mistakenly returns a schema
 * definition instead of the actual data. Detects and transforms:
 *   { "type": "object", "properties": { "field": "value" } }
 * Into:
 *   { "field": "value" }
 */
export function unwrapJsonSchemaStructure(parsed: unknown, _config?: LLMSanitizerConfig): unknown {
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
      const props = obj.properties as Record<string, unknown>;

      // Only unwrap if properties is non-empty
      if (Object.keys(props).length > 0) {
        return props;
      }
    }
  }

  return parsed;
}

/**
 * Coerces string values to numbers for known numeric properties.
 * This handles cases where LLMs return numeric values as strings (e.g., "linesOfCode": "19" -> "linesOfCode": 19).
 *
 * Recursively processes objects and arrays to find and fix numeric properties at any nesting level.
 *
 * @param parsed - The parsed JSON data to transform
 * @param config - Optional sanitizer configuration containing numeric properties
 * @returns The transformed data with string values coerced to numbers for numeric properties
 */
export function coerceNumericProperties(parsed: unknown, config?: LLMSanitizerConfig): unknown {
  if (parsed === null || parsed === undefined) {
    return parsed;
  }

  if (Array.isArray(parsed)) {
    return parsed.map((item) => coerceNumericProperties(item, config));
  }

  if (typeof parsed === "object") {
    const obj = parsed as Record<string, unknown>;
    const result: Record<string, unknown> = {};
    const numericProperties = config?.numericProperties ?? [];

    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();

      // Check if this is a known numeric property with a string value
      if (
        numericProperties.includes(lowerKey) &&
        typeof value === "string" &&
        value.trim() !== ""
      ) {
        // Try to parse as number
        const numValue = Number(value.trim());
        if (!isNaN(numValue) && isFinite(numValue)) {
          result[key] = numValue;
          continue;
        }
      }

      // Recursively process nested objects and arrays
      if (typeof value === "object" && value !== null) {
        result[key] = coerceNumericProperties(value, config);
      } else {
        result[key] = value;
      }
    }

    return result;
  }

  return parsed;
}
