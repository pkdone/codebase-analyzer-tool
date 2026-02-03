/**
 * Centralized prompt constants used across the application.
 *
 * This module provides a single source of truth for commonly used prompt strings
 * and data block headers, ensuring consistency across all LLM interactions.
 */

/**
 * Default persona introduction text for code analysis prompts.
 * Used to establish the AI's role as a senior developer analyzing code.
 */
export const DEFAULT_PERSONA_INTRODUCTION =
  "Act as a senior developer analyzing the code in an existing application.";

/**
 * Data block header for source code analysis prompts.
 * Marks the section containing raw source code to be analyzed.
 */
export const CODE_DATA_BLOCK_HEADER = "CODE" as const;

/**
 * Data block header for file summary analysis prompts.
 * Marks the section containing processed file summaries for insight generation.
 */
export const FILE_SUMMARIES_DATA_BLOCK_HEADER = "FILE_SUMMARIES" as const;

/**
 * Data block header for reduce insights prompts (consolidating fragmented data).
 * Used in map-reduce workflows to mark the section containing partial results to be consolidated.
 */
export const FRAGMENTED_DATA_BLOCK_HEADER = "FRAGMENTED_DATA" as const;

/**
 * Template for the contextual note added to partial analysis prompts.
 * Used in map-reduce workflows to indicate that the current content is a subset of a larger analysis.
 * {{header}} will be replaced by the formatted data block header (e.g., "file summaries").
 */
export const PARTIAL_ANALYSIS_NOTE_TEMPLATE =
  "Note, this is a partial analysis of what is a much larger set of {{header}}; focus on extracting insights from this subset of {{header}} only.\n\n";

/**
 * Template for querying the codebase with a specific question.
 * Used for RAG (Retrieval-Augmented Generation) workflows where vector search results
 * are provided as context for answering developer questions about the codebase.
 *
 * Placeholders:
 * - {{personaIntroduction}}: The AI persona introduction text
 * - {{question}}: The developer's question about the code
 * - {{content}}: The formatted code content from vector search
 */
export const CODEBASE_QUERY_TEMPLATE = `{{personaIntroduction}} I've provided the content of some source code files below in the section marked 'CODE'. Using all that code for context, answer the question a developer has asked about the code, where their question is shown in the section marked 'QUESTION' below. Provide your answer in a few paragraphs, referring to specific evidence in the provided code.

QUESTION:
{{question}}

CODE:
{{content}}`;

/**
 * Standardized section titles for source file instruction-based prompts.
 * These constants ensure consistency and prevent typos across all source prompt definitions.
 */
export const INSTRUCTION_SECTION_TITLES = {
  BASIC_INFO: "Basic Information",
  CLASS_INFO: "Class Information",
  MODULE_INFO: "Module Information",
  PURPOSE_AND_IMPLEMENTATION: "Purpose and Implementation",
  REFERENCES: "References",
  REFERENCES_AND_DEPS: "References and Dependencies",
  PUBLIC_API: "Public API",
  USER_INPUT_FIELDS: "User Input Fields",
  INTEGRATION_POINTS: "Integration Points",
  DATABASE_INTEGRATION: "Database Integration",
  DATABASE_INTEGRATION_ANALYSIS: "Database Integration Analysis",
  CODE_QUALITY_METRICS: "Code Quality Metrics",
  UI_FRAMEWORK_DETECTION: "User Interface Framework",
  DEPENDENCIES: "Dependencies",
  DATABASE_OBJECTS: "Database Objects",
  SCHEDULED_JOBS: "Scheduled Jobs",
  INSTRUCTIONS: "Instructions",
} as const;

/**
 * Type representing the valid instruction section titles.
 */
export type InstructionSectionTitle =
  (typeof INSTRUCTION_SECTION_TITLES)[keyof typeof INSTRUCTION_SECTION_TITLES];
