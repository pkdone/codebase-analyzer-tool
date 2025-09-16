import { z } from "zod";
import { LLMProviderManifest } from "../../llm-provider.types";
import OpenAILLM, { OpenAIConfig } from "./openai-llm";
import { LLMPurpose } from "../../../types/llm.types";
import { OPENAI_COMMON_ERROR_PATTERNS } from "../common/openai-error-patterns";
import { BadConfigurationLLMError } from "../../../types/llm-errors.types";

// Environment variable name constants
const OPENAI_LLM_API_KEY_KEY = "OPENAI_LLM_API_KEY";
const OPENAI_TEXT_EMBEDDINGS_MODEL_KEY = "OPENAI_TEXT_EMBEDDINGS_MODEL";
const OPENAI_GPT_COMPLETIONS_MODEL_PRIMARY_KEY = "OPENAI_GPT_COMPLETIONS_MODEL_PRIMARY";
const OPENAI_GPT_COMPLETIONS_MODEL_SECONDARY_KEY = "OPENAI_GPT_COMPLETIONS_MODEL_SECONDARY";

// Exported constants
export const OPENAI = "OpenAI";
export const GPT_EMBEDDINGS_TEXT_3SMALL = "GPT_EMBEDDINGS_TEXT_3SMALL";
const GPT_COMPLETIONS_GPT5 = "GPT_COMPLETIONS_GPT5";
const GPT_COMPLETIONS_GPT4_O = "GPT_COMPLETIONS_GPT4_O";

export const openAIProviderManifest: LLMProviderManifest = {
  providerName: "OpenAI GPT",
  modelFamily: OPENAI,
  envSchema: z.object({
    [OPENAI_LLM_API_KEY_KEY]: z.string().min(1),
    [OPENAI_TEXT_EMBEDDINGS_MODEL_KEY]: z.string().min(1),
    [OPENAI_GPT_COMPLETIONS_MODEL_PRIMARY_KEY]: z.string().min(1),
    [OPENAI_GPT_COMPLETIONS_MODEL_SECONDARY_KEY]: z.string().min(1),
  }),
  models: {
    embeddings: {
      modelKey: GPT_EMBEDDINGS_TEXT_3SMALL,
      urnEnvKey: OPENAI_TEXT_EMBEDDINGS_MODEL_KEY,
      purpose: LLMPurpose.EMBEDDINGS,
      dimensions: 1536,
      maxTotalTokens: 8191,
    },
    primaryCompletion: {
      modelKey: GPT_COMPLETIONS_GPT5,
      urnEnvKey: OPENAI_GPT_COMPLETIONS_MODEL_PRIMARY_KEY,
      purpose: LLMPurpose.COMPLETIONS,
      maxCompletionTokens: 128_000,
      maxTotalTokens: 400_000,
    },
    secondaryCompletion: {
      modelKey: GPT_COMPLETIONS_GPT4_O,
      urnEnvKey: OPENAI_GPT_COMPLETIONS_MODEL_SECONDARY_KEY,
      purpose: LLMPurpose.COMPLETIONS,
      maxCompletionTokens: 16_384,
      maxTotalTokens: 128_000,
    },
  },
  errorPatterns: OPENAI_COMMON_ERROR_PATTERNS,
  supportsFullCodebaseAnalysis: false, // OpenAI doesn't support full codebase analysis
  providerSpecificConfig: {
    requestTimeoutMillis: 5 * 60 * 1000, // 5 minutes - OpenAI is generally faster than Azure
    maxRetryAttempts: 3, // Standard retry attempts
    minRetryDelayMillis: 15 * 1000, // 15 seconds - faster retry for OpenAI
    maxRetryAdditionalDelayMillis: 25 * 1000, // 25 seconds additional random delay
  },
  factory: (envConfig, modelsKeysSet, modelsMetadata, errorPatterns, providerSpecificConfig) => {
    const validationResult = openAIProviderManifest.envSchema.safeParse(envConfig);
    if (!validationResult.success)
      throw new BadConfigurationLLMError(
        `Environment validation failed for OpenAI provider: ${JSON.stringify(validationResult.error.issues)}`,
      );

    const validatedEnv = validationResult.data;
    const config: OpenAIConfig = {
      apiKey: validatedEnv[OPENAI_LLM_API_KEY_KEY] as string,
      providerSpecificConfig,
    };
    return new OpenAILLM(modelsKeysSet, modelsMetadata, errorPatterns, config);
  },
};
