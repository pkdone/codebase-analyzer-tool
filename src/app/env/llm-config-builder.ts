import { LLMModuleConfig } from "../../common/llm/config/llm-module-config.types";
import { EnvVars } from "../env/env.types";
import { loadManifestForModelFamily } from "../../common/llm/utils/manifest-loader";
import { LLMError, LLMErrorCode } from "../../common/llm/types/llm-errors.types";

/**
 * Builds the LLM module configuration from application environment variables.
 * This function bridges the application-specific configuration (EnvVars) with
 * the generic LLM module configuration interface.
 *
 * This function resolves all environment-specific values (like model URNs)
 * before passing them to the generic LLM module, decoupling the module from
 * knowledge of environment variable keys.
 *
 * Note: Sanitizer configuration is now passed per-call in completion options
 * rather than at module-level, allowing different calls to use different
 * sanitization rules if needed.
 *
 * @param envVars The application's environment variables
 * @param modelFamily The LLM model family to use
 * @returns LLM module configuration
 */
export function buildLLMModuleConfig(envVars: EnvVars, modelFamily: string): LLMModuleConfig {
  // Load the manifest to get model URN keys
  const manifest = loadManifestForModelFamily(modelFamily);

  // Helper to resolve URN from environment variable key
  const resolveUrn = (urnEnvKey: string): string => {
    const value = (envVars as Record<string, unknown>)[urnEnvKey];

    if (typeof value !== "string" || value.length === 0) {
      throw new LLMError(
        LLMErrorCode.BAD_CONFIGURATION,
        `Required environment variable ${urnEnvKey} is not set, is empty, or is not a string. Found: ${String(value)}`,
      );
    }

    return value;
  };

  // Resolve all model URNs from environment variables
  const resolvedModels = {
    embeddings: resolveUrn(manifest.models.embeddings.urnEnvKey),
    primaryCompletion: resolveUrn(manifest.models.primaryCompletion.urnEnvKey),
    ...(manifest.models.secondaryCompletion && {
      secondaryCompletion: resolveUrn(manifest.models.secondaryCompletion.urnEnvKey),
    }),
  };

  return {
    modelFamily,
    errorLogging: {
      errorLogDirectory: "output/errors",
      errorLogFilenameTemplate: "response-error-{timestamp}.log",
    },
    providerParams: envVars as Record<string, unknown>,
    resolvedModels,
  };
}
