import { LLMProviderManifest } from "../../llm-provider.types";
import BedrockLlamaLLM from "./bedrock-llama-llm";
import { LLMPurpose } from "../../../llm.types";
import { BEDROCK_COMMON_ERROR_PATTERNS } from "../bedrock-error-patterns";
import { z } from "zod";
import {
  BEDROCK_TITAN_EMBEDDINGS_MODEL_KEY,
  AWS_EMBEDDINGS_TITAN_V1,
} from "../bedrock-models.constants";

// Environment variable name constants
const BEDROCK_LLAMA_COMPLETIONS_MODEL_PRIMARY_KEY = "BEDROCK_LLAMA_COMPLETIONS_MODEL_PRIMARY";
const BEDROCK_LLAMA_COMPLETIONS_MODEL_SECONDARY_KEY = "BEDROCK_LLAMA_COMPLETIONS_MODEL_SECONDARY";

// Exported constants
export const BEDROCK_LLAMA = "BedrockLlama";
export const AWS_COMPLETIONS_LLAMA_V31_405B_INSTRUCT = "AWS_COMPLETIONS_LLAMA_V31_405B_INSTRUCT";
export const AWS_COMPLETIONS_LLAMA_V32_90B_INSTRUCT = "AWS_COMPLETIONS_LLAMA_V32_90B_INSTRUCT";
export const AWS_COMPLETIONS_LLAMA_V33_70B_INSTRUCT = "AWS_COMPLETIONS_LLAMA_V33_70B_INSTRUCT";

/**
 * AWS_COMPLETIONS_LLAMA_V31_405B_INSTRUCT & AWS_COMPLETIONS_LLAMA_V33_70B_INSTRUCT: Not clear if
 * 'maxCompletionsTokens' is actually less than listed value of 8192
 */

export const bedrockLlamaProviderManifest: LLMProviderManifest = {
  providerName: "Bedrock Llama",
  modelFamily: BEDROCK_LLAMA,
  envSchema: z.object({
    [BEDROCK_TITAN_EMBEDDINGS_MODEL_KEY]: z.string().min(1),
    [BEDROCK_LLAMA_COMPLETIONS_MODEL_PRIMARY_KEY]: z.string().min(1),
    [BEDROCK_LLAMA_COMPLETIONS_MODEL_SECONDARY_KEY]: z.string().min(1),
  }),
  models: {
    embeddings: {
      modelKey: AWS_EMBEDDINGS_TITAN_V1,
      urnEnvKey: BEDROCK_TITAN_EMBEDDINGS_MODEL_KEY,
      purpose: LLMPurpose.EMBEDDINGS,
      dimensions: 1536,
      maxTotalTokens: 8192,
    },
    primaryCompletion: {
      modelKey: AWS_COMPLETIONS_LLAMA_V33_70B_INSTRUCT,
      urnEnvKey: BEDROCK_LLAMA_COMPLETIONS_MODEL_PRIMARY_KEY,
      purpose: LLMPurpose.COMPLETIONS,
      maxCompletionTokens: 8192,
      maxTotalTokens: 128000,
    },
    secondaryCompletion: {
      modelKey: AWS_COMPLETIONS_LLAMA_V32_90B_INSTRUCT,
      urnEnvKey: BEDROCK_LLAMA_COMPLETIONS_MODEL_SECONDARY_KEY,
      purpose: LLMPurpose.COMPLETIONS,
      maxCompletionTokens: 4096,
      maxTotalTokens: 128000,
    },
  },
  errorPatterns: BEDROCK_COMMON_ERROR_PATTERNS,
  providerSpecificConfig: {
    requestTimeoutMillis: 10 * 60 * 1000, // 10 minutes - Llama models can be very slow for large requests
    maxRetryAttempts: 4, // More retries for large models that may have capacity issues
    minRetryDelayMillis: 35 * 1000, // 35 seconds - longer delay for large models
    maxRetryAdditionalDelayMillis: 50 * 1000, // 50 seconds additional random delay
  },
  factory: (_envConfig, modelsKeysSet, modelsMetadata, errorPatterns, _providerSpecificConfig) => {
    void _providerSpecificConfig; // Avoid linting error
    return new BedrockLlamaLLM(modelsKeysSet, modelsMetadata, errorPatterns);
  },
};
