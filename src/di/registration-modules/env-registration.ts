import { container } from "tsyringe";
import { coreTokens } from "../tokens";
import { llmTokens } from "../tokens";
import { EnvVars, baseEnvVarsSchema } from "../../env/env.types";
import { loadManifestForModelFamily } from "../../common/llm/utils/manifest-loader";
import { loadBaseEnvVarsOnly } from "../../env/env";
import { z } from "zod";
import { BadConfigurationLLMError } from "../../common/llm/types/llm-errors.types";
import { getErrorStack } from "../../common/utils/error-formatters";
import { getProjectNameFromPath } from "../../common/fs/path-utils";
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
      registerLlmModelFamily();
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

function registerProjectName(): void {
  if (!container.isRegistered(coreTokens.ProjectName)) {
    const envVars = container.resolve<EnvVars>(coreTokens.EnvVars);
    const projectName = getProjectNameFromPath(envVars.CODEBASE_DIR_PATH);
    container.registerInstance(coreTokens.ProjectName, projectName);
    console.log(`Project name '${projectName}' derived and registered.`);
  }
}

function registerLlmModelFamily(): void {
  const envVars = container.resolve<EnvVars>(coreTokens.EnvVars);
  if (envVars.LLM && !container.isRegistered(llmTokens.LLMModelFamily)) {
    container.registerInstance(llmTokens.LLMModelFamily, envVars.LLM);
    console.log(`LLM model family '${envVars.LLM}' registered.`);
  }
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
      throw new BadConfigurationLLMError(
        `Warning: LLM environment variable ('${llmValue}') does not precisely match ` +
          `modelFamily ('${manifest.modelFamily}') in the manifest for ${manifest.providerName}. `,
      );
    }

    return parsedEnv as EnvVars;
  } catch (error: unknown) {
    if (error instanceof BadConfigurationLLMError) throw error;

    if (error instanceof z.ZodError) {
      const missingEnvVars = error.issues
        .filter((issue) => issue.code === "invalid_type" && issue.received === "undefined")
        .map((issue) => issue.path.join("."));

      if (missingEnvVars.length > 0) {
        const selectedLlmModelFamily = process.env.LLM ?? "unknown";
        throw new BadConfigurationLLMError(
          `Missing required environment variables for ${selectedLlmModelFamily} provider: ${missingEnvVars.join(", ")}. ` +
            `Please add these variables to your .env file. See EXAMPLE.env for guidance on provider-specific variables.`,
        );
      }
    }

    throw new BadConfigurationLLMError(
      "Failed to load and validate environment variables for LLM configuration",
      getErrorStack(error),
    );
  }
}
