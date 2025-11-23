import { z } from "zod";

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
 * File type rule that defines how to match a file to a canonical type.
 * Rules are evaluated in order, and the first matching rule determines the file type.
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
 * Ordered list of file type mapping rules.
 * Rules are evaluated in order, with filename-based rules first (for specificity),
 * followed by extension-based rules, and finally a default rule.
 * The first matching rule determines the canonical file type.
 */
export const FILE_TYPE_MAPPING_RULES: readonly FileTypeRule[] = [
  // Filename-based rules (checked first for specificity)
  { test: (filename) => filename === "readme" || filename.startsWith("readme."), type: "markdown" },
  {
    test: (filename) => filename === "license" || filename.startsWith("license."),
    type: "markdown",
  },
  {
    test: (filename) => filename === "changelog" || filename.startsWith("changelog."),
    type: "markdown",
  },
  { test: (filename) => filename === "pom.xml", type: "maven" },
  { test: (filename) => filename === "build.gradle", type: "gradle" },
  { test: (filename) => filename === "build.gradle.kts", type: "gradle" },
  { test: (filename) => filename === "build.xml", type: "ant" },
  { test: (filename) => filename === "package.json", type: "npm" },
  { test: (filename) => filename === "package-lock.json", type: "npm" },
  { test: (filename) => filename === "yarn.lock", type: "npm" },
  { test: (filename) => filename === "packages.config", type: "nuget" },
  {
    test: (filename) => filename === "gemfile" || filename === "gemfile.lock",
    type: "ruby-bundler",
  },
  { test: (filename) => filename === "requirements.txt", type: "python-pip" },
  { test: (filename) => filename === "setup.py", type: "python-setup" },
  { test: (filename) => filename === "pyproject.toml", type: "python-poetry" },
  { test: (filename) => filename === "pipfile" || filename === "pipfile.lock", type: "python-pip" },
  { test: (filename) => filename === "crontab", type: "shell-script" },

  // Extension-based rules (checked after filename rules)
  {
    test: (_filename, extension) =>
      extension === "java" || extension === "kt" || extension === "kts",
    type: "java",
  },
  {
    test: (_filename, extension) =>
      extension === "js" ||
      extension === "ts" ||
      extension === "javascript" ||
      extension === "typescript",
    type: "javascript",
  },
  { test: (_filename, extension) => extension === "py", type: "python" },
  { test: (_filename, extension) => extension === "rb" || extension === "ruby", type: "ruby" },
  {
    test: (_filename, extension) =>
      extension === "cs" || extension === "csx" || extension === "csharp",
    type: "csharp",
  },
  { test: (_filename, extension) => extension === "ddl" || extension === "sql", type: "sql" },
  { test: (_filename, extension) => extension === "xml", type: "xml" },
  { test: (_filename, extension) => extension === "jsp", type: "jsp" },
  {
    test: (_filename, extension) => extension === "markdown" || extension === "md",
    type: "markdown",
  },
  {
    test: (_filename, extension) =>
      extension === "csproj" || extension === "vbproj" || extension === "fsproj",
    type: "dotnet-proj",
  },
  {
    test: (_filename, extension) => extension === "sh" || extension === "bash",
    type: "shell-script",
  },
  {
    test: (_filename, extension) => extension === "bat" || extension === "cmd",
    type: "batch-script",
  },
  { test: (_filename, extension) => extension === "jcl", type: "jcl" },

  // Default rule (always matches, must be last)
  { test: () => true, type: "default" },
] as const;
