/**
 * Centralized prompt templates for strategy classes
 * These templates are used across different insight generation strategies
 */

import { MASTER_PROMPT_TEMPLATE } from "./master.prompt";

/**
 * Template for single-pass insight generation strategy.
 * Used for small to medium codebases that can be processed in one LLM call.
 */
export const SINGLE_PASS_INSIGHTS_TEMPLATE = MASTER_PROMPT_TEMPLATE;

/**
 * Template for partial insights generation (MAP phase of map-reduce strategy).
 * Used for processing subsets of code in large codebases.
 */
export const PARTIAL_INSIGHTS_TEMPLATE = MASTER_PROMPT_TEMPLATE;

/**
 * Template for consolidating partial insights (REDUCE phase of map-reduce strategy).
 * Used for merging and de-duplicating results from multiple partial analyses.
 */
export const REDUCE_INSIGHTS_TEMPLATE = MASTER_PROMPT_TEMPLATE;

/**
 * Template for analyzing all categories in one go (one-shot strategy)
 * Used by InsightsFromRawCodeGenerator for one-shot insight generation
 */
export const ALL_CATEGORIES_TEMPLATE = MASTER_PROMPT_TEMPLATE;
