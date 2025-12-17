import { LLMModuleConfig } from "../../common/llm/config/llm-module-config.types";
import { EnvVars } from "../env/env.types";

/**
 * Builds the LLM module configuration from application environment variables.
 * This function bridges the application-specific configuration (EnvVars) with
 * the generic LLM module configuration interface.
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
  return {
    modelFamily,
    errorLogging: {
      errorLogDirectory: "output/errors",
      errorLogFilenameTemplate: "response-error-{timestamp}.log",
    },
    providerParameters: envVars as Record<string, string>,
  };
}
