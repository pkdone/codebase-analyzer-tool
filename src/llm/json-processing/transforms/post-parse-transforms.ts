/**
 * Post-parse transformations that operate on already-parsed JSON objects.
 * These transformations are applied after JSON parsing but before schema validation.
 * All post-parse transformation functions should be consolidated here for better discoverability.
 */

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
function mergeDatabaseIntegrationObjects(objects: unknown[]): Record<string, unknown> {
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
      if (
        key === "tablesAccessed" ||
        key === "operationType" ||
        key === "description" ||
        key === "codeExample"
      ) {
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

/**
 * Fixes parameter object property name typos (type_ -> type).
 *
 * This post-parse transform addresses cases where LLM responses contain parameter
 * objects with typos in property names, specifically `type_` instead of `type`.
 * This happens because JSON parsing succeeds (type_ is valid JSON), but schema
 * validation fails because the schema expects `type`, not `type_`.
 *
 * Transformation:
 * - Recursively processes all objects in the parsed structure
 * - When finding parameter arrays (typically in publicMethods), fixes type_ -> type
 * - Also handles other common parameter object typos like name_ -> name
 */
export function fixParameterPropertyNameTypos(parsed: unknown): unknown {
  if (typeof parsed !== "object" || parsed === null) {
    return parsed;
  }

  // Handle arrays
  if (Array.isArray(parsed)) {
    return parsed.map((item) => fixParameterPropertyNameTypos(item));
  }

  // Handle plain objects
  const obj = parsed as Record<string, unknown>;
  const result: Record<string, unknown> = {};

  // Process each property
  for (const [key, value] of Object.entries(obj)) {
    let processedKey = key;
    let processedValue = value;

    // Fix common typos in property names
    if (key === "type_" && !("type" in obj)) {
      processedKey = "type";
    } else if (key === "name_" && !("name" in obj)) {
      processedKey = "name";
    }

    // Recursively process nested objects and arrays
    processedValue = fixParameterPropertyNameTypos(value);

    result[processedKey] = processedValue;
  }

  // Handle symbol keys (preserve them as-is)
  const symbols = Object.getOwnPropertySymbols(obj);
  for (const sym of symbols) {
    const symObj = obj as Record<symbol, unknown>;
    const resultSym = result as Record<symbol, unknown>;
    resultSym[sym] = fixParameterPropertyNameTypos(symObj[sym]);
  }

  return result;
}

/**
 * Adds default values for missing required fields in publicMethods arrays.
 *
 * This post-parse transform addresses cases where LLM responses have truncated or incomplete
 * method definitions in the publicMethods array, missing required fields like `returnType` and `description`.
 * This happens when JSON is truncated during generation, and the structural error fixer closes
 * the structures but doesn't add the missing required fields.
 *
 * Transformation:
 * - Recursively processes all objects in the parsed structure
 * - When finding publicMethods arrays, ensures each method has required fields:
 *   - returnType: defaults to "void" if missing
 *   - description: defaults to "No description provided." if missing
 * - Preserves all existing fields and values
 */
export function addMissingRequiredFieldsInPublicMethods(parsed: unknown): unknown {
  if (typeof parsed !== "object" || parsed === null) {
    return parsed;
  }

  // Handle arrays
  if (Array.isArray(parsed)) {
    return parsed.map((item) => addMissingRequiredFieldsInPublicMethods(item));
  }

  // Handle plain objects
  const obj = parsed as Record<string, unknown>;
  const result: Record<string, unknown> = { ...obj };

  // Check if this object has a publicMethods array
  if ("publicMethods" in obj && Array.isArray(obj.publicMethods)) {
    const methods = obj.publicMethods as unknown[];
    result.publicMethods = methods.map((method) => {
      if (typeof method !== "object" || method === null || Array.isArray(method)) {
        return method;
      }

      const methodObj = method as Record<string, unknown>;
      const fixedMethod: Record<string, unknown> = { ...methodObj };

      // Add default returnType if missing
      if (!("returnType" in fixedMethod) || fixedMethod.returnType === undefined) {
        fixedMethod.returnType = "void";
      }

      // Add default description if missing
      if (!("description" in fixedMethod) || fixedMethod.description === undefined) {
        fixedMethod.description = "No description provided.";
      }

      // Recursively process nested structures (e.g., parameters array)
      return addMissingRequiredFieldsInPublicMethods(fixedMethod);
    });
  }

  // Recursively process all other properties
  for (const [key, value] of Object.entries(result)) {
    if (key !== "publicMethods") {
      result[key] = addMissingRequiredFieldsInPublicMethods(value);
    }
  }

  // Handle symbol keys (preserve them as-is)
  const symbols = Object.getOwnPropertySymbols(obj);
  for (const sym of symbols) {
    const symObj = obj as Record<symbol, unknown>;
    const resultSym = result as Record<symbol, unknown>;
    resultSym[sym] = addMissingRequiredFieldsInPublicMethods(symObj[sym]);
  }

  return result;
}
