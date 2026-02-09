/**
 * Shared utility for detecting LLM-generated artifact properties.
 *
 * LLMs sometimes inject metadata properties into their JSON output like:
 * - extra_thoughts, extra_text, extra_notes
 * - _llm_reasoning, _ai_analysis
 * - internal_*, debug_*, temp_*
 * - *_thoughts, *_reasoning, *_scratchpad
 *
 * This module provides centralized detection logic used by multiple sanitizers.
 */

/**
 * Prefix patterns that indicate LLM-generated artifact properties.
 * Case-insensitive matching.
 */
const ARTIFACT_PREFIXES = [
  "extra_",
  "llm_",
  "ai_",
  "model_",
  "gpt_",
  "claude_",
  "gemini_",
  "debug_",
  "temp_",
  "tmp_",
  "internal_",
  "private_",
  "hidden_",
] as const;

/**
 * Suffix patterns that indicate LLM-generated artifact properties.
 * Case-insensitive matching.
 */
const ARTIFACT_SUFFIXES = [
  "_thoughts",
  "_thought",
  "_thinking",
  "_reasoning",
  "_analysis",
  "_scratchpad",
  "_notes",
  "_note",
  "_comment",
  "_metadata",
  "_internal",
  "_private",
  "_context",
  "_response",
  "_output",
  "_trace",
  "_chain",
  "_steps",
  "_step",
  "_working",
  "_draft",
  "_intermediate",
  "_scratch",
  "_text",
  "_info",
] as const;

/**
 * Regex pattern for compound artifact-indicating terms.
 * These patterns strongly indicate LLM-generated metadata.
 */
const COMPOUND_ARTIFACT_PATTERN =
  /(?:thought|thinking|reasoning|scratchpad|chain_of_thought|reasoning_trace|working_memory|intermediate_result|scratch_work|step_by_step)/i;

/**
 * Checks if a property name looks like LLM-generated metadata/artifact.
 * Uses pattern matching rather than hardcoded word lists.
 *
 * @param propertyName - The property name to check
 * @returns True if the property name looks like LLM-generated metadata
 */
export function isLLMArtifactPropertyName(propertyName: string): boolean {
  const lowerName = propertyName.toLowerCase();

  // Pattern 1: Prefixed with known artifact prefixes
  for (const prefix of ARTIFACT_PREFIXES) {
    if (lowerName.startsWith(prefix)) {
      return true;
    }
  }

  // Pattern 2: Starts with underscore (internal/hidden property convention)
  if (/^_[a-z_]+$/i.test(propertyName)) {
    return true;
  }

  // Pattern 3: Ends with known artifact suffixes
  for (const suffix of ARTIFACT_SUFFIXES) {
    if (lowerName.endsWith(suffix)) {
      return true;
    }
  }

  // Pattern 4: Contains compound artifact-indicating terms
  if (COMPOUND_ARTIFACT_PATTERN.test(lowerName) && !lowerName.startsWith('"')) {
    return true;
  }

  return false;
}

/**
 * Checks if a property should be removed based on known properties list.
 * When knownProperties is provided and a property is not in that list,
 * and it looks like potential LLM-generated metadata, it should be removed.
 *
 * @param propertyName - The property name to check
 * @param knownProperties - Optional list of known valid property names
 * @returns True if the property should be removed
 */
export function shouldRemoveAsLLMArtifact(
  propertyName: string,
  knownProperties: readonly string[] | undefined,
): boolean {
  // If no knownProperties provided, only use pattern-based detection
  if (!knownProperties || knownProperties.length === 0) {
    return isLLMArtifactPropertyName(propertyName);
  }

  // Check if property is in the known list (case-insensitive)
  const lowerName = propertyName.toLowerCase();
  const isKnown = knownProperties.some((p) => p.toLowerCase() === lowerName);

  if (isKnown) {
    return false;
  }

  // For unknown properties, check if they match artifact patterns
  return isLLMArtifactPropertyName(propertyName);
}

/**
 * Checks if a property looks like an LLM artifact OR an internal/hidden property.
 * This is a slightly broader check that also includes special cases like "codeSmells"
 * when they appear orphaned in corrupted JSON.
 *
 * @param propertyName - The property name to check
 * @returns True if the property looks like an LLM artifact or internal property
 */
export function isLLMArtifactOrInternalProperty(propertyName: string): boolean {
  // First check the main artifact detection
  if (isLLMArtifactPropertyName(propertyName)) {
    return true;
  }

  // Additional check for common orphaned properties in corrupted JSON
  // These are valid schema properties that can appear orphaned due to corruption
  if (/^codeSmells$/i.test(propertyName)) {
    return true;
  }

  return false;
}
