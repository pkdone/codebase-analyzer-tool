/**
 * Global model registry that maps unique model keys to their provider families.
 * This module provides the reverse lookup capability needed when model chains
 * use just model keys instead of Provider:modelKey pairs.
 *
 * The registry is built lazily on first access and validates that all model
 * keys are globally unique across providers. If duplicate model keys are
 * detected, an error is thrown at startup to fail fast.
 */

import { LLM_PROVIDER_REGISTRY } from "../providers";
import { LLMError, LLMErrorCode } from "../types/llm-errors.types";

/**
 * Internal registry state - built lazily on first access.
 */
let modelToProviderMap: Map<string, string> | null = null;

/**
 * Build the model-to-provider registry from all provider manifests.
 * Validates that no model key appears in multiple providers.
 *
 * @throws {LLMError} If duplicate model keys are detected across providers
 */
function buildRegistry(): Map<string, string> {
  const registry = new Map<string, string>();
  const duplicates = new Map<string, string[]>();

  // Iterate through all provider manifests
  for (const [, manifest] of LLM_PROVIDER_REGISTRY) {
    const providerFamily = manifest.modelFamily;

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
 * Get the lazily-initialized model-to-provider registry.
 * The registry is built on first access and cached for subsequent calls.
 *
 * @returns The model-to-provider map
 * @throws {LLMError} If duplicate model keys are detected during first build
 */
function getRegistry(): Map<string, string> {
  modelToProviderMap ??= buildRegistry();
  return modelToProviderMap;
}

/**
 * Look up the provider family for a given model key.
 *
 * @param modelKey - The unique model key to look up
 * @returns The provider family name for this model
 * @throws {LLMError} If the model key is not found in any provider
 */
export function getProviderFamilyForModelKey(modelKey: string): string {
  const registry = getRegistry();
  const providerFamily = registry.get(modelKey);

  if (!providerFamily) {
    const availableKeys = Array.from(registry.keys()).sort();
    throw new LLMError(
      LLMErrorCode.BAD_CONFIGURATION,
      `Unknown model key "${modelKey}". Available model keys: ${availableKeys.join(", ")}`,
    );
  }

  return providerFamily;
}

/**
 * Get all available model keys across all providers.
 * Useful for validation, documentation, and error messages.
 *
 * @returns Array of all registered model keys, sorted alphabetically
 */
export function getAllModelKeys(): string[] {
  const registry = getRegistry();
  return Array.from(registry.keys()).sort();
}

/**
 * Check if a model key exists in the registry.
 *
 * @param modelKey - The model key to check
 * @returns True if the model key is registered
 */
export function isValidModelKey(modelKey: string): boolean {
  const registry = getRegistry();
  return registry.has(modelKey);
}

/**
 * Reset the registry cache. This is intended for testing purposes only
 * to ensure clean state between test runs.
 */
export function resetModelRegistryCache(): void {
  modelToProviderMap = null;
}
