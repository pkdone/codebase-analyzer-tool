import { z } from "zod";
import { LLMProviderManifest } from "../../llm-provider.types";
import AzureOpenAILLM from "./azure-openai-llm";
import { LLMPurpose } from "../../../llm.types";
import { OPENAI_COMMON_ERROR_PATTERNS } from "../openai-error-patterns";
import { BaseEnvVars } from "../../../../lifecycle/env.types";
import { llmConfig } from "../../../llm.config";

// Environment variable name constants
const AZURE_OPENAI_LLM_API_KEY = "AZURE_OPENAI_LLM_API_KEY";
const AZURE_OPENAI_ENDPOINT_KEY = "AZURE_OPENAI_ENDPOINT";
const AZURE_OPENAI_EMBEDDINGS_MODEL_DEPLOYMENT_KEY = "AZURE_OPENAI_EMBEDDINGS_MODEL_DEPLOYMENT";
const AZURE_OPENAI_COMPLETIONS_MODEL_DEPLOYMENT_PRIMARY_KEY =
  "AZURE_OPENAI_COMPLETIONS_MODEL_DEPLOYMENT_PRIMARY";
const AZURE_OPENAI_COMPLETIONS_MODEL_DEPLOYMENT_SECONDARY_KEY =
  "AZURE_OPENAI_COMPLETIONS_MODEL_DEPLOYMENT_SECONDARY";
const AZURE_OPENAI_ADA_EMBEDDINGS_MODEL_KEY = "AZURE_OPENAI_ADA_EMBEDDINGS_MODEL";
const AZURE_OPENAI_GPT_COMPLETIONS_MODEL_PRIMARY_KEY = "AZURE_OPENAI_GPT_COMPLETIONS_MODEL_PRIMARY";
const AZURE_OPENAI_GPT_COMPLETIONS_MODEL_SECONDARY_KEY =
  "AZURE_OPENAI_GPT_COMPLETIONS_MODEL_SECONDARY";

// Exported constants
export const AZURE_OPENAI = "AzureOpenAI";
export const GPT_EMBEDDINGS_ADA002 = "GPT_EMBEDDINGS_ADA002";
export const GPT_COMPLETIONS_GPT4_O = "GPT_COMPLETIONS_GPT4_O";
export const GPT_COMPLETIONS_GPT4_TURBO = "GPT_COMPLETIONS_GPT4_TURBO";

export const azureOpenAIProviderManifest: LLMProviderManifest = {
  providerName: "Azure OpenAI",
  modelFamily: AZURE_OPENAI,
  envSchema: z.object({
    [AZURE_OPENAI_LLM_API_KEY]: z.string().min(1),
    [AZURE_OPENAI_ENDPOINT_KEY]: z.string().url(),
    [AZURE_OPENAI_EMBEDDINGS_MODEL_DEPLOYMENT_KEY]: z.string().min(1),
    [AZURE_OPENAI_COMPLETIONS_MODEL_DEPLOYMENT_PRIMARY_KEY]: z.string().min(1),
    [AZURE_OPENAI_COMPLETIONS_MODEL_DEPLOYMENT_SECONDARY_KEY]: z.string().min(1),
    [AZURE_OPENAI_ADA_EMBEDDINGS_MODEL_KEY]: z.string().min(1),
    [AZURE_OPENAI_GPT_COMPLETIONS_MODEL_PRIMARY_KEY]: z.string().min(1),
    [AZURE_OPENAI_GPT_COMPLETIONS_MODEL_SECONDARY_KEY]: z.string().min(1),
  }),
  models: {
    embeddings: {
      modelKey: GPT_EMBEDDINGS_ADA002,
      urnEnvKey: AZURE_OPENAI_ADA_EMBEDDINGS_MODEL_KEY,
      purpose: LLMPurpose.EMBEDDINGS,
      dimensions: 1536,
      maxTotalTokens: 8191,
    },
    primaryCompletion: {
      modelKey: GPT_COMPLETIONS_GPT4_O,
      urnEnvKey: AZURE_OPENAI_GPT_COMPLETIONS_MODEL_PRIMARY_KEY,
      purpose: LLMPurpose.COMPLETIONS,
      maxCompletionTokens: 16384,
      maxTotalTokens: 128000,
    },
    secondaryCompletion: {
      modelKey: GPT_COMPLETIONS_GPT4_TURBO,
      urnEnvKey: AZURE_OPENAI_GPT_COMPLETIONS_MODEL_SECONDARY_KEY,
      purpose: LLMPurpose.COMPLETIONS,
      maxCompletionTokens: 4096,
      maxTotalTokens: 128000,
    },
  },
  errorPatterns: OPENAI_COMMON_ERROR_PATTERNS,
  providerSpecificConfig: {
    apiVersion: "2025-01-01-preview",
    temperature: llmConfig.DEFAULT_ZERO_TEMP,
    requestTimeoutMillis: 7 * 60 * 1000, // 7 minutes - Azure OpenAI tends to be slower for complex requests
    maxRetryAttempts: 4, // Extra attempt for Azure due to rate limiting
    minRetryDelayMillis: 25 * 1000, // 25 seconds - slightly longer for Azure
    maxRetryAdditionalDelayMillis: 35 * 1000, // 35 seconds additional random delay
  },
  factory: (envConfig, modelsKeysSet, modelsMetadata, errorPatterns, providerSpecificConfig) => {
    const env = envConfig as BaseEnvVars & {
      [AZURE_OPENAI_LLM_API_KEY]: string;
      [AZURE_OPENAI_ENDPOINT_KEY]: string;
      [AZURE_OPENAI_EMBEDDINGS_MODEL_DEPLOYMENT_KEY]: string;
      [AZURE_OPENAI_COMPLETIONS_MODEL_DEPLOYMENT_PRIMARY_KEY]: string;
      [AZURE_OPENAI_COMPLETIONS_MODEL_DEPLOYMENT_SECONDARY_KEY]?: string;
      [AZURE_OPENAI_ADA_EMBEDDINGS_MODEL_KEY]: string;
      [AZURE_OPENAI_GPT_COMPLETIONS_MODEL_PRIMARY_KEY]: string;
      [AZURE_OPENAI_GPT_COMPLETIONS_MODEL_SECONDARY_KEY]: string;
    };
    return new AzureOpenAILLM(
      modelsKeysSet,
      modelsMetadata,
      errorPatterns,
      env[AZURE_OPENAI_LLM_API_KEY],
      env[AZURE_OPENAI_ENDPOINT_KEY],
      env[AZURE_OPENAI_EMBEDDINGS_MODEL_DEPLOYMENT_KEY],
      env[AZURE_OPENAI_COMPLETIONS_MODEL_DEPLOYMENT_PRIMARY_KEY],
      env[AZURE_OPENAI_COMPLETIONS_MODEL_DEPLOYMENT_SECONDARY_KEY] ?? "",
      providerSpecificConfig,
    );
  },
};
