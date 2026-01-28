/**
 * Unified file type registry - single source of truth for file type handling.
 *
 * This module consolidates the previously fragmented file type definitions:
 * - CODE_FILE_EXTENSIONS from file-processing-rules.ts
 * - EXTENSION_TO_TYPE_MAP from file-type-mapping.ts
 * - FILENAME_TO_TYPE_MAP from file-type-mapping.ts
 *
 * Adding a new language or filename mapping now requires updating only this registry.
 * The CODE_FILE_EXTENSIONS list and type mappings are derived programmatically.
 */

import type { CanonicalFileType } from "../../schemas/canonical-file-types";

/**
 * Entry in the file type registry defining how an extension maps to a canonical type.
 */
export interface FileTypeEntry {
  /** The canonical file type for this extension */
  readonly canonicalType: CanonicalFileType;
  /**
   * Whether this extension represents source code that should be analyzed.
   * When true, the extension is included in CODE_FILE_EXTENSIONS.
   */
  readonly isCode: boolean;
}

/**
 * Unified registry mapping file extensions to their canonical types and properties.
 * This is the SINGLE SOURCE OF TRUTH for file extension handling.
 *
 * Keys are lowercase file extensions without the leading dot.
 * Values define the canonical type and whether the extension is a code file.
 *
 * To add a new language:
 * 1. Add entries for all relevant extensions
 * 2. Set canonicalType to the appropriate value from CANONICAL_FILE_TYPES
 * 3. Set isCode to true for source code files
 */
export const FILE_TYPE_REGISTRY: Readonly<Record<string, FileTypeEntry>> = {
  // Java/JVM languages
  java: { canonicalType: "java", isCode: true },
  kt: { canonicalType: "java", isCode: true },
  kts: { canonicalType: "java", isCode: true },
  scala: { canonicalType: "java", isCode: true },
  groovy: { canonicalType: "java", isCode: true },

  // JavaScript/TypeScript ecosystem
  js: { canonicalType: "javascript", isCode: true },
  mjs: { canonicalType: "javascript", isCode: true },
  cjs: { canonicalType: "javascript", isCode: true },
  jsx: { canonicalType: "javascript", isCode: true },
  ts: { canonicalType: "javascript", isCode: true },
  tsx: { canonicalType: "javascript", isCode: true },

  // Python
  py: { canonicalType: "python", isCode: true },

  // Ruby
  rb: { canonicalType: "ruby", isCode: true },

  // C#/.NET
  cs: { canonicalType: "csharp", isCode: true },
  csx: { canonicalType: "csharp", isCode: true },

  // C language
  c: { canonicalType: "c", isCode: true },
  h: { canonicalType: "c", isCode: true },

  // C++ language
  cpp: { canonicalType: "cpp", isCode: true },
  cxx: { canonicalType: "cpp", isCode: true },
  cc: { canonicalType: "cpp", isCode: true },
  hpp: { canonicalType: "cpp", isCode: true },
  hh: { canonicalType: "cpp", isCode: true },
  hxx: { canonicalType: "cpp", isCode: true },

  // SQL and database
  sql: { canonicalType: "sql", isCode: true },
  ddl: { canonicalType: "sql", isCode: true },
  dml: { canonicalType: "sql", isCode: true },

  // Go
  go: { canonicalType: "default", isCode: true },

  // Rust
  rs: { canonicalType: "default", isCode: true },

  // Swift
  swift: { canonicalType: "default", isCode: true },

  // PHP
  php: { canonicalType: "default", isCode: true },

  // Shell scripting
  sh: { canonicalType: "shell-script", isCode: true },
  bash: { canonicalType: "shell-script", isCode: true },

  // Batch scripting
  bat: { canonicalType: "batch-script", isCode: true },
  cmd: { canonicalType: "batch-script", isCode: true },

  // JCL (Job Control Language)
  jcl: { canonicalType: "jcl", isCode: true },

  // R language
  R: { canonicalType: "default", isCode: true },
  r: { canonicalType: "default", isCode: true },

  // Dart
  dart: { canonicalType: "default", isCode: true },

  // Lua
  lua: { canonicalType: "default", isCode: true },

  // Perl
  pl: { canonicalType: "default", isCode: true },
  pm: { canonicalType: "default", isCode: true },

  // Tcl
  tcl: { canonicalType: "default", isCode: true },

  // Visual Basic
  vb: { canonicalType: "default", isCode: true },
  vbs: { canonicalType: "default", isCode: true },

  // F#
  fs: { canonicalType: "default", isCode: true },
  fsi: { canonicalType: "default", isCode: true },
  fsx: { canonicalType: "default", isCode: true },

  // Clojure
  clj: { canonicalType: "default", isCode: true },
  cljs: { canonicalType: "default", isCode: true },
  cljc: { canonicalType: "default", isCode: true },
  edn: { canonicalType: "default", isCode: true },

  // Elixir
  ex: { canonicalType: "default", isCode: true },
  exs: { canonicalType: "default", isCode: true },

  // Elm
  elm: { canonicalType: "default", isCode: true },

  // Erlang
  erl: { canonicalType: "default", isCode: true },
  hrl: { canonicalType: "default", isCode: true },

  // Haskell
  hs: { canonicalType: "default", isCode: true },

  // XML and related
  xml: { canonicalType: "xml", isCode: false },

  // JSP
  jsp: { canonicalType: "jsp", isCode: false },

  // Markdown
  md: { canonicalType: "markdown", isCode: false },
  markdown: { canonicalType: "markdown", isCode: false },

  // .NET project files
  csproj: { canonicalType: "dotnet-proj", isCode: false },
  vbproj: { canonicalType: "dotnet-proj", isCode: false },
  fsproj: { canonicalType: "dotnet-proj", isCode: false },
} as const;

