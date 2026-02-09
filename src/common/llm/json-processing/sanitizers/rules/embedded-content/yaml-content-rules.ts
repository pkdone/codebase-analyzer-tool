/**
 * Replacement rules for handling embedded YAML content in JSON.
 * This module handles:
 * - YAML-like list blocks embedded in JSON
 * - YAML-like simple value assignments
 */

import type { ReplacementRule } from "../../../../types/sanitizer-config.types";

/**
 * Checks if a key looks like a YAML/non-JSON key that should be removed.
 * Generic detection based on structural patterns rather than specific strings.
 *
 * When knownProperties is provided, the function first checks if the key
 * is a valid schema property - if so, it's NOT considered a non-JSON key.
 *
 * @param key - The key to check
 * @param knownProperties - Optional list of known schema properties
 * @returns true if the key looks like non-JSON content that should be removed
 */
function looksLikeNonJsonKey(key: string, knownProperties?: readonly string[]): boolean {
  // If we have schema metadata and the key is a known property, don't remove it
  if (knownProperties && knownProperties.length > 0) {
    const lowerKey = key.toLowerCase();

    if (knownProperties.some((p) => p.toLowerCase() === lowerKey)) {
      return false;
    }
  }

  const lowerKey = key.toLowerCase();
  // Match patterns: extra_*, llm_*, ai_*, _* prefix, or hyphenated keys (YAML-style)
  return (
    /^(?:extra|llm|ai)_[a-z_]+$/i.test(key) ||
    /^_[a-z_]+$/i.test(key) ||
    /^[a-z][a-z0-9_]*(?:-[a-z][a-z0-9_]+)+$/i.test(key) || // hyphenated keys like "my-yaml-key"
    /_(thoughts?|text|notes?|info|reasoning|analysis)$/i.test(lowerKey)
  );
}

/**
 * Rules for removing embedded YAML content from JSON.
 */
export const YAML_CONTENT_RULES: readonly ReplacementRule[] = [
  // Rule: Generic YAML list block removal
  // Catches any key followed by YAML-style list items (- item\n- item2\n)
  // Covers: extra_*, llm_*, ai_*, _*, hyphenated-keys, and other non-JSON keys
  // Pattern: `some-yaml-key:\n  - item1\n  - item2\n  "property":` -> `"property":`
  // Uses schema-aware checking to avoid removing valid schema properties
  {
    name: "genericYamlListBlock",
    pattern:
      /([}\],]|\n|,)(\s*)([a-z][a-z0-9_-]*(?:[_-][a-z0-9_-]+)*:)\s*\n((?:\s+(?:-\s+)?[^\n]+\n)+)(\s*")/gi,
    replacement: (_match, groups, context) => {
      const [delimiter, , yamlKey] = groups;
      const delimiterStr = delimiter ?? "";
      const continuationStr = groups[4] ?? "";
      const keyStr = (yamlKey ?? "").replace(/:$/, "");

      // Only remove if the key looks like a non-JSON key (schema-aware)
      const knownProperties = context.config?.knownProperties;

      if (!looksLikeNonJsonKey(keyStr, knownProperties)) {
        return null;
      }

      return `${delimiterStr}\n${continuationStr}`;
    },
    diagnosticMessage: (_match, groups) => {
      const yamlKey = (groups[2] ?? "").substring(0, 30);
      return `Removed YAML list block: ${yamlKey}`;
    },
  },

  // Rule: Generic YAML simple value removal
  // Catches any non-JSON key followed by simple text value (not JSON structure)
  // Covers: extra_thoughts: some text, my-key: value, etc.
  // Pattern: `extra_thoughts: I've identified all...` -> remove
  // Uses schema-aware checking to avoid removing valid schema properties
  {
    name: "genericYamlSimpleValue",
    pattern:
      /([}\],]|\n)(\s*)([a-z][a-z0-9_-]*(?:[_-][a-z0-9_-]+)*:)\s*([^\n{"[\]]{10,200}?)\s*\n(\s*")/gi,
    replacement: (_match, groups, context) => {
      const [delimiter, , yamlKey] = groups;
      const delimiterStr = delimiter ?? "";
      const continuationStr = groups[4] ?? "";
      const keyStr = (yamlKey ?? "").replace(/:$/, "");

      // Only remove if the key looks like a non-JSON key (schema-aware)
      const knownProperties = context.config?.knownProperties;

      if (!looksLikeNonJsonKey(keyStr, knownProperties)) {
        return null;
      }

      return `${delimiterStr}\n${continuationStr}`;
    },
    diagnosticMessage: (_match, groups) => {
      const yamlKey = (groups[2] ?? "").substring(0, 30);
      return `Removed YAML value block: ${yamlKey}`;
    },
  },
];
