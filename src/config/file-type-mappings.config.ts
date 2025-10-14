/**
 * Canonical file types used throughout the application.
 * These match the keys in fileTypeMetadataConfig.
 */
type CanonicalFileType =
  | "java"
  | "javascript"
  | "ruby"
  | "csharp"
  | "sql"
  | "xml"
  | "jsp"
  | "markdown"
  | "maven"
  | "gradle"
  | "ant"
  | "npm"
  | "dotnet-proj"
  | "nuget"
  | "ruby-bundler"
  | "python-pip"
  | "python-setup"
  | "python-poetry"
  | "default";

/**
 * File type mappings configuration with readonly maps for immutability
 */
export const fileTypeMappingsConfig = {
  FILE_EXTENSION_TO_CANONICAL_TYPE_MAPPINGS: new Map<string, CanonicalFileType>([
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
  ]) as ReadonlyMap<string, CanonicalFileType>,
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
  ]) as ReadonlyMap<string, CanonicalFileType>,
  DEFAULT_FILE_TYPE: "default" as CanonicalFileType,
  JAVA_FILE_TYPE: "java" as CanonicalFileType,
} as const;
