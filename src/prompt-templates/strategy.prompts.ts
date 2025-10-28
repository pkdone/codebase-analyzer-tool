/**
 * Centralized prompt templates for strategy classes
 * These templates are used across different insight generation strategies
 */

/**
 * Template for single-pass insight generation strategy.
 * Used for small to medium codebases that can be processed in one LLM call.
 */
export const SINGLE_PASS_INSIGHTS_TEMPLATE = `Act as a senior developer analyzing the code in a legacy application. Take the list of paths and descriptions of its {{contentDesc}} shown below in the section marked 'SOURCES', and based on their content, return a JSON response that contains {{specificInstructions}}.

The JSON response must follow this JSON schema:
\`\`\`json
{{jsonSchema}}
\`\`\`

{{forceJSON}}

SOURCES:
{{codeContent}}`;

/**
 * Template for partial insights generation (MAP phase of map-reduce strategy).
 * Used for processing subsets of code in large codebases.
 */
export const PARTIAL_INSIGHTS_TEMPLATE = `Act as a senior developer analyzing a subset of code. Based on the list of file summaries below in 'SOURCES', return a JSON response that contains {{specificInstructions}}. This is a partial analysis of a larger codebase; focus on extracting insights from this subset only. The JSON response must follow this JSON schema:
\`\`\`json
{{jsonSchema}}
\`\`\`

{{forceJSON}}

SOURCES:
{{codeContent}}`;

/**
 * Template for consolidating partial insights (REDUCE phase of map-reduce strategy).
 * Used for merging and de-duplicating results from multiple partial analyses.
 */
export const REDUCE_INSIGHTS_TEMPLATE = `Act as a senior developer. You have been provided with several JSON objects below in 'PARTIAL_DATA', each containing a list of '{{categoryKey}}' generated from different parts of a codebase. Your task is to consolidate these lists into a single, de-duplicated, and coherent final JSON object. Merge similar items, remove duplicates based on semantic similarity (not just exact name matches), and ensure the final list is comprehensive and well-organized. The final JSON response must follow this JSON schema:
\`\`\`json
{{jsonSchema}}
\`\`\`

{{forceJSON}}

PARTIAL_DATA:
{{codeContent}}`;

/**
 * Template for analyzing all categories in one go (one-shot strategy)
 * Used by InsightsFromRawCodeGenerator for one-shot insight generation
 */
export const ALL_CATEGORIES_TEMPLATE = `Act as a senior developer analyzing the code in a legacy application. Analyze the application's codebase shown below in the section marked 'SOURCES', and based on the code, return a JSON response that contains:

{{specificInstructions}}.

The JSON response must follow this JSON schema:
\`\`\`json
{{jsonSchema}}
\`\`\`

{{forceJSON}}

SOURCES:
{{codeContent}}`;
