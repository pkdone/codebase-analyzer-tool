/**
 * Master prompt template used across all prompt types.
 * This centralizes the common structure for all LLM prompts in the application.
 */

export const MASTER_PROMPT_TEMPLATE = `Act as a senior developer analyzing the code in a legacy application. Based on the {{contentDesc}} shown below in the section marked 'CODE', return a JSON response that contains:

{{instructions}}.

The JSON response must follow this JSON schema:
\`\`\`json
{{jsonSchema}}
\`\`\`

{{forceJSON}}

CODE:
{{content}}`;

