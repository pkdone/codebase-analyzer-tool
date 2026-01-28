import path from "node:path";
import type { CanonicalFileType } from "../../schemas/canonical-file-types";
import { DERIVED_EXTENSION_TO_TYPE_MAP, DERIVED_FILENAME_TO_TYPE_MAP } from "./file-type-registry";

/**
 * Map of file extensions to canonical file types.
 * Derived from the unified file type registry for single source of truth.
 *
 * Note: This constant includes additional aliases like "javascript", "typescript",
 * "ruby", "csharp" that are not in the registry but are used for flexibility.
 */
const EXTENSION_TO_TYPE_MAP: Readonly<Record<string, CanonicalFileType>> = {
  ...DERIVED_EXTENSION_TO_TYPE_MAP,
  // Additional aliases for type string values (not file extensions)
  javascript: "javascript",
  typescript: "javascript",
  ruby: "ruby",
  csharp: "csharp",
} as const;

/**
 * File type rule that defines how to match a file to a canonical type.
 * Rules are evaluated in order, and the first matching rule determines the file type.
 * Used for complex patterns that can't be expressed as simple maps.
 */
interface FileTypeRule {
  /**
   * Test function that returns true if the file matches this rule.
   * @param filename - The lowercase filename (e.g., "pom.xml", "readme.md")
   * @param extension - The lowercase file extension without dot (e.g., "java", "js")
   * @returns true if the file matches this rule
   */
  test: (filename: string, extension: string) => boolean;
  /** The canonical file type to assign when this rule matches */
  type: CanonicalFileType;
}

/**
 * Ordered list of file type mapping rules for complex patterns.
 * These rules handle cases that can't be expressed as simple filename or extension maps,
 * such as patterns like "readme*", "license*", etc.
 * Rules are evaluated in order, and the first matching rule determines the file type.
 * The default rule (always matches) must be last.
 */
const FILE_TYPE_MAPPING_RULES: readonly FileTypeRule[] = [
  // Filename pattern-based rules (for patterns that can't be simple exact matches)
  { test: (filename) => filename === "readme" || filename.startsWith("readme."), type: "markdown" },
  {
    test: (filename) => filename === "license" || filename.startsWith("license."),
    type: "markdown",
  },
  {
    test: (filename) => filename === "changelog" || filename.startsWith("changelog."),
    type: "markdown",
  },
  // C/C++ build file patterns (Makefile.am, Makefile.in, etc.)
  {
    test: (filename) => filename.startsWith("makefile."),
    type: "makefile",
  },

  // Default rule (always matches, must be last)
  { test: () => true, type: "default" },
] as const;

/**
 * Derive the canonical file type for a given path and declared extension/suffix.
 * Uses data-driven maps for fast lookups, falling back to rule-based system for complex cases.
 */
export const getCanonicalFileType = (filepath: string, type: string): CanonicalFileType => {
  const filename = path.basename(filepath).toLowerCase();
  const extension = type.toLowerCase();

  // 1. Check exact filename matches first (fastest lookup)
  // Uses the centralized DERIVED_FILENAME_TO_TYPE_MAP from file-type-registry.ts
  if (Object.hasOwn(DERIVED_FILENAME_TO_TYPE_MAP, filename)) {
    return DERIVED_FILENAME_TO_TYPE_MAP[filename];
  }

  // 2. Check extension-based mappings
  if (Object.hasOwn(EXTENSION_TO_TYPE_MAP, extension)) {
    return EXTENSION_TO_TYPE_MAP[extension];
  }

  // 3. Fall back to rule-based system for complex patterns (e.g., "readme*", "license*")
  for (const rule of FILE_TYPE_MAPPING_RULES) {
    if (rule.test(filename, extension)) {
      return rule.type;
    }
  }

  // Fallback to default (should never reach here as last rule always matches)
  return "default";
};
