import { z } from "zod";
import path from "node:path";

/**
 * Supported file types for metadata configuration.
 * Defined as a constant tuple to enable both runtime iteration and compile-time type safety.
 * This is the source of truth for canonical file types in the application.
 * The Zod schema `canonicalFileTypeSchema` is derived from this array.
 */
export const CANONICAL_FILE_TYPES = [
  "java",
  "javascript",
  "sql",
  "xml",
  "jsp",
  "markdown",
  "csharp",
  "ruby",
  "maven",
  "gradle",
  "ant",
  "npm",
  "python",
  "dotnet-proj",
  "nuget",
  "ruby-bundler",
  "python-pip",
  "python-setup",
  "python-poetry",
  "shell-script",
  "batch-script",
  "jcl",
  "default",
] as const;

/** Inferred TypeScript type for canonical file types */
export type CanonicalFileType = (typeof CANONICAL_FILE_TYPES)[number];

/** Zod enum schema for canonical file types */
export const canonicalFileTypeSchema = z.enum(CANONICAL_FILE_TYPES);

/**
 * Map of exact filename matches to canonical file types.
 * These are checked first for fast lookups.
 */
export const FILENAME_TO_TYPE_MAP: Readonly<Record<string, CanonicalFileType>> = {
  "pom.xml": "maven",
  "build.gradle": "gradle",
  "build.gradle.kts": "gradle",
  "build.xml": "ant",
  "package.json": "npm",
  "package-lock.json": "npm",
  "yarn.lock": "npm",
  "packages.config": "nuget",
  "requirements.txt": "python-pip",
  "setup.py": "python-setup",
  "pyproject.toml": "python-poetry",
  crontab: "shell-script",
  gemfile: "ruby-bundler",
  "gemfile.lock": "ruby-bundler",
  pipfile: "python-pip",
  "pipfile.lock": "python-pip",
} as const;

/**
 * Map of file extensions to canonical file types.
 * Multiple extensions can map to the same type.
 */
export const EXTENSION_TO_TYPE_MAP: Readonly<Record<string, CanonicalFileType>> = {
  java: "java",
  kt: "java",
  kts: "java",
  js: "javascript",
  ts: "javascript",
  javascript: "javascript",
  typescript: "javascript",
  py: "python",
  rb: "ruby",
  ruby: "ruby",
  cs: "csharp",
  csx: "csharp",
  csharp: "csharp",
  ddl: "sql",
  sql: "sql",
  xml: "xml",
  jsp: "jsp",
  markdown: "markdown",
  md: "markdown",
  csproj: "dotnet-proj",
  vbproj: "dotnet-proj",
  fsproj: "dotnet-proj",
  sh: "shell-script",
  bash: "shell-script",
  bat: "batch-script",
  cmd: "batch-script",
  jcl: "jcl",
} as const;

/**
 * File type rule that defines how to match a file to a canonical type.
 * Rules are evaluated in order, and the first matching rule determines the file type.
 * Used for complex patterns that can't be expressed as simple maps.
 */
export interface FileTypeRule {
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
export const FILE_TYPE_MAPPING_RULES: readonly FileTypeRule[] = [
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
  if (Object.hasOwn(FILENAME_TO_TYPE_MAP, filename)) {
    return FILENAME_TO_TYPE_MAP[filename];
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
