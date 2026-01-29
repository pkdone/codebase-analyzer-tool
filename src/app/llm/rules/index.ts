/**
 * Application-specific LLM JSON sanitization rules.
 *
 * This module re-exports domain-specific replacement rules for handling
 * code artifacts that may appear in LLM responses when analyzing codebases.
 *
 * Note: Java-specific rules are now co-located with Java prompt fragments
 * in src/app/prompts/sources/languages/java/ for better cohesion.
 */
export { JAVA_SPECIFIC_RULES } from "../../prompts/sources/languages/java";
