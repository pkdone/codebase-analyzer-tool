/**
 * Centralized prompt templates for strategy classes
 * These templates are used across different insight generation strategies
 */

/**
 * Unified template for app summary insight generation strategies.
 * Used for both single-pass and map-reduce strategies with optional partial analysis note.
 */
export const APP_SUMMARY_TEMPLATE = `Act as a senior developer analyzing the code in a legacy application. Based on the {{contentDesc}} shown below in the section marked 'FILE_SUMMARIES', return a JSON response that contains:

{{instructions}}.

{{partialAnalysisNote}}The JSON response must follow this JSON schema:
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
