import type { LLMSanitizerConfig } from "../../config/llm-module-config.types";
import type { JsonValue } from "../../types/json-value.types";

/**
 * Generic schema fixing transformations that operate on already-parsed JSON objects.
 * These transformations are schema-agnostic and work with any JSON structure.
 */

/**
 * JSON Schema type values that indicate a field definition rather than actual data.
 */
const JSON_SCHEMA_TYPE_VALUES = new Set([
  "string",
  "number",
  "integer",
  "boolean",
  "object",
  "array",
  "null",
]);

/**
 * JSON Schema meta-properties that indicate an object is a schema definition.
 * These are properties that appear in JSON Schema but not in normal data.
 */
const JSON_SCHEMA_META_PROPERTIES = new Set([
  "$schema",
  "additionalProperties",
  "required",
  "enum",
  "allOf",
  "anyOf",
  "oneOf",
  "items",
  "minLength",
  "maxLength",
  "minimum",
  "maximum",
  "pattern",
  "format",
  "default",
]);

/**
 * Checks if an object appears to be a JSON Schema primitive field definition.
 * A primitive field definition has:
 * - A "type" property with a primitive JSON Schema type value (string, number, etc.)
 * - A "description" property containing the actual value
 * - Does NOT have a "properties" key (that would make it an object schema)
 *
 * Example: { "type": "string", "description": "actual value" }
 */
function isJsonSchemaPrimitiveFieldDefinition(obj: Record<string, unknown>): boolean {
  // Must have "type" with a valid JSON Schema type value
  if (!Object.hasOwn(obj, "type") || typeof obj.type !== "string") {
    return false;
  }

  if (!JSON_SCHEMA_TYPE_VALUES.has(obj.type)) {
    return false;
  }

  // Must have "description" property (this contains the actual value)
  if (!Object.hasOwn(obj, "description")) {
    return false;
  }

  // If it has "properties", it's an object schema, not a primitive field
  // In this case, the actual data is in properties, not description
  if (Object.hasOwn(obj, "properties")) {
    return false;
  }

  // Check for schema meta-properties to increase confidence this is a schema definition
  const hasSchemaMetaProperties = Object.keys(obj).some((key) =>
    JSON_SCHEMA_META_PROPERTIES.has(key),
  );

  // If it has type + description + schema meta-properties (like allOf, enum, etc.), it's a schema field
  if (hasSchemaMetaProperties) {
    return true;
  }

  // If it only has "type" and "description" (and possibly nothing else), it's likely a schema field
  // This handles the common case: { "type": "string", "description": "actual value" }
  const keys = Object.keys(obj);
  if (keys.length <= 3 && keys.includes("type") && keys.includes("description")) {
    return true;
  }

  return false;
}

/**
 * Checks if an object appears to be a JSON Schema object definition with embedded data or
 * schema field definitions that should be extracted.
 *
 * This pattern occurs when the LLM returns:
 * { "type": "object", "properties": { ...actual data or schema fields... }, "description": "...", ... }
 *
 * In this case, the actual data is in "properties", not "description".
 *
 * We detect this pattern when:
 * 1. Object has type: "object" and a "properties" field
 * 2. Object has schema meta-properties (required, additionalProperties, etc.)
 * 3. Properties contain either:
 *    - Direct data values (strings, numbers, arrays)
 *    - Schema field definitions (type+description objects) that need extraction
 */
function isJsonSchemaObjectWithDataInProperties(obj: Record<string, unknown>): boolean {
  // Must be type: "object" with a properties field
  if (obj.type !== "object" || !Object.hasOwn(obj, "properties")) {
    return false;
  }

  const props = obj.properties;
  if (typeof props !== "object" || props === null || Array.isArray(props)) {
    return false;
  }

  // Check if it has schema meta-properties (required, additionalProperties, etc.)
  const hasSchemaMetaProperties = Object.keys(obj).some((key) =>
    JSON_SCHEMA_META_PROPERTIES.has(key),
  );

  if (!hasSchemaMetaProperties) {
    return false;
  }

  // Check if the properties contain data values or schema field definitions
  const propsObj = props as Record<string, unknown>;
  const propValues = Object.values(propsObj);

  // Properties contain extractable content if any of:
  // - Primitive values (data)
  // - Arrays (data)
  // - Objects without type (data)
  // - Schema field definitions (type + description) that can be extracted
  const hasExtractableContent = propValues.some((val) => {
    if (val === null || typeof val !== "object") {
      return true; // Primitive value = extractable data
    }
    if (Array.isArray(val)) {
      return true; // Array value = extractable data
    }
    // Object value - check if it looks like a schema field or data
    const valObj = val as Record<string, unknown>;

    // No type = regular data object
    if (!Object.hasOwn(valObj, "type")) {
      return true;
    }

    // Invalid JSON Schema type = regular data object
    if (!JSON_SCHEMA_TYPE_VALUES.has(valObj.type as string)) {
      return true;
    }

    // Has valid type - could be schema field definition if it also has description
    // Schema field definitions ARE extractable (we'll extract their description)
    if (Object.hasOwn(valObj, "description")) {
      return true; // Schema field definition = extractable
    }

    // Type but no description - ambiguous, but if it has properties it might be nested schema
    if (Object.hasOwn(valObj, "properties")) {
      return true; // Nested object schema = recursively extractable
    }

    return false;
  });

  return hasExtractableContent;
}

