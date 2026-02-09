/**
 * Model registry that maps unique model keys to their provider families.
 * This module provides the reverse lookup capability needed when model chains
 * use just model keys instead of Provider:modelKey pairs.
 *
 * The registry is built from the provided provider registry and validates that
 * all model keys are globally unique across providers. If duplicate model keys
 * are detected, an error is thrown to fail fast.
 */

import type { LLMProviderRegistry } from "../config/llm-module-config.types";
import { LLMError, LLMErrorCode } from "../types/llm-errors.types";

/**
 * Build the model-to-provider registry from the provided provider manifests.
 * Validates that no model key appears in multiple providers.
 *
 * @param providerRegistry - The provider registry to build from
 * @returns Map of model keys to provider family names
 * @throws {LLMError} If duplicate model keys are detected across providers
 */
export function buildModelRegistry(providerRegistry: LLMProviderRegistry): Map<string, string> {
  const registry = new Map<string, string>();
  const duplicates = new Map<string, string[]>();

  // Iterate through all provider manifests
  for (const [, manifest] of providerRegistry) {
    const providerFamily = manifest.providerFamily;

    // Process embeddings models
    for (const model of manifest.models.embeddings) {
      const existingProvider = registry.get(model.modelKey);

      if (existingProvider !== undefined) {
        // Duplicate found - track it
        const existingDuplicates = duplicates.get(model.modelKey) ?? [existingProvider];
        existingDuplicates.push(providerFamily);
        duplicates.set(model.modelKey, existingDuplicates);
      } else {
        registry.set(model.modelKey, providerFamily);
      }
    }

    // Process completions models
    for (const model of manifest.models.completions) {
      const existingProvider = registry.get(model.modelKey);

      if (existingProvider !== undefined) {
        // Duplicate found - track it
        const existingDuplicates = duplicates.get(model.modelKey) ?? [existingProvider];
        existingDuplicates.push(providerFamily);
        duplicates.set(model.modelKey, existingDuplicates);
      } else {
        registry.set(model.modelKey, providerFamily);
      }
    }
  }

  // If any duplicates were found, throw an error with details
  if (duplicates.size > 0) {
    const conflictDescriptions = Array.from(duplicates.entries())
      .map(([modelKey, providers]) => `"${modelKey}" defined in [${providers.join(", ")}]`)
      .join("; ");
    throw new LLMError(
      LLMErrorCode.BAD_CONFIGURATION,
      `Duplicate model keys detected across providers. Model keys must be globally unique. ` +
        `Conflicts: ${conflictDescriptions}`,
    );
  }

  return registry;
}

/**
 * Look up the provider family for a given model key in a model registry.
 *
 * @param modelKey - The unique model key to look up
 * @param modelRegistry - The model registry to search in
 * @returns The provider family name for this model
 * @throws {LLMError} If the model key is not found in the registry
 */
export function getProviderFamilyForModelKey(
  modelKey: string,
  modelRegistry: Map<string, string>,
): string {
  const providerFamily = modelRegistry.get(modelKey);

  if (!providerFamily) {
    const availableKeys = Array.from(modelRegistry.keys()).sort();
    throw new LLMError(
      LLMErrorCode.BAD_CONFIGURATION,
      `Unknown model key "${modelKey}". Available model keys: ${availableKeys.join(", ")}`,
    );
  }

  return providerFamily;
}

/**
 * Get all available model keys from a model registry.
 * Useful for validation, documentation, and error messages.
 *
 * @param modelRegistry - The model registry to get keys from
 * @returns Array of all registered model keys, sorted alphabetically
 */
export function getAllModelKeys(modelRegistry: Map<string, string>): string[] {
  return Array.from(modelRegistry.keys()).sort();
}
