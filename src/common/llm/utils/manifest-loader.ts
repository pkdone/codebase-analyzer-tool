import { LLMError, LLMErrorCode } from "../types/llm-errors.types";
import type { LLMProviderManifest } from "../providers/llm-provider.types";
import type { LLMProviderRegistry } from "../config/llm-module-config.types";

/**
 * Load a manifest for a specific provider family from the provided registry.
 *
 * @param providerFamily - The provider family identifier (case-insensitive)
 * @param registry - The provider registry to search in
 * @returns The provider manifest for the specified provider family
 * @throws {LLMError} If no manifest is found for the provider family
 */
export function loadManifestForProviderFamily(
  providerFamily: string,
  registry: LLMProviderRegistry,
): LLMProviderManifest {
  const manifest = registry.get(providerFamily.toLowerCase());

  if (!manifest) {
    throw new LLMError(
      LLMErrorCode.BAD_CONFIGURATION,
      `No provider manifest found for provider family: ${providerFamily}. Available families: ${Array.from(registry.keys()).join(", ")}`,
    );
  }

  return manifest;
}
