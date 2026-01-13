import { container, DependencyContainer } from "tsyringe";
import { coreTokens } from "../tokens";
import { llmTokens } from "../tokens";
import { EnvVars, baseEnvVarsSchema } from "../../env/env.types";
import { loadManifestForModelFamily } from "../../../common/llm/utils/manifest-loader";
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
  }
  registerProjectName();
}

export function registerLlmEnvDependencies(): void {
  if (!container.isRegistered(coreTokens.EnvVars)) {
    try {
      const envVars = loadEnvIncludingLLMVars();
      container.registerInstance(coreTokens.EnvVars, envVars);
      console.log("LLM environment variables loaded and registered.");

      // Register LLM model family if configured (inlined to avoid Service Locator pattern)
      if (envVars.LLM && !container.isRegistered(llmTokens.LLMModelFamily)) {
        container.registerInstance(llmTokens.LLMModelFamily, envVars.LLM);
        console.log(`LLM model family '${envVars.LLM}' registered.`);
      }
    } catch {
      // If LLM env vars aren't available, fall back to base env vars
      // This allows the container to be bootstrapped even when LLM isn't configured
      // Components will only be instantiated when actually resolved (lazy-loading)
      registerBaseEnvDependencies();
      console.log("LLM environment variables not available, using base environment variables.");
    }
  }
  registerProjectName();
}

/**
 * Cached project name value for singleton behavior with factory provider.
 * tsyringe's FactoryProvider doesn't support lifecycle options, so we implement
 * singleton caching manually.
 */
let cachedProjectName: string | null = null;

/**
 * Register the project name using useFactory to defer resolution.
 * This follows DI best practices by letting the container manage resolution order
 * rather than explicitly resolving dependencies during registration.
 *
 * Note: We implement singleton behavior manually since tsyringe's FactoryProvider
 * doesn't support lifecycle options.
 */
function registerProjectName(): void {
  if (!container.isRegistered(coreTokens.ProjectName)) {
    container.register<string>(coreTokens.ProjectName, {
      useFactory: (c: DependencyContainer): string => {
        if (cachedProjectName !== null) {
          return cachedProjectName;
        }
        const envVars = c.resolve<EnvVars>(coreTokens.EnvVars);
        const projectName = getBaseNameFromPath(envVars.CODEBASE_DIR_PATH);
        console.log(`Project name '${projectName}' derived and registered.`);
        cachedProjectName = projectName;
        return projectName;
      },
    });
  }
}

/**
 * Reset the cached project name. This is intended for testing purposes only
 * to ensure clean state between test runs.
 */
export function resetProjectNameCache(): void {
  cachedProjectName = null;
}

/**
 * Load environment variables including LLM-specific ones.
 */
function loadEnvIncludingLLMVars(): EnvVars {
  try {
    dotenv.config();
    const LlmSelectorSchema = z.object({ LLM: z.string().optional() });
    const rawEnv = process.env;
    const selectedLlmContainer = LlmSelectorSchema.safeParse(rawEnv);
    if (!selectedLlmContainer.success || !selectedLlmContainer.data.LLM) {
      throw new Error("LLM environment variable is not set or is empty in your .env file.");
    }
    const selectedLlmModelFamily = selectedLlmContainer.data.LLM;
    const manifest = loadManifestForModelFamily(selectedLlmModelFamily);
    const finalSchema = baseEnvVarsSchema.merge(manifest.envSchema).passthrough();
    const parsedEnv = finalSchema.parse(rawEnv);

    const llmValue = String(parsedEnv.LLM);
    if (llmValue.toLowerCase() !== manifest.modelFamily.toLowerCase()) {
      throw new LLMError(
        LLMErrorCode.BAD_CONFIGURATION,
        `Warning: LLM environment variable ('${llmValue}') does not precisely match ` +
          `modelFamily ('${manifest.modelFamily}') in the manifest for ${manifest.providerName}. `,
      );
    }

    return parsedEnv as EnvVars;
  } catch (error: unknown) {
    if (error instanceof LLMError && error.code === LLMErrorCode.BAD_CONFIGURATION) throw error;

    if (error instanceof z.ZodError) {
      const missingEnvVars = error.issues
        .filter((issue) => issue.code === "invalid_type" && issue.received === "undefined")
        .map((issue) => issue.path.join("."));

      if (missingEnvVars.length > 0) {
        const selectedLlmModelFamily = process.env.LLM ?? "unknown";
        throw new LLMError(
          LLMErrorCode.BAD_CONFIGURATION,
          `Missing required environment variables for ${selectedLlmModelFamily} provider: ${missingEnvVars.join(", ")}. ` +
            `Please add these variables to your .env file. See EXAMPLE.env for guidance on provider-specific variables.`,
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
