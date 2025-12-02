/**
 * Centralized prompt templates for the application.
 * Consolidates all prompt templates in one location for better organization.
 */

/**
 * Unified base template for all prompt types (sources, app summaries, reduce insights).
 * This consolidates the common structure and eliminates duplication across templates.
 * The template uses placeholders for customization:
 * - {{dataBlockHeader}}: The section header (e.g., "CODE", "FILE_SUMMARIES", "FRAGMENTED_DATA")
 * - {{introText}}: The introduction text that varies by prompt type
 * - {{contentWrapper}}: Optional code block markers (```) if wrapInCodeBlock is true
 */
export const BASE_PROMPT_TEMPLATE = `{{introText}}

{{partialAnalysisNote}}The JSON response must follow this JSON schema:
\`\`\`json
{{jsonSchema}}
\`\`\`

{{forceJSON}}

{{dataBlockHeader}}:
{{contentWrapper}}{{content}}{{contentWrapper}}`;

/**
 * Template for querying the codebase with a specific question.
 * Used for RAG (Retrieval-Augmented Generation) workflows where vector search results
 * are provided as context for answering developer questions about the codebase.
 */
export const CODEBASE_QUERY_TEMPLATE = `Act as a senior developer. I've provided the content of some source code files below in the section marked 'CODE'. Using all that code for context, answer the question a developer has asked about the code, where their question is shown in the section marked 'QUESTION' below. Provide your answer in a few paragraphs, referring to specific evidence in the provided code.

QUESTION:
{{question}}

CODE:
{{content}}`;
