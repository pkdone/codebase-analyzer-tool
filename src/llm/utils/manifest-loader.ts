import { BadConfigurationLLMError } from "../types/llm-errors.types";
import { LLMProviderManifest } from "../providers/llm-provider.types";
import { LLM_PROVIDER_REGISTRY } from "../providers";

/**
 * Load a manifest for a specific model family from the provider registry.
 *
 * @param modelFamily - The model family identifier (case-insensitive)
 * @returns The provider manifest for the specified model family
 * @throws {BadConfigurationLLMError} If no manifest is found for the model family
 */
export function loadManifestForModelFamily(modelFamily: string): LLMProviderManifest {
  const manifest = LLM_PROVIDER_REGISTRY.get(modelFamily.toLowerCase());
  if (!manifest) {
    throw new BadConfigurationLLMError(
      `No provider manifest found for model family: ${modelFamily}. Available families: ${Array.from(LLM_PROVIDER_REGISTRY.keys()).join(", ")}`,
    );
  }
  return manifest;
}
