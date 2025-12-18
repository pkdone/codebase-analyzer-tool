import type { LLMModelKeysSet, ResolvedLLMModelMetadata } from "../types/llm.types";
import type { LLMProviderManifest } from "../providers/llm-provider.types";
import type { ResolvedModels } from "../config/llm-module-config.types";

/**
 * Build LLMModelKeysSet from manifest.
 * Extracts model keys for embeddings and completion models.
 */
export function buildModelsKeysSet(manifest: LLMProviderManifest): LLMModelKeysSet {
  return {
    embeddingsModelKey: manifest.models.embeddings.modelKey,
    primaryCompletionModelKey: manifest.models.primaryCompletion.modelKey,
    ...(manifest.models.secondaryCompletion && {
      secondaryCompletionModelKey: manifest.models.secondaryCompletion.modelKey,
    }),
  };
}

/**
 * Build resolved model metadata from manifest and pre-resolved URNs.
 * URNs are resolved by the application layer, not by the LLM module.
 */
export function buildModelsMetadataFromResolvedUrns(
  manifest: LLMProviderManifest,
  resolvedModels: ResolvedModels,
): Record<string, ResolvedLLMModelMetadata> {
  const models = [
    { ...manifest.models.embeddings, urn: resolvedModels.embeddings },
    { ...manifest.models.primaryCompletion, urn: resolvedModels.primaryCompletion },
    ...(manifest.models.secondaryCompletion && resolvedModels.secondaryCompletion
      ? [{ ...manifest.models.secondaryCompletion, urn: resolvedModels.secondaryCompletion }]
      : []),
  ];

  return Object.fromEntries(models.map((model) => [model.modelKey, model] as const)) as Record<
    string,
    ResolvedLLMModelMetadata
  >;
}
