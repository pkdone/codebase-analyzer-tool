import { LLMProviderManifest } from "../../llm-provider.types";
import BedrockLlamaLLM from "./bedrock-llama-llm";
import { LLMPurpose } from "../../../types/llm.types";
import { BEDROCK_COMMON_ERROR_PATTERNS } from "../common/bedrock-error-patterns";
import { z } from "zod";
import {
  BEDROCK_TITAN_EMBEDDINGS_MODEL_KEY,
  AWS_EMBEDDINGS_TITAN_V1,
  BEDROCK_LLAMA_FAMILY,
} from "../common/bedrock-models.constants";
import {
  DEFAULT_BEDROCK_REQUEST_TIMEOUT_MILLIS,
  DEFAULT_BEDROCK_MAX_RETRY_ATTEMPTS,
  DEFAULT_BEDROCK_MIN_RETRY_DELAY_MILLIS,
  DEFAULT_BEDROCK_MAX_RETRY_DELAY_MILLIS,
} from "../common/bedrock-defaults.config";

/**
 * Zod schema for Bedrock Llama provider-specific configuration.
 * Validates that the providerSpecificConfig contains all required fields,
 * including the maxGenLenCap property needed for the CAP_MAX_GEN_LEN feature.
 */
export const BedrockLlamaProviderConfigSchema = z.object({
  requestTimeoutMillis: z.number().int().positive(),
  maxRetryAttempts: z.number().int().nonnegative(),
  minRetryDelayMillis: z.number().int().nonnegative(),
  maxRetryDelayMillis: z.number().int().nonnegative(),
  maxGenLenCap: z.number().int().positive(),
});

// Environment variable name constants
const BEDROCK_LLAMA_COMPLETIONS_MODEL_PRIMARY_KEY = "BEDROCK_LLAMA_COMPLETIONS_MODEL_PRIMARY";
const BEDROCK_LLAMA_COMPLETIONS_MODEL_SECONDARY_KEY = "BEDROCK_LLAMA_COMPLETIONS_MODEL_SECONDARY";

// Model constants
export const AWS_COMPLETIONS_LLAMA_V31_405B_INSTRUCT = "AWS_COMPLETIONS_LLAMA_V31_405B_INSTRUCT";
const AWS_COMPLETIONS_LLAMA_V32_90B_INSTRUCT = "AWS_COMPLETIONS_LLAMA_V32_90B_INSTRUCT";
const AWS_COMPLETIONS_LLAMA_V33_70B_INSTRUCT = "AWS_COMPLETIONS_LLAMA_V33_70B_INSTRUCT";

/**
 * AWS_COMPLETIONS_LLAMA_V31_405B_INSTRUCT & AWS_COMPLETIONS_LLAMA_V33_70B_INSTRUCT: Not clear if
 * 'maxCompletionsTokens' is actually less than listed value of 8192
 */

export const bedrockLlamaProviderManifest: LLMProviderManifest = {
  providerName: "Bedrock Llama",
  modelFamily: BEDROCK_LLAMA_FAMILY,
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
  // Feature flags documenting special behaviors; CAP_MAX_GEN_LEN instructs implementation to cap max_gen_len
  features: ["CAP_MAX_GEN_LEN"] as const,
  errorPatterns: BEDROCK_COMMON_ERROR_PATTERNS,
  providerSpecificConfig: {
    requestTimeoutMillis: DEFAULT_BEDROCK_REQUEST_TIMEOUT_MILLIS,
    maxRetryAttempts: DEFAULT_BEDROCK_MAX_RETRY_ATTEMPTS,
    minRetryDelayMillis: DEFAULT_BEDROCK_MIN_RETRY_DELAY_MILLIS,
    maxRetryDelayMillis: DEFAULT_BEDROCK_MAX_RETRY_DELAY_MILLIS,
    maxGenLenCap: 2048,
  },
  implementation: BedrockLlamaLLM,
};
