import { z } from "zod";
import type { LLMProviderManifest } from "../../llm-provider.types";
import VertexAIClaudeLLM from "./vertex-ai-claude-llm";
import { LLMPurpose } from "../../../types/llm-request.types";
import { llmConfig } from "../../../config/llm.config";
import { VERTEXAI_CLAUDE_ERROR_PATTERNS } from "./vertex-ai-claude-error-patterns";
import { defaultVertexAIClaudeProviderConfig } from "./vertex-ai-claude-defaults.config";
import { assertVertexAIClaudeConfig, type VertexAIClaudeConfig } from "./vertex-ai-claude.types";

// Environment variable name constants (shared with VertexAI Gemini provider)
const VERTEXAI_PROJECTID_KEY = "VERTEXAI_PROJECTID";
const VERTEXAI_COMPLETIONS_LOCATION_KEY = "VERTEXAI_COMPLETIONS_LOCATION";

/**
 * Extracts and validates typed VertexAI Claude configuration from raw environment parameters.
 * Uses the common VertexAI environment variables shared with the Gemini provider.
 * Throws an LLMError if validation fails, ensuring fail-fast at provider instantiation.
 */
function extractVertexAIClaudeConfig(providerParams: Record<string, unknown>): VertexAIClaudeConfig {
  const rawConfig = {
    projectId: providerParams[VERTEXAI_PROJECTID_KEY],
    location: providerParams[VERTEXAI_COMPLETIONS_LOCATION_KEY],
  };
  return assertVertexAIClaudeConfig(rawConfig);
}

// Provider family constant - exported for use in provider registry
export const VERTEXAI_CLAUDE_FAMILY = "VertexAIClaude";

// Environment variable keys for model URNs
const VERTEXAI_CLAUDE_OPUS_45_MODEL_URN_ID = "VERTEXAI_CLAUDE_OPUS_45_MODEL_URN";
const VERTEXAI_CLAUDE_SONNET_45_MODEL_URN_ID = "VERTEXAI_CLAUDE_SONNET_45_MODEL_URN";

export const vertexAIClaudeProviderManifest: LLMProviderManifest = {
  providerFamily: VERTEXAI_CLAUDE_FAMILY,
  envSchema: z.object({
    // Common VertexAI vars (shared with Gemini provider)
    [VERTEXAI_PROJECTID_KEY]: z.string().min(1),
    [VERTEXAI_COMPLETIONS_LOCATION_KEY]: z.string().min(1),
    // Model URNs
    [VERTEXAI_CLAUDE_OPUS_45_MODEL_URN_ID]: z.string().min(1),
    [VERTEXAI_CLAUDE_SONNET_45_MODEL_URN_ID]: z.string().min(1),
  }),
  models: {
    embeddings: [], // Claude does not support embeddings
    completions: [
      {
        modelKey: "vertexai-claude-opus-4.5",
        purpose: LLMPurpose.COMPLETIONS,
        urnEnvKey: VERTEXAI_CLAUDE_OPUS_45_MODEL_URN_ID,
        maxCompletionTokens: 64000,
        maxTotalTokens: 200_000,
      },
      {
        modelKey: "vertexai-claude-sonnet-4.5",
        purpose: LLMPurpose.COMPLETIONS,
        urnEnvKey: VERTEXAI_CLAUDE_SONNET_45_MODEL_URN_ID,
        maxCompletionTokens: 64000,
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
  },
  extractConfig: extractVertexAIClaudeConfig,
  implementation: VertexAIClaudeLLM,
};
