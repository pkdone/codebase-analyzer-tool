import { LLMProviderManifest } from "../../llm-provider.types";
import BedrockNovaLLM from "./bedrock-nova-llm";
import { LLMPurpose } from "../../../types/llm.types";
import { BEDROCK_COMMON_ERROR_PATTERNS } from "../common/bedrock-error-patterns";
import { z } from "zod";
import {
  BEDROCK_TITAN_EMBEDDINGS_MODEL_KEY,
  AWS_EMBEDDINGS_TITAN_V1,
} from "../common/bedrock-models.constants";
import { BedrockConfig } from "../common/base-bedrock-llm";

// Environment variable name constants
const BEDROCK_NOVA_COMPLETIONS_MODEL_PRIMARY_KEY = "BEDROCK_NOVA_COMPLETIONS_MODEL_PRIMARY";
const BEDROCK_NOVA_COMPLETIONS_MODEL_SECONDARY_KEY = "BEDROCK_NOVA_COMPLETIONS_MODEL_SECONDARY";

// Exported model key constants
export const BEDROCK_NOVA = "BedrockNova";
const AWS_COMPLETIONS_NOVA_LITE_V1 = "AWS_COMPLETIONS_NOVA_LITE_V1";
const AWS_COMPLETIONS_NOVA_PRO_V1 = "AWS_COMPLETIONS_NOVA_PRO_V1";

export const bedrockNovaProviderManifest: LLMProviderManifest = {
  providerName: "Bedrock Nova",
  modelFamily: BEDROCK_NOVA,
  envSchema: z.object({
    [BEDROCK_TITAN_EMBEDDINGS_MODEL_KEY]: z.string().min(1),
    [BEDROCK_NOVA_COMPLETIONS_MODEL_PRIMARY_KEY]: z.string().min(1),
    [BEDROCK_NOVA_COMPLETIONS_MODEL_SECONDARY_KEY]: z.string().min(1),
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
      modelKey: AWS_COMPLETIONS_NOVA_PRO_V1,
      urnEnvKey: BEDROCK_NOVA_COMPLETIONS_MODEL_PRIMARY_KEY,
      purpose: LLMPurpose.COMPLETIONS,
      maxCompletionTokens: 5000,
      maxTotalTokens: 300000,
    },
    secondaryCompletion: {
      modelKey: AWS_COMPLETIONS_NOVA_LITE_V1,
      urnEnvKey: BEDROCK_NOVA_COMPLETIONS_MODEL_SECONDARY_KEY,
      purpose: LLMPurpose.COMPLETIONS,
      maxCompletionTokens: 5000,
      maxTotalTokens: 300000,
    },
  },
  errorPatterns: BEDROCK_COMMON_ERROR_PATTERNS,
  providerSpecificConfig: {
    requestTimeoutMillis: 9 * 60 * 1000,
    maxRetryAttempts: 3,
    minRetryDelayMillis: 30 * 1000,
    maxRetryDelayMillis: 240 * 1000,
  },
  factory: (_envConfig, modelsKeysSet, modelsMetadata, errorPatterns, providerSpecificConfig) => {
    const config: BedrockConfig = {
      providerSpecificConfig,
    };
    return new BedrockNovaLLM(modelsKeysSet, modelsMetadata, errorPatterns, config);
  },
};
