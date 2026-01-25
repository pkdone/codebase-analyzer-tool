import type {
  LLMModuleConfig,
  ModelChainEntry,
} from "../../common/llm/config/llm-module-config.types";
import type { EnvVars } from "../env/env.types";
import { parseModelChain } from "../env/env.types";
import { loadManifestForProviderFamily } from "../../common/llm/utils/manifest-loader";
import { APP_PROVIDER_REGISTRY } from "../llm/provider-registry";
import { LLMError, LLMErrorCode } from "../../common/llm/types/llm-errors.types";
import type { LLMModelMetadata } from "../../common/llm/types/llm-model.types";

/**
 * Finds a model in the provider's manifest and returns its metadata.
 *
 * @param providerFamily The provider family name
 * @param modelKey The model key to find
 * @param modelType "completions" or "embeddings"
 * @returns The model metadata if found
 * @throws LLMError if the model key is not found
 */
function findModelMetadata(
  providerFamily: string,
  modelKey: string,
  modelType: "completions" | "embeddings",
): LLMModelMetadata {
  const manifest = loadManifestForProviderFamily(providerFamily, APP_PROVIDER_REGISTRY);
  const availableModels = manifest.models[modelType];
  const model = availableModels.find((m) => m.modelKey === modelKey);

  if (!model) {
    const validKeys = availableModels.map((m) => m.modelKey);
    throw new LLMError(
      LLMErrorCode.BAD_CONFIGURATION,
      `Model key '${modelKey}' not found in ${providerFamily} ${modelType} models. ` +
        `Available: ${validKeys.join(", ")}`,
    );
  }

  return model;
}

/**
 * Resolves the model URN from the environment variable specified by urnEnvKey.
 *
 * @param urnEnvKey The environment variable key containing the model URN
 * @param envVars The environment variables
 * @param modelKey The model key (for error messages)
 * @returns The resolved URN string
 * @throws LLMError if the environment variable is not set
 */
function resolveModelUrn(
  urnEnvKey: string,
  envVars: Record<string, unknown>,
  modelKey: string,
): string {
  const urn = envVars[urnEnvKey];
  if (typeof urn !== "string" || urn.length === 0) {
    throw new LLMError(
      LLMErrorCode.BAD_CONFIGURATION,
      `Environment variable '${urnEnvKey}' for model '${modelKey}' is not set or empty.`,
    );
  }
  return urn;
}

/**
 * Builds a resolved model chain from the parsed chain entries.
 * Validates that all referenced models exist in their provider manifests
 * and resolves URNs from environment variables.
 *
 * @param parsedEntries The parsed chain entries
 * @param modelType "completions" or "embeddings"
 * @param envVars The environment variables for URN resolution
 * @returns Array of ModelChainEntry with resolved URNs
 */
function buildResolvedChain(
  parsedEntries: ReturnType<typeof parseModelChain>,
  modelType: "completions" | "embeddings",
  envVars: Record<string, unknown>,
): ModelChainEntry[] {
  return parsedEntries.map((entry) => {
    const modelMetadata = findModelMetadata(entry.providerFamily, entry.modelKey, modelType);
    const modelUrn = resolveModelUrn(modelMetadata.urnEnvKey, envVars, entry.modelKey);

    return {
      providerFamily: entry.providerFamily,
      modelKey: entry.modelKey,
      modelUrn,
    };
  });
}

/**
 * Builds the LLM module configuration from application environment variables.
 * This function bridges the application-specific configuration (EnvVars) with
 * the generic LLM module configuration interface.
 *
 * The architecture uses model chain configuration with globally unique model keys:
 * - LLM_COMPLETIONS: Comma-separated list of model keys (e.g., "vertexai-gemini-3-pro,bedrock-claude-opus-4.5")
 * - LLM_EMBEDDINGS: Comma-separated list of model keys (e.g., "vertexai-gemini-embedding-001")
 *
 * Provider families are automatically resolved from the app's model registry.
 * Model URNs are resolved from provider-specific environment variables (urnEnvKey in manifests).
 *
 * @param envVars The application's environment variables
 * @returns LLM module configuration with resolved model chains
 */
export function buildLLMModuleConfig(envVars: EnvVars): LLMModuleConfig {
  // Parse the model chains from environment variables
  const completionsChain = parseModelChain(envVars.LLM_COMPLETIONS);
  const embeddingsChain = parseModelChain(envVars.LLM_EMBEDDINGS);

  // Validate and build resolved chains with URNs from environment variables
  const resolvedCompletions = buildResolvedChain(
    completionsChain,
    "completions",
    envVars as Record<string, unknown>,
  );
  const resolvedEmbeddings = buildResolvedChain(
    embeddingsChain,
    "embeddings",
    envVars as Record<string, unknown>,
  );

  return {
    errorLogging: {
      errorLogDirectory: "output/errors",
      errorLogFilenameTemplate: "response-error-{timestamp}.log",
    },
    providerParams: envVars as Record<string, unknown>,
    resolvedModelChain: {
      completions: resolvedCompletions,
      embeddings: resolvedEmbeddings,
    },
    providerRegistry: APP_PROVIDER_REGISTRY,
  };
}
