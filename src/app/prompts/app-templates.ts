/**
 * Application-specific prompt templates.
 * Consolidates all prompt templates in one location for better organization.
 *
 * Note: Generic utilities like FORCE_JSON_FORMAT are in common/prompts/prompt-renderer.ts.
 * This file contains only application-specific templates.
 */

/**
 * Default system role for source code analysis prompts.
 * Used for detailed code analysis where the LLM acts as a senior developer
 * analyzing existing applications.
 */
const DEFAULT_SYSTEM_ROLE =
  "Act as a senior developer analyzing the code in an existing application.";

/**
 * Template for structured analysis prompts (sources, app summaries, reduce insights).
 * This template uses placeholders for customization:
 * - {{contentDesc}}: Description of the content being analyzed
 * - {{dataBlockHeader}}: The section header (e.g., "CODE", "FILE_SUMMARIES")
 * - {{instructionsText}}: The joined instruction strings from the RenderablePrompt
 * - {{contentWrapper}}: Optional code block markers (```) if wrapInCodeBlock is true
 * - {{schemaSection}}: Conditional JSON schema section (empty for TEXT-mode prompts)
 */
export const ANALYSIS_PROMPT_TEMPLATE = `${DEFAULT_SYSTEM_ROLE} Based on the {{contentDesc}} shown below in the section marked '{{dataBlockHeader}}', return a JSON response that contains:

{{instructionsText}}

{{schemaSection}}
{{dataBlockHeader}}:
{{contentWrapper}}{{content}}{{contentWrapper}}`;

/**
 * Note prepended to prompts when analyzing partial/chunked data in map-reduce workflows.
 */
const PARTIAL_ANALYSIS_NOTE =
  "Note, this is a partial analysis of a larger codebase; focus on extracting insights from this subset of file summaries only.\n\n";

/**
 * Template for map-reduce chunk processing.
 * Derived from ANALYSIS_PROMPT_TEMPLATE with partial analysis note inserted before the schema section.
 */
export const PARTIAL_ANALYSIS_TEMPLATE = ANALYSIS_PROMPT_TEMPLATE.replace(
  "{{schemaSection}}",
  `${PARTIAL_ANALYSIS_NOTE}{{schemaSection}}`,
);

/**
 * Template for querying the codebase with a specific question.
 * Used for RAG (Retrieval-Augmented Generation) workflows where vector search results
 * are provided as context for answering developer questions about the codebase.
 */
export const CODEBASE_QUERY_TEMPLATE = `${DEFAULT_SYSTEM_ROLE} I've provided the content of some source code files below in the section marked 'CODE'. Using all that code for context, answer the question a developer has asked about the code, where their question is shown in the section marked 'QUESTION' below. Provide your answer in a few paragraphs, referring to specific evidence in the provided code.

QUESTION:
{{question}}

CODE:
{{content}}`;
