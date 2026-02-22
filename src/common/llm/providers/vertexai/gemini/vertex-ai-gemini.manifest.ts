import { z } from "zod";
import type { LLMProviderManifest } from "../../llm-provider.types";
import VertexAIGeminiLLM from "./vertex-ai-gemini-llm";
import { LLMPurpose } from "../../../types/llm-request.types";
import { llmConfig } from "../../../config/llm.config";
import { VERTEXAI_COMMON_ERROR_PATTERNS } from "./vertex-ai-error-patterns";
import { defaultVertexAIProviderConfig } from "./vertex-ai-gemini-defaults.config";
import { assertVertexAIGeminiConfig, type VertexAIGeminiConfig } from "./vertex-ai-gemini.types";
import { vertexAIBaseEnvSchema, extractVertexAIBaseConfig } from "../common/vertex-ai-env";

// Gemini-specific environment variable key for the embeddings endpoint location
const VERTEXAI_EMBEDDINGS_LOCATION_KEY = "VERTEXAI_EMBEDDINGS_LOCATION";

/**
 * Extracts and validates typed VertexAI Gemini configuration from raw environment parameters.
 * Uses the shared VertexAI base config extraction for projectId and completionsLocation,
 * then adds the Gemini-specific embeddingsLocation field.
 * Throws an LLMError if validation fails, ensuring fail-fast at provider instantiation.
 */
function extractVertexAIConfig(providerParams: Record<string, unknown>): VertexAIGeminiConfig {
  const baseConfig = extractVertexAIBaseConfig(providerParams);
  const rawConfig = {
    ...baseConfig,
    embeddingsLocation: providerParams[VERTEXAI_EMBEDDINGS_LOCATION_KEY],
  };
  return assertVertexAIGeminiConfig(rawConfig);
}

// Provider family constant - exported for use in provider registry
export const VERTEXAI_GEMINI_FAMILY = "VertexAIGemini";

// Environment variable keys for model URNs
const VERTEXAI_GEMINI_EMBEDDING_001_MODEL_URN_ID = "VERTEXAI_GEMINI_EMBEDDING_001_MODEL_URN";
const VERTEXAI_GEMINI_31_PRO_MODEL_URN_ID = "VERTEXAI_GEMINI_31_PRO_MODEL_URN";
const VERTEXAI_GEMINI_3_PRO_MODEL_URN_ID = "VERTEXAI_GEMINI_3_PRO_MODEL_URN";
const VERTEXAI_GEMINI_25_PRO_MODEL_URN_ID = "VERTEXAI_GEMINI_25_PRO_MODEL_URN";
const VERTEXAI_GEMINI_20_FLASH_MODEL_URN_ID = "VERTEXAI_GEMINI_20_FLASH_MODEL_URN";

export const vertexAIGeminiProviderManifest: LLMProviderManifest = {
  providerFamily: VERTEXAI_GEMINI_FAMILY,
  envSchema: vertexAIBaseEnvSchema.merge(
    z.object({
      [VERTEXAI_EMBEDDINGS_LOCATION_KEY]: z.string().min(1),
      [VERTEXAI_GEMINI_EMBEDDING_001_MODEL_URN_ID]: z.string().min(1),
      [VERTEXAI_GEMINI_31_PRO_MODEL_URN_ID]: z.string().min(1),
      [VERTEXAI_GEMINI_3_PRO_MODEL_URN_ID]: z.string().min(1),
      [VERTEXAI_GEMINI_25_PRO_MODEL_URN_ID]: z.string().min(1),
      [VERTEXAI_GEMINI_20_FLASH_MODEL_URN_ID]: z.string().min(1),
    }),
  ),
  models: {
    embeddings: [
      {
        modelKey: "vertexai-gemini-embedding-001",
        purpose: LLMPurpose.EMBEDDINGS,
        urnEnvKey: VERTEXAI_GEMINI_EMBEDDING_001_MODEL_URN_ID,
        dimensions: 3072, // Supports: 768, 1536, or 3072
        maxTotalTokens: 2048,
      },
    ],
    completions: [
      {
        modelKey: "vertexai-gemini-3.1-pro",
        purpose: LLMPurpose.COMPLETIONS,
        urnEnvKey: VERTEXAI_GEMINI_31_PRO_MODEL_URN_ID,
        maxCompletionTokens: 65_536,
        maxTotalTokens: 1_048_576,
      },
      {
        modelKey: "vertexai-gemini-3-pro",
        purpose: LLMPurpose.COMPLETIONS,
        urnEnvKey: VERTEXAI_GEMINI_3_PRO_MODEL_URN_ID,
        maxCompletionTokens: 65_535,
        maxTotalTokens: 1_048_576,
      },
      {
        modelKey: "vertexai-gemini-2.5-pro",
        purpose: LLMPurpose.COMPLETIONS,
        urnEnvKey: VERTEXAI_GEMINI_25_PRO_MODEL_URN_ID,
        maxCompletionTokens: 65_535,
        maxTotalTokens: 1_048_576,
      },
      {
        modelKey: "vertexai-gemini-2.0-flash",
        purpose: LLMPurpose.COMPLETIONS,
        urnEnvKey: VERTEXAI_GEMINI_20_FLASH_MODEL_URN_ID,
        maxCompletionTokens: 8192,
        maxTotalTokens: 1_048_576,
      },
    ],
  },
  errorPatterns: VERTEXAI_COMMON_ERROR_PATTERNS,
  providerSpecificConfig: {
    ...defaultVertexAIProviderConfig,
    temperature: llmConfig.DEFAULT_ZERO_TEMP,
    topP: llmConfig.DEFAULT_TOP_P_LOWEST,
    topK: llmConfig.DEFAULT_TOP_K_LOWEST,
  },
  extractConfig: extractVertexAIConfig,
  implementation: VertexAIGeminiLLM,
};
