/**
 * Centralized prompt templates for strategy classes
 * These templates are used across different insight generation strategies
 */

/**
 * Template for single-pass insight generation strategy.
 * Used for small to medium codebases that can be processed in one LLM call.
 */
export const SINGLE_PASS_INSIGHTS_TEMPLATE = `Act as a senior developer analyzing the code in a legacy application. Based on the {{contentDesc}} shown below in the section marked 'FILE_SUMMARIES', return a JSON response that contains:

{{instructions}}.

The JSON response must follow this JSON schema:
\`\`\`json
{{jsonSchema}}
\`\`\`

{{forceJSON}}

FILE_SUMMARIES:
{{content}}`;

/**
 * Template for partial insights generation (MAP phase of map-reduce strategy).
 * Used for processing subsets of code in large codebases.
 */
export const PARTIAL_INSIGHTS_TEMPLATE = `Act as a senior developer analyzing a subset of code in a legacy application. Based on the {{contentDesc}} shown below in the section marked 'FILE_SUMMARIES', return a JSON response that contains:

{{instructions}}.

Note, this is a partial analysis of a larger codebase; focus on extracting insights from this subset of file summaries only.

The JSON response must follow this JSON schema:
\`\`\`json
{{jsonSchema}}
\`\`\`

{{forceJSON}}

FILE_SUMMARIES:
{{content}}`;

/**
 * Template for consolidating partial insights (REDUCE phase of map-reduce strategy).
 * Used for merging and de-duplicating results from multiple partial analyses.
 */
export const REDUCE_INSIGHTS_TEMPLATE = `Act as a senior developer analyzing the code in a legacy application. You have been provided with {{contentDesc}} shown below in the section marked 'FRAGMENTED_DATA', each containing a list of '{{categoryKey}}' generated from different parts of a codebase. Your task is to consolidate these lists into a single, de-duplicated, and coherent final JSON object. Merge similar items, remove duplicates based on semantic similarity (not just exact name matches), and ensure the final list is comprehensive and well-organized.

The final JSON response must follow this JSON schema:
\`\`\`json
{{jsonSchema}}
\`\`\`

{{forceJSON}}

FRAGMENTED_DATA:
{{content}}`;
