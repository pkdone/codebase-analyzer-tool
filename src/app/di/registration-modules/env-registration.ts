import { container } from "tsyringe";
import { coreTokens } from "../tokens";
import type { EnvVars } from "../../env/env.types";
import { baseEnvVarsSchema, parseModelChain, getUniqueProviderFamilies } from "../../env/env.types";
import { loadManifestForProviderFamily } from "../../../common/llm/utils/manifest-loader";
import { APP_PROVIDER_REGISTRY } from "../../llm/provider-registry";
import { loadBaseEnvVarsOnly } from "../../env/env";
import { z } from "zod";
import { LLMError, LLMErrorCode } from "../../../common/llm/types/llm-errors.types";
import { getErrorStack } from "../../../common/utils/error-formatters";
import { getBaseNameFromPath } from "../../../common/fs/path-utils";
import dotenv from "dotenv";

/**
 * Register environment variables based on requirements.
 * Uses conditional registration with tsyringe's isRegistered check to prevent duplicates.
 */
export function registerBaseEnvDependencies(): void {
  if (!container.isRegistered(coreTokens.EnvVars)) {
    const envVars = loadBaseEnvVarsOnly();
    container.registerInstance(coreTokens.EnvVars, envVars);
    console.log("Base environment variables loaded and registered.");

    // Register derived ProjectName immediately since env vars are already loaded
    // and won't change at runtime. Using registerInstance provides true singleton
    // behavior without the need for manual caching.
    registerProjectNameFromEnvVars(envVars);
  }
}

export function registerLlmEnvDependencies(): void {
  if (!container.isRegistered(coreTokens.EnvVars)) {
    try {
      const envVars = loadEnvIncludingLLMVars();
      container.registerInstance(coreTokens.EnvVars, envVars);
      console.log("LLM environment variables loaded and registered.");

      // Register derived ProjectName immediately since env vars are already loaded
      registerProjectNameFromEnvVars(envVars);
    } catch {
      // If LLM env vars aren't available, fall back to base env vars
      // This allows the container to be bootstrapped even when LLM isn't configured
      // Components will only be instantiated when actually resolved (lazy-loading)
      registerBaseEnvDependencies();
      console.log("LLM environment variables not available, using base environment variables.");
    }
  }
}

/**
 * Register the project name as an instance derived from environment variables.
 * Since environment variables don't change at runtime, we calculate the value
 * immediately and register it as an instance for true singleton behavior.
 *
 * @param envVars - The loaded environment variables
 */
function registerProjectNameFromEnvVars(envVars: EnvVars): void {
  if (!container.isRegistered(coreTokens.ProjectName)) {
    const projectName = getBaseNameFromPath(envVars.CODEBASE_DIR_PATH);
    container.registerInstance(coreTokens.ProjectName, projectName);
    console.log(`Project name '${projectName}' derived and registered.`);
  }
}

/**
 * Load environment variables including LLM-specific ones.
 * The new architecture uses model chain configuration via LLM_COMPLETION_MODEL_CHAIN and LLM_EMBEDDING_MODEL_CHAIN.
 */
function loadEnvIncludingLLMVars(): EnvVars {
  try {
    dotenv.config();
    const rawEnv = process.env;

    // First, parse just the base schema to get the model chains
    const baseResult = baseEnvVarsSchema.safeParse(rawEnv);

    if (!baseResult.success) {
      throw baseResult.error;
    }

    const { LLM_COMPLETION_MODEL_CHAIN, LLM_EMBEDDING_MODEL_CHAIN } = baseResult.data;

    // Parse chains to get unique provider families
    const completionsChain = parseModelChain(LLM_COMPLETION_MODEL_CHAIN);
    const embeddingsChain = parseModelChain(LLM_EMBEDDING_MODEL_CHAIN);
    const allFamilies = getUniqueProviderFamilies([...completionsChain, ...embeddingsChain]);

    console.log(
      `Loading environment for providers: ${allFamilies.join(", ")} ` +
        `(from chains: completions=${completionsChain.length} models, embeddings=${embeddingsChain.length} models)`,
    );

    // Build combined schema from all required provider manifests
    // Use z.object with passthrough for flexible schema merging
    let combinedShape: z.ZodRawShape = { ...baseEnvVarsSchema.shape };

    for (const family of allFamilies) {
      const manifest = loadManifestForProviderFamily(family, APP_PROVIDER_REGISTRY);
      combinedShape = { ...combinedShape, ...manifest.envSchema.shape };
    }

    const combinedSchema = z.object(combinedShape).passthrough();
    const parsedEnv = combinedSchema.parse(rawEnv);
    return parsedEnv as EnvVars;
  } catch (error: unknown) {
    if (error instanceof LLMError && error.code === LLMErrorCode.BAD_CONFIGURATION) throw error;

    if (error instanceof z.ZodError) {
      const missingEnvVars = error.issues
        .filter((issue) => issue.code === "invalid_type" && issue.received === "undefined")
        .map((issue) => issue.path.join("."));

      if (missingEnvVars.length > 0) {
        throw new LLMError(
          LLMErrorCode.BAD_CONFIGURATION,
          `Missing required environment variables: ${missingEnvVars.join(", ")}. ` +
            `Please add these variables to your .env file. See EXAMPLE.env for guidance.`,
        );
      }
    }

    throw new LLMError(
      LLMErrorCode.BAD_CONFIGURATION,
      "Failed to load and validate environment variables for LLM configuration",
      getErrorStack(error),
    );
  }
}
