import { z } from "zod";
import { LLMProviderManifest } from "../../llm-provider.types";
import BedrockClaudeLLM from "./bedrock-claude-llm";
import { LLMPurpose } from "../../../llm.types";
import { BEDROCK_COMMON_ERROR_PATTERNS } from "../bedrock-error-patterns";
import {
  BEDROCK_TITAN_EMBEDDINGS_MODEL_KEY,
  AWS_EMBEDDINGS_TITAN_V1,
} from "../bedrock-models.constants";
import { llmConfig } from "../../../llm.config";

// Environment variable name constants
const BEDROCK_CLAUDE_COMPLETIONS_MODEL_PRIMARY_KEY = "BEDROCK_CLAUDE_COMPLETIONS_MODEL_PRIMARY";
const BEDROCK_CLAUDE_COMPLETIONS_MODEL_SECONDARY_KEY = "BEDROCK_CLAUDE_COMPLETIONS_MODEL_SECONDARY";

// Exported constants
export const BEDROCK_CLAUDE = "BedrockClaude";
export const AWS_COMPLETIONS_CLAUDE_V37 = "AWS_COMPLETIONS_CLAUDE_V37";
export const AWS_COMPLETIONS_CLAUDE_V40 = "AWS_COMPLETIONS_CLAUDE_V40";

/**
 * AWS_COMPLETIONS_CLAUDE_V35: According to Anthropic site, the 'maxCompletionsTokens' should be
 * 8192 but Bedrock seems to cut this short to usually 4095 or 4096 but have seen 4090 reported for
 * some LLM responses, so using a few tokens buffer to come up with a limit of 4088
 *
 * AWS_COMPLETIONS_CLAUDE_V40: Bedrock seems to be limiting the max model response tokens to around
 * 39k when it should be 64k, and when its over 39k an "overloaded" response is always returned.
 */

export const bedrockClaudeProviderManifest: LLMProviderManifest = {
  providerName: "Bedrock Claude",
  modelFamily: BEDROCK_CLAUDE,
  envSchema: z.object({
    [BEDROCK_TITAN_EMBEDDINGS_MODEL_KEY]: z.string().min(1),
    [BEDROCK_CLAUDE_COMPLETIONS_MODEL_PRIMARY_KEY]: z.string().min(1),
    [BEDROCK_CLAUDE_COMPLETIONS_MODEL_SECONDARY_KEY]: z.string().min(1),
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
      modelKey: AWS_COMPLETIONS_CLAUDE_V40,
      urnEnvKey: BEDROCK_CLAUDE_COMPLETIONS_MODEL_PRIMARY_KEY,
      purpose: LLMPurpose.COMPLETIONS,
      maxCompletionTokens: 32768, // Should be 64k but errors if larger than around 39200
      maxTotalTokens: 200000,
    },
    secondaryCompletion: {
      modelKey: AWS_COMPLETIONS_CLAUDE_V37,
      urnEnvKey: BEDROCK_CLAUDE_COMPLETIONS_MODEL_SECONDARY_KEY,
      purpose: LLMPurpose.COMPLETIONS,
      maxCompletionTokens: 65536,
      maxTotalTokens: 200000,
    },
  },
  errorPatterns: BEDROCK_COMMON_ERROR_PATTERNS,
  providerSpecificConfig: {
    apiVersion: "bedrock-2023-05-31",
    temperature: llmConfig.DEFAULT_ZERO_TEMP,
    topP: llmConfig.DEFAULT_TOP_P_LOWEST,
    topK: llmConfig.DEFAULT_TOP_K_LOWEST,
    requestTimeoutMillis: 8 * 60 * 1000, // 8 minutes - Bedrock can be slower, especially for large models
    maxRetryAttempts: 5, // More retries for Bedrock due to capacity limits
    minRetryDelayMillis: 30 * 1000, // 30 seconds - longer delay for AWS rate limits
    maxRetryAdditionalDelayMillis: 45 * 1000, // 45 seconds additional random delay
  },
  factory: (_envConfig, modelsKeysSet, modelsMetadata, errorPatterns, providerSpecificConfig) => {
    return new BedrockClaudeLLM(
      modelsKeysSet,
      modelsMetadata,
      errorPatterns,
      providerSpecificConfig,
    );
  },
};
