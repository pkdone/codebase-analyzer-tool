import { z } from "zod";

/**
 * Configuration for prompts that need file type and instructions
 */
export interface SourcePromptTemplate<T extends z.ZodType = z.ZodType> {
  promptMetadata: T;
  contentDesc: string;
  instructions: string;
  hasComplexSchema: boolean;
}

/**
 * Supported file types for metadata configuration.
 * Defined as a constant tuple to enable both runtime iteration and compile-time type safety.
 * The Zod schema `canonicalFileTypeSchema` is derived from this array to keep a single source of truth.
 */
export const CANONICAL_FILE_TYPES = [
  "java",
  "javascript",
  "default",
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

/** Zod enum schema for canonical file types */
export const canonicalFileTypeSchema = z.enum(CANONICAL_FILE_TYPES);

/** Inferred TypeScript type for canonical file types */
export type CanonicalFileType = z.infer<typeof canonicalFileTypeSchema>;

/**
 * File type mappings configuration with readonly maps for immutability.
 */
/**
 * Readonly map of file extensions to canonical types.
 * Extracted from former fileTypesToCanonicalMappings for direct export.
 */
export const FILE_EXTENSION_TO_CANONICAL_TYPE_MAPPINGS = new Map<string, CanonicalFileType>([
  ["java", "java"],
  ["kt", "java"],
  ["kts", "java"],
  ["js", "javascript"],
  ["ts", "javascript"],
  ["javascript", "javascript"],
  ["typescript", "javascript"],
  ["rb", "ruby"],
  ["ruby", "ruby"],
  ["cs", "csharp"],
  ["csx", "csharp"],
  ["csharp", "csharp"],
  ["ddl", "sql"],
  ["sql", "sql"],
  ["xml", "xml"],
  ["jsp", "jsp"],
  ["markdown", "markdown"],
  ["md", "markdown"],
  // .NET project files
  ["csproj", "dotnet-proj"],
  ["vbproj", "dotnet-proj"],
  ["fsproj", "dotnet-proj"],
  // Batch and shell scripts
  ["sh", "shell-script"],
  ["bash", "shell-script"],
  ["bat", "batch-script"],
  ["cmd", "batch-script"],
  ["jcl", "jcl"],
]) as ReadonlyMap<string, CanonicalFileType>;

/**
 * Readonly map of filenames to canonical types.
 */
export const FILENAME_TO_CANONICAL_TYPE_MAPPINGS = new Map<string, CanonicalFileType>([
  ["readme", "markdown"],
  ["license", "markdown"],
  ["changelog", "markdown"],
  // Java build tools
  ["pom.xml", "maven"],
  ["build.gradle", "gradle"],
  ["build.gradle.kts", "gradle"],
  ["build.xml", "ant"],
  // JavaScript/Node.js
  ["package.json", "npm"],
  ["package-lock.json", "npm"],
  ["yarn.lock", "npm"],
  // .NET
  ["packages.config", "nuget"],
  // Ruby
  ["Gemfile", "ruby-bundler"],
  ["Gemfile.lock", "ruby-bundler"],
  // Python
  ["requirements.txt", "python-pip"],
  ["setup.py", "python-setup"],
  ["pyproject.toml", "python-poetry"],
  ["Pipfile", "python-pip"],
  ["Pipfile.lock", "python-pip"],
  // Batch and shell scripts
  ["crontab", "shell-script"],
]) as ReadonlyMap<string, CanonicalFileType>;

/** Default canonical file type constant */
export const DEFAULT_FILE_TYPE: CanonicalFileType = "default";

/** Canonical Java file type constant */
export const JAVA_FILE_TYPE: CanonicalFileType = "java";