/**
 * Derives the list of code file extensions from the registry.
 * This replaces the manually maintained CODE_FILE_EXTENSIONS array.
 *
 * @returns A readonly array of extensions that are classified as code files
 */
export function deriveCodeFileExtensions(): readonly string[] {
  return Object.entries(FILE_TYPE_REGISTRY)
    .filter(([, entry]) => entry.isCode)
    .map(([ext]) => ext);
}

/**
 * Derives the extension to type map from the registry.
 * This replaces the manually maintained EXTENSION_TO_TYPE_MAP.
 *
 * @returns A readonly record mapping extensions to canonical types
 */
export function deriveExtensionToTypeMap(): Readonly<Record<string, CanonicalFileType>> {
  const map: Record<string, CanonicalFileType> = {};
  for (const [ext, entry] of Object.entries(FILE_TYPE_REGISTRY)) {
    map[ext] = entry.canonicalType;
  }
  return map;
}

/**
 * Gets the file type entry for a given extension.
 *
 * @param extension - The file extension (without leading dot, case-insensitive)
 * @returns The file type entry or undefined if not found
 */
export function getFileTypeEntry(extension: string): FileTypeEntry | undefined {
  return FILE_TYPE_REGISTRY[extension.toLowerCase()];
}

/**
 * Checks if an extension is classified as a code file.
 *
 * @param extension - The file extension (without leading dot, case-insensitive)
 * @returns true if the extension is a code file, false otherwise
 */
export function isCodeExtension(extension: string): boolean {
  const entry = getFileTypeEntry(extension);
  return entry?.isCode ?? false;
}

/**
 * Gets the canonical type for an extension.
 *
 * @param extension - The file extension (without leading dot, case-insensitive)
 * @returns The canonical type or "default" if not found
 */
export function getCanonicalTypeForExtension(extension: string): CanonicalFileType {
  const entry = getFileTypeEntry(extension);
  return entry?.canonicalType ?? "default";
}

/**
 * Registry mapping exact filenames to their canonical types.
 * This is the SINGLE SOURCE OF TRUTH for filename-based file type detection.
 *
 * Keys are lowercase filenames (e.g., "pom.xml", "makefile").
 * Values are the canonical file types.
 *
 * To add a new filename mapping:
 * 1. Add the filename (lowercase) as a key
 * 2. Set the value to the appropriate CanonicalFileType
 */
export const FILENAME_TYPE_REGISTRY: Readonly<Record<string, CanonicalFileType>> = {
  // Maven
  "pom.xml": "maven",

  // Gradle
  "build.gradle": "gradle",
  "build.gradle.kts": "gradle",

  // Ant
  "build.xml": "ant",

  // npm/Node.js
  "package.json": "npm",
  "package-lock.json": "npm",
  "yarn.lock": "npm",

  // NuGet (.NET)
  "packages.config": "nuget",

  // Python
  "requirements.txt": "python-pip",
  "setup.py": "python-setup",
  "pyproject.toml": "python-poetry",
  pipfile: "python-pip",
  "pipfile.lock": "python-pip",

  // Ruby
  gemfile: "ruby-bundler",
  "gemfile.lock": "ruby-bundler",

  // Shell
  crontab: "shell-script",

  // C/C++ build files (CMake, Make, Autotools)
  "cmakelists.txt": "makefile",
  makefile: "makefile",
  gnumakefile: "makefile",
  "configure.ac": "makefile",
  "configure.in": "makefile",
} as const;

/**
 * Gets the canonical type for a filename.
 *
 * @param filename - The filename (case-insensitive)
 * @returns The canonical type or undefined if not found
 */
export function getCanonicalTypeForFilename(filename: string): CanonicalFileType | undefined {
  return FILENAME_TYPE_REGISTRY[filename.toLowerCase()];
}

// Derived constants for backwards compatibility
// These are computed once at module load time

/**
 * List of code file extensions derived from the registry.
 * Use this in place of the old CODE_FILE_EXTENSIONS constant.
 */
export const DERIVED_CODE_FILE_EXTENSIONS: readonly string[] = deriveCodeFileExtensions();

/**
 * Extension to type map derived from the registry.
 * Use this in place of the old EXTENSION_TO_TYPE_MAP constant.
 */
export const DERIVED_EXTENSION_TO_TYPE_MAP: Readonly<Record<string, CanonicalFileType>> =
  deriveExtensionToTypeMap();

/**
 * Filename to type map exported for use in file-type-mapping.ts.
 * This is the same as FILENAME_TYPE_REGISTRY but exported with a consistent naming convention.
 */
export const DERIVED_FILENAME_TO_TYPE_MAP: Readonly<Record<string, CanonicalFileType>> =
  FILENAME_TYPE_REGISTRY;
