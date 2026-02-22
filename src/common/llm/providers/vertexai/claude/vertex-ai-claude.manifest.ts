import { z } from "zod";
import type { LLMProviderManifest } from "../../llm-provider.types";
import VertexAIClaudeLLM from "./vertex-ai-claude-llm";
import { LLMPurpose } from "../../../types/llm-request.types";
import { llmConfig } from "../../../config/llm.config";
import { VERTEXAI_CLAUDE_ERROR_PATTERNS } from "./vertex-ai-claude-error-patterns";
import { defaultVertexAIClaudeProviderConfig } from "./vertex-ai-claude-defaults.config";
import { assertVertexAIClaudeConfig, type VertexAIClaudeConfig } from "./vertex-ai-claude.types";
import { vertexAIBaseEnvSchema, extractVertexAIBaseConfig } from "../common/vertex-ai-env";

/**
 * Extracts and validates typed VertexAI Claude configuration from raw environment parameters.
 * Uses the shared VertexAI base config extraction, then maps completionsLocation to the
 * Claude-specific "location" field. Throws an LLMError if validation fails.
 */
function extractVertexAIClaudeConfig(
  providerParams: Record<string, unknown>,
): VertexAIClaudeConfig {
  const baseConfig = extractVertexAIBaseConfig(providerParams);
  const rawConfig = {
    projectId: baseConfig.projectId,
    location: baseConfig.completionsLocation,
  };
  return assertVertexAIClaudeConfig(rawConfig);
}

// Provider family constant - exported for use in provider registry
export const VERTEXAI_CLAUDE_FAMILY = "VertexAIClaude";

// Environment variable keys for model URNs
const VERTEXAI_CLAUDE_OPUS_46_MODEL_URN_ID = "VERTEXAI_CLAUDE_OPUS_46_MODEL_URN";
const VERTEXAI_CLAUDE_SONNET_46_MODEL_URN_ID = "VERTEXAI_CLAUDE_SONNET_46_MODEL_URN";
const VERTEXAI_CLAUDE_OPUS_45_MODEL_URN_ID = "VERTEXAI_CLAUDE_OPUS_45_MODEL_URN";
const VERTEXAI_CLAUDE_SONNET_45_MODEL_URN_ID = "VERTEXAI_CLAUDE_SONNET_45_MODEL_URN";

export const vertexAIClaudeProviderManifest: LLMProviderManifest = {
  providerFamily: VERTEXAI_CLAUDE_FAMILY,
  envSchema: vertexAIBaseEnvSchema.merge(
    z.object({
      [VERTEXAI_CLAUDE_OPUS_46_MODEL_URN_ID]: z.string().min(1),
      [VERTEXAI_CLAUDE_SONNET_46_MODEL_URN_ID]: z.string().min(1),
      [VERTEXAI_CLAUDE_OPUS_45_MODEL_URN_ID]: z.string().min(1),
      [VERTEXAI_CLAUDE_SONNET_45_MODEL_URN_ID]: z.string().min(1),
    }),
  ),
  models: {
    embeddings: [], // Claude does not support embeddings
    completions: [
      {
        modelKey: "vertexai-claude-opus-4.6",
        purpose: LLMPurpose.COMPLETIONS,
        urnEnvKey: VERTEXAI_CLAUDE_OPUS_46_MODEL_URN_ID,
        maxCompletionTokens: 128_000, // Opus 4.6 supports 128K output
        maxTotalTokens: 1_000_000, // 1M with beta flag
      },
      {
        modelKey: "vertexai-claude-sonnet-4.6",
        purpose: LLMPurpose.COMPLETIONS,
        urnEnvKey: VERTEXAI_CLAUDE_SONNET_46_MODEL_URN_ID,
        maxCompletionTokens: 64_000,
        maxTotalTokens: 1_000_000, // 1M with beta flag
      },
      {
        modelKey: "vertexai-claude-opus-4.5",
        purpose: LLMPurpose.COMPLETIONS,
        urnEnvKey: VERTEXAI_CLAUDE_OPUS_45_MODEL_URN_ID,
        maxCompletionTokens: 64_000,
        maxTotalTokens: 200_000,
      },
      {
        modelKey: "vertexai-claude-sonnet-4.5",
        purpose: LLMPurpose.COMPLETIONS,
        urnEnvKey: VERTEXAI_CLAUDE_SONNET_45_MODEL_URN_ID,
        maxCompletionTokens: 64_000,
        maxTotalTokens: 200_000,
      },
    ],
  },
  errorPatterns: VERTEXAI_CLAUDE_ERROR_PATTERNS,
  providerSpecificConfig: {
    ...defaultVertexAIClaudeProviderConfig,
    temperature: llmConfig.DEFAULT_ZERO_TEMP,
    topP: llmConfig.DEFAULT_TOP_P_LOWEST,
    topK: llmConfig.DEFAULT_TOP_K_LOWEST,
    anthropicBetaFlags: ["context-1m-2025-08-07"] as const,
  },
  extractConfig: extractVertexAIClaudeConfig,
  implementation: VertexAIClaudeLLM,
};
