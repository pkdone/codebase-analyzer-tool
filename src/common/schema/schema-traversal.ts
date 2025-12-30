import { isJsonObject } from "../utils/type-guards";

/**
 * Rules for schema transformation during traversal.
 */
export interface SchemaTraversalRules {
  /**
   * Keys to remove from the schema.
   */
  removeKeys?: string[];
  /**
   * Transform a key-value pair. Return null to skip the key, or an object with new key/value.
   */
  transformKey?: (
    key: string,
    value: unknown,
    obj: Record<string, unknown>,
  ) => { key: string; value: unknown } | null;
}

/**
 * Generic schema traversal utility with configurable transformation rules.
 *
 * This utility recursively traverses JSON Schema objects and applies
 * transformation rules such as removing unsupported keywords or converting
 * keywords (e.g., `const` to `enum`).
 *
 * @param schema - The schema object to traverse
 * @param rules - Transformation rules to apply
 * @returns The transformed schema
 *
 * @example
 * ```typescript
 * // Remove 'const' keywords (for Vertex AI)
 * const sanitized = traverseAndModifySchema(schema, {
 *   removeKeys: ['const']
 * });
 *
 * // Convert 'const' to 'enum' (for MongoDB)
 * const sanitized = traverseAndModifySchema(schema, {
 *   transformKey: (key, value) => {
 *     if (key === 'const') {
 *       return { key: 'enum', value: [value] };
 *     }
 *     return null; // Keep original
 *   }
 * });
 * ```
 */
export function traverseAndModifySchema(
  schema: unknown,
  rules: SchemaTraversalRules,
): unknown {
  if (Array.isArray(schema)) {
    return schema.map((item) => traverseAndModifySchema(item, rules));
  }

  if (isJsonObject(schema)) {
    const sanitized: Record<string, unknown> = {};
    const schemaObj = schema;

    for (const [key, value] of Object.entries(schemaObj)) {
      // Check if key should be removed first
      if (rules.removeKeys?.includes(key)) {
        continue;
      }

      // Apply transformKey rule if provided
      if (rules.transformKey) {
        const transformed = rules.transformKey(key, value, schemaObj);
        if (transformed === null) {
          // Skip this key (transformKey explicitly wants to skip it)
          continue;
        }
        // Use transformed key and value (key might be same as original to keep it)
        sanitized[transformed.key] = traverseAndModifySchema(transformed.value, rules);
        continue;
      }

      // No transformKey provided, recursively process the value with original key
      sanitized[key] = traverseAndModifySchema(value, rules);
    }

    return sanitized;
  }

  return schema;
}

