/**
 * Java-specific replacement rules for handling Java code artifacts in JSON.
 *
 * These rules are domain-specific and handle Java-related content that may appear
 * in LLM responses when analyzing Java codebases. They are specific to this application
 * since it primarily analyzes Java projects.
 *
 * Co-located with Java prompt fragments to keep all "Java knowledge" in one place.
 */

import type { ReplacementRule } from "../../../../../../common/llm/json-processing/sanitizers/rules/replacement-rule.types";

/**
 * Rules for removing Java code artifacts from JSON content.
 * These handle cases where LLMs include Java code snippets in their JSON responses.
 */
export const JAVA_SPECIFIC_RULES: readonly ReplacementRule[] = [
  // Rule: Remove Java package declarations in JSON
  // Pattern: `],\npackage com.example.test;` -> `],`
  {
    name: "javaPackageInJson",
    pattern: /([}\],])\s*\n\s*(package\s+[a-zA-Z_][a-zA-Z0-9_.]*\s*;[\s\S]*?)(\n\s*")/gm,
    replacement: (_match, groups) => {
      const [delimiter, , continuation] = groups;
      const delimiterStr = delimiter ?? "";
      const continuationStr = continuation ?? "";
      return `${delimiterStr}${continuationStr}`;
    },
    diagnosticMessage: "Removed Java package declaration from JSON",
    skipInString: true,
  },

  // Rule: Remove Java import statements in JSON
  // Pattern: `],\nimport java.util.List;` -> `],`
  {
    name: "javaImportInJson",
    pattern: /([}\],])\s*\n\s*((?:import\s+[a-zA-Z_][a-zA-Z0-9_.]*\s*;[\s\n]*)+)(\s*")/gm,
    replacement: (_match, groups) => {
      const [delimiter, , continuation] = groups;
      const delimiterStr = delimiter ?? "";
      const continuationStr = continuation ?? "";
      return `${delimiterStr}${continuationStr}`;
    },
    diagnosticMessage: "Removed Java import statements from JSON",
    skipInString: true,
  },

  // Rule: Remove Java package declarations after JSON
  // Pattern: `}\npackage com.example;` -> `}`
  {
    name: "javaPackageAfterJson",
    pattern: /(}\s*\n\s*)(package\s+[a-zA-Z_][a-zA-Z0-9_.]*\s*;[\s\S]*$)/m,
    replacement: (_match, groups) => {
      const brace = groups[0] ?? "}";
      return brace.trim();
    },
    diagnosticMessage: "Removed Java package declaration after JSON",
    skipInString: true,
  },

  // Rule: Remove Java import statements after JSON
  // Pattern: `}\nimport java.util.List;` -> `}`
  {
    name: "javaImportAfterJson",
    pattern: /(}\s*\n\s*)(import\s+[a-zA-Z_][a-zA-Z0-9_.]*\s*;[\s\S]*$)/m,
    replacement: (_match, groups) => {
      const brace = groups[0] ?? "}";
      return brace.trim();
    },
    diagnosticMessage: "Removed Java import statements after JSON",
    skipInString: true,
  },

  // Rule: Remove Java class definition after JSON
  // Pattern: `}\npublic class MyClass` -> `}`
  {
    name: "javaClassAfterJson",
    pattern: /(}\s*\n\s*)((?:public|private|protected)?\s*(?:class|interface|enum)\s+[\s\S]*$)/m,
    replacement: (_match, groups) => {
      const brace = groups[0] ?? "}";
      return brace.trim();
    },
    diagnosticMessage: "Removed Java class definition after JSON",
    skipInString: true,
  },
];