/**
 * Recursively extracts actual values from JSON Schema field definitions.
 * Handles multiple patterns:
 * 1. Primitive fields: { "type": "string", "description": "value" } -> "value"
 * 2. Object fields with data in properties: { "type": "object", "properties": {...data...} } -> {...data...}
 *
 * Returns JsonValue since the output is guaranteed to be JSON-serializable data
 * extracted from schema definitions.
 */
function extractSchemaFieldValues(value: unknown): JsonValue {
  // Handle null/undefined - convert undefined to null for JsonValue compatibility
  if (value === null || value === undefined) {
    return null;
  }

  // Handle arrays - recursively process each element
  if (Array.isArray(value)) {
    return value.map((item) => extractSchemaFieldValues(item));
  }

  // Handle objects
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;

    // Case 1: Primitive field definition - extract from description
    if (isJsonSchemaPrimitiveFieldDefinition(obj)) {
      const extractedValue = obj.description;

      // If the extracted value is itself an object/array, recursively process it
      if (typeof extractedValue === "object" && extractedValue !== null) {
        return extractSchemaFieldValues(extractedValue);
      }

      // Cast to JsonValue - extractedValue is a primitive (string, number, boolean, null)
      return extractedValue as JsonValue;
    }

    // Case 2: Object schema with data in properties - extract from properties
    if (isJsonSchemaObjectWithDataInProperties(obj)) {
      const props = obj.properties as Record<string, unknown>;
      // Recursively process the properties (which may contain nested schema fields)
      return extractSchemaFieldValues(props);
    }

    // Not a schema field definition - recursively process all properties
    const result: Record<string, JsonValue> = {};
    for (const [key, propValue] of Object.entries(obj)) {
      result[key] = extractSchemaFieldValues(propValue);
    }
    return result;
  }

  // Primitives pass through unchanged - cast since TypeScript can't narrow fully here
  return value as JsonValue;
}

/**
 * Unwraps JSON Schema structures where the LLM mistakenly returns a schema
 * definition instead of the actual data.
 *
 * Handles two levels of schema confusion:
 * 1. Top-level schema wrapper: { "type": "object", "properties": { ... } }
 * 2. Nested field definitions: { "field": { "type": "string", "description": "value" } }
 *
 * Transforms:
 *   {
 *     "type": "object",
 *     "properties": {
 *       "purpose": { "type": "string", "description": "Actual purpose text" },
 *       "count": { "type": "number", "description": 42 }
 *     }
 *   }
 * Into:
 *   { "purpose": "Actual purpose text", "count": 42 }
 */
export function unwrapJsonSchemaStructure(parsed: unknown, _config?: LLMSanitizerConfig): unknown {
  let result = parsed;

  // Step 1: Handle top-level schema wrapper
  if (
    typeof result === "object" &&
    result !== null &&
    !Array.isArray(result) &&
    "type" in result &&
    "properties" in result
  ) {
    const obj = result as Record<string, unknown>;

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
        result = props;
      }
    }
  }

  // Step 2: Recursively extract values from nested schema field definitions
  result = extractSchemaFieldValues(result);

  return result;
}

/**
 * Attempts to extract a numeric value from a string that may contain additional text.
 * This handles cases where LLMs return values like "~150 items" or "approximately 50".
 *
 * Extraction strategy:
 * 1. First try strict number parsing (handles "19", "3.14", "-5")
 * 2. Then try extracting leading numeric sequences (handles "150 items", "~50 units")
 * 3. Then try extracting embedded numeric sequences (handles "approx 150 lines")
 *
 * @param value - The string value to extract a number from
 * @returns The extracted number, or NaN if no valid number could be extracted
 */
function extractNumericValue(value: string): number {
  const trimmed = value.trim();

  // Strategy 1: Strict parsing - handles clean numeric strings
  const strictValue = Number(trimmed);
  if (!Number.isNaN(strictValue) && Number.isFinite(strictValue)) {
    return strictValue;
  }

  // Strategy 2: Leading numeric sequence (with optional prefix characters like ~ or ≈)
  // Handles: "~150 items", "≈50 units", "-5 degrees"
  const leadingNumericMatch = /^[~≈]?\s*(-?\d+(?:\.\d+)?)/.exec(trimmed);
  if (leadingNumericMatch) {
    const extracted = Number(leadingNumericMatch[1]);
    if (!Number.isNaN(extracted) && Number.isFinite(extracted)) {
      return extracted;
    }
  }

  // Strategy 3: Embedded numeric sequence (for phrases like "approximately 150")
  // Only extract if there's a clear number with word boundaries
  const embeddedNumericMatch = /\b(-?\d+(?:\.\d+)?)\b/.exec(trimmed);
  if (embeddedNumericMatch) {
    const extracted = Number(embeddedNumericMatch[1]);
    if (!Number.isNaN(extracted) && Number.isFinite(extracted)) {
      return extracted;
    }
  }

  return NaN;
}

/**
 * Coerces string values to numbers for known numeric properties.
 * This handles cases where LLMs return numeric values as strings (e.g., "linesOfCode": "19" -> "linesOfCode": 19).
 *
 * Enhanced to extract numbers from strings with additional text:
 * - "~150 items" -> 150
 * - "approximately 50" -> 50
 * - "19 lines" -> 19
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
        // Try to extract a number from the string (handles both clean and mixed values)
        const numValue = extractNumericValue(value);
        if (!Number.isNaN(numValue) && Number.isFinite(numValue)) {
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
