import type { CanonicalFileType } from "../prompt-templates/types/sources.types";

/**
 * File type mappings configuration with readonly maps for immutability.
 */
export const fileTypeMappingsConfig = {
  /**
   * Readonly map of file extensions to canonical types.
   * Extracted from former fileTypesToCanonicalMappings for direct export.
   */
  FILE_EXTENSION_TO_CANONICAL_TYPE_MAPPINGS: new Map<string, CanonicalFileType>([
    ["java", "java"],
    ["kt", "java"],
    ["kts", "java"],
    ["js", "javascript"],
    ["ts", "javascript"],
    ["javascript", "javascript"],
    ["typescript", "javascript"],
    ["py", "python"],
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
  ]) as ReadonlyMap<string, CanonicalFileType>,

  /**
   * Readonly map of filenames to canonical types.
   */
  FILENAME_TO_CANONICAL_TYPE_MAPPINGS: new Map<string, CanonicalFileType>([
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
  ]) as ReadonlyMap<string, CanonicalFileType>,

  /** Default canonical file type constant */
  DEFAULT_FILE_TYPE: "default" as CanonicalFileType,

  /** Canonical Java file type constant */
  JAVA_FILE_TYPE: "java" as CanonicalFileType,
} as const;
