import { LLMProviderManifest } from "../../llm-provider.types";
import BedrockNovaLLM from "./bedrock-nova-llm";
import { LLMPurpose } from "../../../types/llm.types";
import { BEDROCK_COMMON_ERROR_PATTERNS } from "../common/bedrock-error-patterns";
import { z } from "zod";
import {
  BEDROCK_TITAN_EMBEDDINGS_MODEL_KEY,
  AWS_EMBEDDINGS_TITAN_V1,
  BEDROCK_NOVA_FAMILY,
} from "../common/bedrock-models.constants";
import { BedrockConfig } from "../common/base-bedrock-llm";
import {
  DEFAULT_BEDROCK_MAX_RETRY_ATTEMPTS,
  DEFAULT_BEDROCK_MAX_RETRY_DELAY_MILLIS,
  DEFAULT_BEDROCK_MIN_RETRY_DELAY_MILLIS,
  DEFAULT_BEDROCK_REQUEST_TIMEOUT_MILLIS,
} from "../common/bedrock-defaults.config";

// Environment variable name constants
const BEDROCK_NOVA_COMPLETIONS_MODEL_PRIMARY_KEY = "BEDROCK_NOVA_COMPLETIONS_MODEL_PRIMARY";
const BEDROCK_NOVA_COMPLETIONS_MODEL_SECONDARY_KEY = "BEDROCK_NOVA_COMPLETIONS_MODEL_SECONDARY";

// Re-export for backward compatibility
export const BEDROCK_NOVA = BEDROCK_NOVA_FAMILY;
const AWS_COMPLETIONS_NOVA_LITE_V1 = "AWS_COMPLETIONS_NOVA_LITE_V1";
const AWS_COMPLETIONS_NOVA_PRO_V1 = "AWS_COMPLETIONS_NOVA_PRO_V1";

export const bedrockNovaProviderManifest: LLMProviderManifest = {
  providerName: "Bedrock Nova",
  modelFamily: BEDROCK_NOVA_FAMILY,
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
    requestTimeoutMillis: DEFAULT_BEDROCK_REQUEST_TIMEOUT_MILLIS,
    maxRetryAttempts: DEFAULT_BEDROCK_MAX_RETRY_ATTEMPTS,
    minRetryDelayMillis: DEFAULT_BEDROCK_MIN_RETRY_DELAY_MILLIS,
    maxRetryDelayMillis: DEFAULT_BEDROCK_MAX_RETRY_DELAY_MILLIS,
  },
  factory: (
    _envConfig,
    modelsKeysSet,
    modelsMetadata,
    errorPatterns,
    providerSpecificConfig,
    jsonProcessor,
  ) => {
    const config: BedrockConfig = {
      providerSpecificConfig,
    };
    return new BedrockNovaLLM(modelsKeysSet, modelsMetadata, errorPatterns, config, jsonProcessor);
  },
};
