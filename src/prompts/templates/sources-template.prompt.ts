/**
 * Sources prompt template used for capturing source code summaries.
 * This centralizes the common structure for all LLM prompts in the application.
 */

export const SOURCES_TEMPLATE = `Act as a senior developer analyzing the code in a legacy application. Based on the {{contentDesc}} shown below in the section marked 'CODE', return a JSON response that contains:

{{instructions}}.

The JSON response must follow this JSON schema:
\`\`\`json
{{jsonSchema}}
\`\`\`

{{forceJSON}}

CODE:
{{content}}`;

