import { z } from "zod";
import { LLMProviderManifest } from "../../llm-provider.types";
import BedrockClaudeLLM from "./bedrock-claude-llm";
import { LLMPurpose } from "../../../types/llm.types";
import { BEDROCK_COMMON_ERROR_PATTERNS } from "../common/bedrock-error-patterns";
import {
  BEDROCK_TITAN_EMBEDDINGS_MODEL_KEY,
  AWS_EMBEDDINGS_TITAN_V1,
  BEDROCK_CLAUDE_FAMILY,
} from "../common/bedrock-models.constants";
import { llmConfig } from "../../../llm.config";
import { BedrockConfig } from "../common/base-bedrock-llm";
import { DEFAULT_BEDROCK_REQUEST_TIMEOUT_MILLIS } from "../common/bedrock-defaults.config";

// Environment variable name constants
const BEDROCK_CLAUDE_COMPLETIONS_MODEL_PRIMARY_KEY = "BEDROCK_CLAUDE_COMPLETIONS_MODEL_PRIMARY";
const BEDROCK_CLAUDE_COMPLETIONS_MODEL_SECONDARY_KEY = "BEDROCK_CLAUDE_COMPLETIONS_MODEL_SECONDARY";

// Re-export for backward compatibility
export const BEDROCK_CLAUDE = BEDROCK_CLAUDE_FAMILY;
const AWS_COMPLETIONS_CLAUDE_V37 = "AWS_COMPLETIONS_CLAUDE_V37";
export const AWS_COMPLETIONS_CLAUDE_V40 = "AWS_COMPLETIONS_CLAUDE_V40";

/**
 * AWS_COMPLETIONS_CLAUDE_V40: Bedrock seems to be limiting the max model response tokens to around
 * 39k when it should be 64k, and when its over 39k an "overloaded" response is always returned.
 */

export const bedrockClaudeProviderManifest: LLMProviderManifest = {
  providerName: "Bedrock Claude",
  modelFamily: BEDROCK_CLAUDE_FAMILY,
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
      maxCompletionTokens: 64000,
      maxTotalTokens: 1_000_000,
      // OLD values for pre-1M-token context beta
      //maxCompletionTokens: 32768, // Should be 64k but errors if larger than around 39200 - varies, so me be more of a timeout issue or Bedrock's 20 MB payload limit
      //maxTotalTokens: 200000,
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
    requestTimeoutMillis: DEFAULT_BEDROCK_REQUEST_TIMEOUT_MILLIS,
    maxRetryAttempts: 6,
    minRetryDelayMillis: 40 * 1000,
    maxRetryDelayMillis: 360 * 1000,
    // Anthropic beta flags for specific features (e.g., extended context window)
    anthropicBetaFlags: ["context-1m-2025-08-07"],
  },
  factory: (_envConfig, modelsKeysSet, modelsMetadata, errorPatterns, providerSpecificConfig) => {
    const config: BedrockConfig = {
      providerSpecificConfig,
    };
    return new BedrockClaudeLLM(modelsKeysSet, modelsMetadata, errorPatterns, config);
  },
};
