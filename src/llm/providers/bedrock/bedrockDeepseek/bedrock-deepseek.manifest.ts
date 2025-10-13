import { LLMProviderManifest } from "../../llm-provider.types";
import BedrockDeepseekLLM from "./bedrock-deepseek-llm";
import { LLMPurpose } from "../../../types/llm.types";
import { BEDROCK_COMMON_ERROR_PATTERNS } from "../common/bedrock-error-patterns";
import { z } from "zod";
import {
  BEDROCK_TITAN_EMBEDDINGS_MODEL_KEY,
  AWS_EMBEDDINGS_TITAN_V1,
  BEDROCK_DEEPSEEK_FAMILY,
} from "../common/bedrock-models.constants";
import { BedrockConfig } from "../common/base-bedrock-llm";
import {
  DEFAULT_BEDROCK_MAX_RETRY_ATTEMPTS,
  DEFAULT_BEDROCK_MAX_RETRY_DELAY_MILLIS,
  DEFAULT_BEDROCK_MIN_RETRY_DELAY_MILLIS,
  DEFAULT_BEDROCK_REQUEST_TIMEOUT_MILLIS,
} from "../common/bedrock-defaults.config";

// Environment variable name constants
const BEDROCK_DEEPSEEK_COMPLETIONS_MODEL_PRIMARY_KEY = "BEDROCK_DEEPSEEK_COMPLETIONS_MODEL_PRIMARY";

// Model constants
const AWS_COMPLETIONS_DEEPSEEK_R1 = "AWS_COMPLETIONS_DEEPSEEK_R1";

export const bedrockDeepseekProviderManifest: LLMProviderManifest = {
  providerName: "Bedrock Deepseek",
  modelFamily: BEDROCK_DEEPSEEK_FAMILY,
  envSchema: z.object({
    [BEDROCK_TITAN_EMBEDDINGS_MODEL_KEY]: z.string().min(1),
    [BEDROCK_DEEPSEEK_COMPLETIONS_MODEL_PRIMARY_KEY]: z.string().min(1),
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
      modelKey: AWS_COMPLETIONS_DEEPSEEK_R1,
      urnEnvKey: BEDROCK_DEEPSEEK_COMPLETIONS_MODEL_PRIMARY_KEY,
      purpose: LLMPurpose.COMPLETIONS,
      maxCompletionTokens: 16384,
      maxTotalTokens: 128000,
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
    return new BedrockDeepseekLLM(
      modelsKeysSet,
      modelsMetadata,
      errorPatterns,
      config,
      jsonProcessor,
    );
  },
};
