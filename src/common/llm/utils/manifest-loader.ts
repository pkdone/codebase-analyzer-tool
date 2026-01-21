import { LLMError, LLMErrorCode } from "../types/llm-errors.types";
import { LLMProviderManifest } from "../providers/llm-provider.types";
import { LLM_PROVIDER_REGISTRY } from "../providers";

/**
 * Load a manifest for a specific provider family from the provider registry.
 *
 * @param providerFamily - The provider family identifier (case-insensitive)
 * @returns The provider manifest for the specified provider family
 * @throws {LLMError} If no manifest is found for the provider family
 */
export function loadManifestForProviderFamily(providerFamily: string): LLMProviderManifest {
  const manifest = LLM_PROVIDER_REGISTRY.get(providerFamily.toLowerCase());
  if (!manifest) {
    throw new LLMError(
      LLMErrorCode.BAD_CONFIGURATION,
      `No provider manifest found for provider family: ${providerFamily}. Available families: ${Array.from(LLM_PROVIDER_REGISTRY.keys()).join(", ")}`,
    );
  }
  return manifest;
}
