/**
 * Master prompt template used across all prompt types.
 * This centralizes the common structure for all LLM prompts in the application.
 */

export const MASTER_PROMPT_TEMPLATE = `{{role}}

{{instructions}}

The JSON response must follow this JSON schema:
\`\`\`json
{{jsonSchema}}
\`\`\`

{{forceJSON}}

{{contentHeader}}:
{{codeContent}}`;

/**
 * Default role for prompts
 */
export const DEFAULT_PROMPT_ROLE = "Act as a senior developer.";

/**
 * Common content headers used across different prompt types
 */
export const PROMPT_CONTENT_HEADERS = {
  CODE: "CODE",
  SOURCES: "SOURCES",
  PARTIAL_DATA: "PARTIAL_DATA",
  CODEBASE: "CODEBASE",
} as const; // TODO: check if these are still needed
