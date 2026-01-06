import { z } from "zod";
import BedrockClaudeLLM from "./bedrock-claude-llm";
import { LLMPurpose } from "../../../types/llm.types";
import { createTitanEmbeddingsConfig } from "../common/bedrock-models.constants";
import { llmConfig } from "../../../config/llm.config";
import { createBedrockManifest } from "../common/bedrock-manifest-factory";

// Model family constant - exported for use in provider registry
export const BEDROCK_CLAUDE_FAMILY = "BedrockClaude";

// Environment variable name constants
const BEDROCK_CLAUDE_COMPLETIONS_MODEL_PRIMARY_KEY = "BEDROCK_CLAUDE_COMPLETIONS_MODEL_PRIMARY";
const BEDROCK_CLAUDE_COMPLETIONS_MODEL_SECONDARY_KEY = "BEDROCK_CLAUDE_COMPLETIONS_MODEL_SECONDARY";

// Model constants
export const AWS_COMPLETIONS_CLAUDE_OPUS_V45 = "AWS_COMPLETIONS_CLAUDE_OPUS_V45";
export const AWS_COMPLETIONS_CLAUDE_SONNET_V45 = "AWS_COMPLETIONS_CLAUDE_SONNET_V45";

export const bedrockClaudeProviderManifest = createBedrockManifest(
  "Bedrock Claude",
  BEDROCK_CLAUDE_FAMILY,
  {
    embeddings: createTitanEmbeddingsConfig(),
    primaryCompletion: {
      modelKey: AWS_COMPLETIONS_CLAUDE_OPUS_V45,
      name: "Claude Opus 4.5",
      urnEnvKey: BEDROCK_CLAUDE_COMPLETIONS_MODEL_PRIMARY_KEY,
      purpose: LLMPurpose.COMPLETIONS,
      maxCompletionTokens: 64000,
      maxTotalTokens: 200_000,
    },
    secondaryCompletion: {
      modelKey: AWS_COMPLETIONS_CLAUDE_SONNET_V45,
      name: "Claude Sonnet 4.5",
      urnEnvKey: BEDROCK_CLAUDE_COMPLETIONS_MODEL_SECONDARY_KEY,
      purpose: LLMPurpose.COMPLETIONS,
      maxCompletionTokens: 64000,
      maxTotalTokens: 1_000_000,
    },
  },
  {
    [BEDROCK_CLAUDE_COMPLETIONS_MODEL_PRIMARY_KEY]: z.string().min(1),
    [BEDROCK_CLAUDE_COMPLETIONS_MODEL_SECONDARY_KEY]: z.string().min(1),
  },
  {
    apiVersion: "bedrock-2023-05-31",
    temperature: llmConfig.DEFAULT_ZERO_TEMP,
    topP: llmConfig.DEFAULT_TOP_P_LOWEST,
    topK: llmConfig.DEFAULT_TOP_K_LOWEST,
    maxRetryAttempts: 6,
    minRetryDelayMillis: 40 * 1000,
    maxRetryDelayMillis: 360 * 1000,
    requestTimeoutMillis: 60 * 60 * 1000, // For Claude OPUS longer inference times
    // Anthropic beta flags for specific features (e.g., extended context window)
    anthropicBetaFlags: ["context-1m-2025-08-07"] as const,
  },
  BedrockClaudeLLM,
);
