import { z } from "zod";
import type { LLMProviderManifest } from "../../llm-provider.types";
import AzureOpenAILLM from "./azure-openai-llm";
import { LLMPurpose } from "../../../types/llm-request.types";
import { OPENAI_COMMON_ERROR_PATTERNS } from "../common/openai-error-patterns";
import { defaultOpenAIProviderConfig } from "../common/openai-defaults.config";
import { llmConfig } from "../../../config/llm.config";

// Environment variable name constants
const AZURE_OPENAI_LLM_API_KEY = "AZURE_OPENAI_LLM_API_KEY";
const AZURE_OPENAI_ENDPOINT_KEY = "AZURE_OPENAI_ENDPOINT";
// Azure-specific: each model needs its own deployment name for routing
const AZURE_OPENAI_EMBEDDINGS_MODEL_DEPLOYMENT_KEY = "AZURE_OPENAI_EMBEDDINGS_MODEL_DEPLOYMENT";
const AZURE_OPENAI_GPT4O_DEPLOYMENT_KEY = "AZURE_OPENAI_GPT4O_MODEL_DEPLOYMENT";
const AZURE_OPENAI_GPT4_TURBO_DEPLOYMENT_KEY = "AZURE_OPENAI_GPT4_TURBO_MODEL_DEPLOYMENT";

// Provider family constant - exported for use in provider registry
export const AZURE_OPENAI_FAMILY = "AzureOpenAI";

// Environment variable keys for model URNs
export const AZURE_OPENAI_ADA_EMBEDDINGS_MODEL_URN_ID = "AZURE_OPENAI_ADA_EMBEDDINGS_MODEL_URN";
export const AZURE_OPENAI_GPT4O_MODEL_URN_ID = "AZURE_OPENAI_GPT4O_MODEL_URN";
export const AZURE_OPENAI_GPT4_TURBO_MODEL_URN_ID = "AZURE_OPENAI_GPT4_TURBO_MODEL_URN";

export const azureOpenAIProviderManifest: LLMProviderManifest = {
  providerFamily: AZURE_OPENAI_FAMILY,
  envSchema: z.object({
    [AZURE_OPENAI_LLM_API_KEY]: z.string().min(1),
    [AZURE_OPENAI_ENDPOINT_KEY]: z.string().url(),
    // Deployment names - each model needs its own deployment
    [AZURE_OPENAI_EMBEDDINGS_MODEL_DEPLOYMENT_KEY]: z.string().min(1),
    [AZURE_OPENAI_GPT4O_DEPLOYMENT_KEY]: z.string().min(1),
    [AZURE_OPENAI_GPT4_TURBO_DEPLOYMENT_KEY]: z.string().min(1),
    // Model URNs
    [AZURE_OPENAI_ADA_EMBEDDINGS_MODEL_URN_ID]: z.string().min(1),
    [AZURE_OPENAI_GPT4O_MODEL_URN_ID]: z.string().min(1),
    [AZURE_OPENAI_GPT4_TURBO_MODEL_URN_ID]: z.string().min(1),
  }),
  models: {
    embeddings: [
      {
        modelKey: "azure-text-embedding-ada-002",
        purpose: LLMPurpose.EMBEDDINGS,
        urnEnvKey: AZURE_OPENAI_ADA_EMBEDDINGS_MODEL_URN_ID,
        dimensions: 1536,
        maxTotalTokens: 8191,
      },
    ],
    completions: [
      {
        modelKey: "azure-gpt-4o",
        purpose: LLMPurpose.COMPLETIONS,
        urnEnvKey: AZURE_OPENAI_GPT4O_MODEL_URN_ID,
        maxCompletionTokens: 16384,
        maxTotalTokens: 128000,
      },
      {
        modelKey: "azure-gpt-4-turbo",
        purpose: LLMPurpose.COMPLETIONS,
        urnEnvKey: AZURE_OPENAI_GPT4_TURBO_MODEL_URN_ID,
        maxCompletionTokens: 4096,
        maxTotalTokens: 128000,
      },
    ],
  },
  errorPatterns: OPENAI_COMMON_ERROR_PATTERNS,
  providerSpecificConfig: {
    ...defaultOpenAIProviderConfig,
    // Azure-specific overrides
    apiVersion: "2025-01-01-preview",
    temperature: llmConfig.DEFAULT_ZERO_TEMP,
    requestTimeoutMillis: 7 * 60 * 1000,
    minRetryDelayMillis: 15 * 1000,
    maxRetryDelayMillis: 120 * 1000,
  },
  implementation: AzureOpenAILLM,
};
