import type { ResolvedLLMModelMetadata } from "../types/llm-model.types";
import type { LLMProviderManifest } from "../providers/llm-provider.types";
import type { ResolvedModelChain } from "../config/llm-module-config.types";

/**
 * Build resolved model metadata from manifest and model chain.
 * Only models that are referenced in the chain are included.
 * URNs come from the chain configuration, not from environment variables.
 */
export function buildModelsMetadataFromChain(
  manifest: LLMProviderManifest,
  modelChain: ResolvedModelChain,
): Record<string, ResolvedLLMModelMetadata> {
  const result: Record<string, ResolvedLLMModelMetadata> = {};
  const providerFamily = manifest.modelFamily;

  // Process completion models from the chain that belong to this provider
  for (const entry of modelChain.completions) {
    if (entry.providerFamily !== providerFamily) continue;

    // Find the model metadata in the manifest
    const modelMetadata = manifest.models.completions.find((m) => m.modelKey === entry.modelKey);
    if (modelMetadata) {
      result[entry.modelKey] = {
        ...modelMetadata,
        urn: entry.modelUrn,
      };
    }
  }

  // Process embedding models from the chain that belong to this provider
  for (const entry of modelChain.embeddings) {
    if (entry.providerFamily !== providerFamily) continue;

    // Find the model metadata in the manifest
    const modelMetadata = manifest.models.embeddings.find((m) => m.modelKey === entry.modelKey);
    if (modelMetadata) {
      result[entry.modelKey] = {
        ...modelMetadata,
        urn: entry.modelUrn,
      };
    }
  }

  return result;
}

/**
 * Get all completion model keys available in this provider from the chain.
 */
export function getCompletionModelKeysFromChain(
  providerFamily: string,
  modelChain: ResolvedModelChain,
): readonly string[] {
  return modelChain.completions
    .filter((entry) => entry.providerFamily === providerFamily)
    .map((entry) => entry.modelKey);
}

/**
 * Get all embedding model keys available in this provider from the chain.
 */
export function getEmbeddingModelKeysFromChain(
  providerFamily: string,
  modelChain: ResolvedModelChain,
): readonly string[] {
  return modelChain.embeddings
    .filter((entry) => entry.providerFamily === providerFamily)
    .map((entry) => entry.modelKey);
}
