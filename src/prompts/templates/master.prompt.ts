/**
 * Master prompt template used across all prompt types.
 * This centralizes the common structure for all LLM prompts in the application.
 */

export const MASTER_PROMPT_TEMPLATE = `{{instructions}}

The JSON response must follow this JSON schema:
\`\`\`json
{{jsonSchema}}
\`\`\`

{{forceJSON}}

CONTENT:
{{content}}`;

