/**
 * File type mappings configuration with readonly maps for immutability
 */
export const fileTypeMappingsConfig = {
  FILE_EXTENSION_TO_CANONICAL_TYPE_MAPPINGS: new Map([
    ["java", "java"],
    ["kt", "java"],
    ["kts", "java"],
    ["js", "javascript"],
    ["ts", "javascript"],
    ["javascript", "javascript"],
    ["typescript", "javascript"],
    ["rb", "ruby"],
    ["cs", "csharp"],
    ["ddl", "sql"],
    ["sql", "sql"],
    ["xml", "xml"],
    ["jsp", "jsp"],
    ["markdown", "markdown"],
    ["md", "markdown"],
  ]) as ReadonlyMap<string, string>,
  FILENAME_TO_CANONICAL_TYPE_MAPPINGS: new Map([
    ["readme", "markdown"],
    ["license", "markdown"],
    ["changelog", "markdown"],
  ]) as ReadonlyMap<string, string>,
  DEFAULT_FILE_TYPE: "default",
  JAVA_FILE_TYPE: "java",
} as const;
