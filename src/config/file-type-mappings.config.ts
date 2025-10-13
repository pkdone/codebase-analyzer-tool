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
  ]) as ReadonlyMap<string, CanonicalFileType>,
  FILENAME_TO_CANONICAL_TYPE_MAPPINGS: new Map<string, CanonicalFileType>([
    ["readme", "markdown"],
    ["license", "markdown"],
    ["changelog", "markdown"],
  ]) as ReadonlyMap<string, CanonicalFileType>,
  DEFAULT_FILE_TYPE: "default" as CanonicalFileType,
  JAVA_FILE_TYPE: "java" as CanonicalFileType,
} as const;
