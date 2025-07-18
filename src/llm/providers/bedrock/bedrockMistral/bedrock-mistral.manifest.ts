import { LLMProviderManifest } from "../../llm-provider.types";
import BedrockMistralLLM from "./bedrock-mistral-llm";
import { LLMPurpose } from "../../../llm.types";
import { BEDROCK_COMMON_ERROR_PATTERNS } from "../bedrock-error-patterns";
import { z } from "zod";
import {
  BEDROCK_TITAN_EMBEDDINGS_MODEL_KEY,
  AWS_EMBEDDINGS_TITAN_V1,
} from "../bedrock-models.constants";

// Environment variable name constants
const BEDROCK_MISTRAL_COMPLETIONS_MODEL_PRIMARY_KEY = "BEDROCK_MISTRAL_COMPLETIONS_MODEL_PRIMARY";
const BEDROCK_MISTRAL_COMPLETIONS_MODEL_SECONDARY_KEY =
  "BEDROCK_MISTRAL_COMPLETIONS_MODEL_SECONDARY";

// Exported constants
export const BEDROCK_MISTRAL = "BedrockMistral";
export const AWS_COMPLETIONS_MISTRAL_LARGE = "AWS_COMPLETIONS_MISTRAL_LARGE";
export const AWS_COMPLETIONS_MISTRAL_LARGE2 = "AWS_COMPLETIONS_MISTRAL_LARGE2";

export const bedrockMistralProviderManifest: LLMProviderManifest = {
  providerName: "Bedrock Mistral",
  modelFamily: BEDROCK_MISTRAL,
  envSchema: z.object({
    [BEDROCK_TITAN_EMBEDDINGS_MODEL_KEY]: z.string().min(1),
    [BEDROCK_MISTRAL_COMPLETIONS_MODEL_PRIMARY_KEY]: z.string().min(1),
    [BEDROCK_MISTRAL_COMPLETIONS_MODEL_SECONDARY_KEY]: z.string().min(1),
  }),
  models: {
    embeddings: {
      modelKey: AWS_EMBEDDINGS_TITAN_V1,
      urnEnvKey: BEDROCK_TITAN_EMBEDDINGS_MODEL_KEY,
      purpose: LLMPurpose.EMBEDDINGS,
      dimensions: 1024,
      maxTotalTokens: 8192,
    },
    primaryCompletion: {
      modelKey: AWS_COMPLETIONS_MISTRAL_LARGE2,
      urnEnvKey: BEDROCK_MISTRAL_COMPLETIONS_MODEL_PRIMARY_KEY,
      purpose: LLMPurpose.COMPLETIONS,
      maxCompletionTokens: 8192,
      maxTotalTokens: 131072,
    },
    secondaryCompletion: {
      modelKey: AWS_COMPLETIONS_MISTRAL_LARGE,
      urnEnvKey: BEDROCK_MISTRAL_COMPLETIONS_MODEL_SECONDARY_KEY,
      maxCompletionTokens: 8192,
      maxTotalTokens: 32768,
      purpose: LLMPurpose.COMPLETIONS,
    },
  },
  errorPatterns: BEDROCK_COMMON_ERROR_PATTERNS,
  providerSpecificConfig: {
    requestTimeoutMillis: 8 * 60 * 1000, // 8 minutes - Mistral models are reasonably fast
    maxRetryAttempts: 3, // Standard retries for Mistral
    minRetryDelayMillis: 25 * 1000, // 25 seconds
    maxRetryAdditionalDelayMillis: 35 * 1000, // 35 seconds additional random delay
  },
  factory: (_envConfig, modelsKeysSet, modelsMetadata, errorPatterns, _providerSpecificConfig) => {
    void _providerSpecificConfig; // Avoid linting error
    return new BedrockMistralLLM(modelsKeysSet, modelsMetadata, errorPatterns);
  },
};
