import { LLMProviderManifest } from "../../llm-provider.types";
import BedrockMistralLLM from "./bedrock-mistral-llm";
import { LLMPurpose } from "../../../types/llm.types";
import { BEDROCK_COMMON_ERROR_PATTERNS } from "../common/bedrock-error-patterns";
import { z } from "zod";
import {
  BEDROCK_TITAN_EMBEDDINGS_MODEL_KEY,
  AWS_EMBEDDINGS_TITAN_V1,
} from "../common/bedrock-models.constants";
import { BedrockConfig } from "../common/base-bedrock-llm";

// Environment variable name constants
const BEDROCK_MISTRAL_COMPLETIONS_MODEL_PRIMARY_KEY = "BEDROCK_MISTRAL_COMPLETIONS_MODEL_PRIMARY";
const BEDROCK_MISTRAL_COMPLETIONS_MODEL_SECONDARY_KEY =
  "BEDROCK_MISTRAL_COMPLETIONS_MODEL_SECONDARY";

// Exported constants
export const BEDROCK_MISTRAL = "BedrockMistral";
const AWS_COMPLETIONS_MISTRAL_LARGE = "AWS_COMPLETIONS_MISTRAL_LARGE";
const AWS_COMPLETIONS_MISTRAL_LARGE2 = "AWS_COMPLETIONS_MISTRAL_LARGE2";

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
      purpose: LLMPurpose.COMPLETIONS,
      maxCompletionTokens: 8192,
      maxTotalTokens: 32768,
    },
  },
  errorPatterns: BEDROCK_COMMON_ERROR_PATTERNS,
  providerSpecificConfig: {
    requestTimeoutMillis: 8 * 60 * 1000,
    maxRetryAttempts: 3, 
    minRetryDelayMillis: 30 * 1000,
    maxRetryDelayMillis: 200 * 1000,
  },
  factory: (_envConfig, modelsKeysSet, modelsMetadata, errorPatterns, providerSpecificConfig) => {
    const config: BedrockConfig = {
      providerSpecificConfig,
    };
    return new BedrockMistralLLM(modelsKeysSet, modelsMetadata, errorPatterns, config);
  },
};
