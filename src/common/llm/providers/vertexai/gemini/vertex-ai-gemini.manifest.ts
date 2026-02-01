import { z } from "zod";
import type { LLMProviderManifest } from "../../llm-provider.types";
import VertexAIGeminiLLM from "./vertex-ai-gemini-llm";
import { LLMPurpose } from "../../../types/llm-request.types";
import { llmConfig } from "../../../config/llm.config";
import { VERTEXAI_COMMON_ERROR_PATTERNS } from "./vertex-ai-error-patterns";
import { defaultVertexAIProviderConfig } from "./vertex-ai-gemini-defaults.config";
import { assertVertexAIGeminiConfig, type VertexAIGeminiConfig } from "./vertex-ai-gemini.types";

// Environment variable name constants
const VERTEXAI_PROJECTID_KEY = "VERTEXAI_PROJECTID";
const VERTEXAI_EMBEDDINGS_LOCATION_KEY = "VERTEXAI_EMBEDDINGS_LOCATION";
const VERTEXAI_COMPLETIONS_LOCATION_KEY = "VERTEXAI_COMPLETIONS_LOCATION";

/**
 * Extracts and validates typed VertexAI configuration from raw environment parameters.
 * Throws an LLMError if validation fails, ensuring fail-fast at provider instantiation.
 * This decouples the provider implementation from specific env var names.
 */
function extractVertexAIConfig(providerParams: Record<string, unknown>): VertexAIGeminiConfig {
  const rawConfig = {
    projectId: providerParams[VERTEXAI_PROJECTID_KEY],
    embeddingsLocation: providerParams[VERTEXAI_EMBEDDINGS_LOCATION_KEY],
    completionsLocation: providerParams[VERTEXAI_COMPLETIONS_LOCATION_KEY],
  };
  return assertVertexAIGeminiConfig(rawConfig);
}

// Provider family constant - exported for use in provider registry
export const VERTEXAI_GEMINI_FAMILY = "VertexAIGemini";

// Environment variable keys for model URNs
export const VERTEXAI_GEMINI_EMBEDDING_001_MODEL_URN_ID = "VERTEXAI_GEMINI_EMBEDDING_001_MODEL_URN";
export const VERTEXAI_GEMINI_3_PRO_MODEL_URN_ID = "VERTEXAI_GEMINI_3_PRO_MODEL_URN";
export const VERTEXAI_GEMINI_25_PRO_MODEL_URN_ID = "VERTEXAI_GEMINI_25_PRO_MODEL_URN";
export const VERTEXAI_GEMINI_20_FLASH_MODEL_URN_ID = "VERTEXAI_GEMINI_20_FLASH_MODEL_URN";

export const vertexAIGeminiProviderManifest: LLMProviderManifest = {
  providerFamily: VERTEXAI_GEMINI_FAMILY,
  envSchema: z.object({
    [VERTEXAI_PROJECTID_KEY]: z.string().min(1),
    [VERTEXAI_EMBEDDINGS_LOCATION_KEY]: z.string().min(1),
    [VERTEXAI_COMPLETIONS_LOCATION_KEY]: z.string().min(1),
    [VERTEXAI_GEMINI_EMBEDDING_001_MODEL_URN_ID]: z.string().min(1),
    [VERTEXAI_GEMINI_3_PRO_MODEL_URN_ID]: z.string().min(1),
    [VERTEXAI_GEMINI_25_PRO_MODEL_URN_ID]: z.string().min(1),
    [VERTEXAI_GEMINI_20_FLASH_MODEL_URN_ID]: z.string().min(1),
  }),
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
        modelKey: "vertexai-gemini-3-pro",
        purpose: LLMPurpose.COMPLETIONS,
        urnEnvKey: VERTEXAI_GEMINI_3_PRO_MODEL_URN_ID,
        maxCompletionTokens: 65535,
        maxTotalTokens: 1048576,
      },
      {
        modelKey: "vertexai-gemini-2.5-pro",
        purpose: LLMPurpose.COMPLETIONS,
        urnEnvKey: VERTEXAI_GEMINI_25_PRO_MODEL_URN_ID,
        maxCompletionTokens: 65535,
        maxTotalTokens: 1048576,
      },
      {
        modelKey: "vertexai-gemini-2.0-flash",
        purpose: LLMPurpose.COMPLETIONS,
        urnEnvKey: VERTEXAI_GEMINI_20_FLASH_MODEL_URN_ID,
        maxCompletionTokens: 8192,
        maxTotalTokens: 1048576,
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
