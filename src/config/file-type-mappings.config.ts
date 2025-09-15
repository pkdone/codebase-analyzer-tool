/**
 * File type mappings configuration
 */
export const fileTypeMappingsConfig = {
  FILE_EXTENSION_TO_CANONICAL_TYPE_MAPPINGS: new Map<string, string>([
    ["java", "java"],
    ["js", "javascript"],
    ["ts", "javascript"],
    ["javascript", "javascript"],
    ["typescript", "javascript"],
    ["ddl", "sql"],
    ["sql", "sql"],
    ["xml", "xml"],
    ["jsp", "jsp"],
    ["markdown", "markdown"],
    ["md", "markdown"],
  ]),
  FILENAME_TO_CANONICAL_TYPE_MAPPINGS: new Map<string, string>([
    ["readme", "markdown"],
    ["license", "markdown"],
    ["changelog", "markdown"],
  ]),
  DEFAULT_FILE_TYPE: "default",
  JAVA_FILE_TYPE: "java",
} as const;
