/**
 * Post-parse transformations that operate on already-parsed JSON objects
 * to fix structural issues before validation.
 */

import { convertNullToUndefined } from "./convert-null-to-undefined";

/**
 * Unwraps JSON Schema structures where the LLM mistakenly returns a schema
 * definition instead of the actual data. Detects and transforms:
 *   { "type": "object", "properties": { "field": "value" } }
 * Into:
 *   { "field": "value" }
 */
export function unwrapJsonSchemaStructure(parsed: unknown): unknown {
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
 * Converts databaseIntegration from an array to a single object.
 * The schema expects databaseIntegration to be a single object (or undefined),
 * but LLMs sometimes return it as an array when multiple integration mechanisms
 * are present in a file (e.g., SQL files with STORED-PROCEDURE, DDL, and SQL).
 *
 * Transformation logic:
 * - If databaseIntegration is an array with one element, use that element.
 * - If databaseIntegration is an array with multiple elements, merge them intelligently:
 *   - mechanism: take the first one (schema expects single enum value)
 *   - description: combine descriptions with separator
 *   - codeExample: combine code examples with separator
 *   - tablesAccessed: merge arrays, removing duplicates
 *   - operationType: merge arrays, removing duplicates
 *   - Other fields: take from first element, or merge if arrays
 *
 * Returns the transformed object unchanged if databaseIntegration is not an array.
 */
export function normalizeDatabaseIntegrationArray(parsed: unknown): unknown {
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return parsed;
  }

  const obj = parsed as Record<string, unknown>;

  if ("databaseIntegration" in obj && Array.isArray(obj.databaseIntegration)) {
    const array = obj.databaseIntegration as unknown[];

    if (array.length === 0) {
      // Empty array -> undefined
      const result = { ...obj };
      delete result.databaseIntegration;
      return result;
    }

    if (array.length === 1) {
      // Single element -> use it directly
      return {
        ...obj,
        databaseIntegration: array[0],
      };
    }

    // Multiple elements -> merge intelligently
    const merged = mergeDatabaseIntegrationObjects(array);
    return {
      ...obj,
      databaseIntegration: merged,
    };
  }

  return parsed;
}

/**
 * Merges multiple database integration objects into a single object.
 * Handles fields that are arrays by merging them, and combines string fields.
 */
function mergeDatabaseIntegrationObjects(
  objects: unknown[],
): Record<string, unknown> {
  if (objects.length === 0) {
    return {};
  }

  const validObjects = objects.filter(
    (obj): obj is Record<string, unknown> =>
      typeof obj === "object" && obj !== null && !Array.isArray(obj),
  );

  if (validObjects.length === 0) {
    return objects[0] as Record<string, unknown>;
  }

  const first = validObjects[0];
  const result: Record<string, unknown> = { ...first };

  // Merge tablesAccessed arrays
  const allTables = new Set<string>();
  for (const obj of validObjects) {
    if (Array.isArray(obj.tablesAccessed)) {
      for (const table of obj.tablesAccessed) {
        if (typeof table === "string") {
          allTables.add(table);
        }
      }
    }
  }
  if (allTables.size > 0) {
    result.tablesAccessed = Array.from(allTables);
  }

  // Merge operationType arrays
  const allOperationTypes = new Set<string>();
  for (const obj of validObjects) {
    if (Array.isArray(obj.operationType)) {
      for (const opType of obj.operationType) {
        if (typeof opType === "string") {
          allOperationTypes.add(opType);
        }
      }
    }
  }
  if (allOperationTypes.size > 0) {
    result.operationType = Array.from(allOperationTypes);
  }

  // Combine descriptions
  const descriptions = validObjects
    .map((obj) => obj.description)
    .filter((desc): desc is string => typeof desc === "string" && desc.trim() !== "")
    .filter((desc, idx, arr) => arr.indexOf(desc) === idx); // Remove duplicates
  if (descriptions.length > 1) {
    result.description = descriptions.join(" | ");
  } else if (descriptions.length === 1) {
    result.description = descriptions[0];
  }

  // Combine codeExamples
  const codeExamples = validObjects
    .map((obj) => obj.codeExample)
    .filter((ex): ex is string => typeof ex === "string" && ex.trim() !== "")
    .filter((ex, idx, arr) => arr.indexOf(ex) === idx); // Remove duplicates
  if (codeExamples.length > 1) {
    result.codeExample = codeExamples.join("\n---\n");
  } else if (codeExamples.length === 1) {
    result.codeExample = codeExamples[0];
  }

  // For other fields, prefer values from the first object if they exist
  // and merge arrays if present in multiple objects
  for (const obj of validObjects.slice(1)) {
    for (const [key, value] of Object.entries(obj)) {
      if (key === "tablesAccessed" || key === "operationType" || key === "description" || key === "codeExample") {
        // Already handled above
        continue;
      }
      if (!(key in result) && value !== undefined && value !== null) {
        result[key] = value;
      } else if (Array.isArray(value) && Array.isArray(result[key])) {
        // Merge arrays, removing duplicates
        const existing = result[key] as unknown[];
        const merged = new Set([...existing.map(String), ...value.map(String)]);
        result[key] = Array.from(merged);
      }
    }
  }

  return result;
}

// Re-export for use in json-processor
export { convertNullToUndefined };
