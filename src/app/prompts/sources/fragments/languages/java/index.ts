/**
 * Java-specific prompt fragments and sanitization rules.
 *
 * This module co-locates all "Java knowledge" in one place:
 * - Prompt fragments for analyzing Java code
 * - Sanitization rules for cleaning up Java artifacts from LLM responses
 */

export { JAVA_SPECIFIC_FRAGMENTS } from "./java.fragments";
export { JAVA_SPECIFIC_RULES } from "./java-sanitization-rules";
