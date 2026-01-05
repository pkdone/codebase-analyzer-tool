import { z } from "zod";
import { LLMProviderManifest } from "../../llm-provider.types";
import VertexAIGeminiLLM from "./vertex-ai-gemini-llm";
import { LLMPurpose } from "../../../types/llm.types";
import { llmConfig } from "../../../config/llm.config";
import { VERTEXAI_COMMON_ERROR_PATTERNS } from "./vertex-ai-error-patterns";

// Environment variable name constants
const VERTEXAI_PROJECTID_KEY = "VERTEXAI_PROJECTID";
const VERTEXAI_EMBEDDINGS_LOCATION_KEY = "VERTEXAI_EMBEDDINGS_LOCATION";
const VERTEXAI_COMPLETIONS_LOCATION_KEY = "VERTEXAI_COMPLETIONS_LOCATION";
const VERTEXAI_TEXT_EMBEDDINGS_MODEL_KEY = "VERTEXAI_TEXT_EMBEDDINGS_MODEL";
const VERTEXAI_GEMINI_COMPLETIONS_MODEL_PRIMARY_KEY = "VERTEXAI_GEMINI_COMPLETIONS_MODEL_PRIMARY";
const VERTEXAI_GEMINI_COMPLETIONS_MODEL_SECONDARY_KEY =
  "VERTEXAI_GEMINI_COMPLETIONS_MODEL_SECONDARY";

// Model constants
export const VERTEX_GEMINI = "VertexAIGemini";
const GCP_EMBEDDINGS_GEMINI_001 = "GCP_EMBEDDINGS_GEMINI_001";
const GCP_COMPLETIONS_GEMINI_PRO30 = "GCP_COMPLETIONS_GEMINI_PRO30";
const GCP_COMPLETIONS_GEMINI_PRO25 = "GCP_COMPLETIONS_GEMINI_PRO25";

export const vertexAIGeminiProviderManifest: LLMProviderManifest = {
  providerName: "VertexAI Gemini",
  modelFamily: VERTEX_GEMINI,
  envSchema: z.object({
    [VERTEXAI_PROJECTID_KEY]: z.string().min(1),
    [VERTEXAI_EMBEDDINGS_LOCATION_KEY]: z.string().min(1),
    [VERTEXAI_COMPLETIONS_LOCATION_KEY]: z.string().min(1),
    [VERTEXAI_TEXT_EMBEDDINGS_MODEL_KEY]: z.string().min(1),
    [VERTEXAI_GEMINI_COMPLETIONS_MODEL_PRIMARY_KEY]: z.string().min(1),
    [VERTEXAI_GEMINI_COMPLETIONS_MODEL_SECONDARY_KEY]: z.string().min(1),
  }),
  models: {
    embeddings: {
      modelKey: GCP_EMBEDDINGS_GEMINI_001,
      name: "Gemini Embeddings",
      urnEnvKey: VERTEXAI_TEXT_EMBEDDINGS_MODEL_KEY,
      purpose: LLMPurpose.EMBEDDINGS,
      dimensions: 3072, // Either: 768, 1536 or 3072
      maxTotalTokens: 2048,
    },
    primaryCompletion: {
      modelKey: GCP_COMPLETIONS_GEMINI_PRO30,
      name: "Gemini Pro 3.0",
      urnEnvKey: VERTEXAI_GEMINI_COMPLETIONS_MODEL_PRIMARY_KEY,
      purpose: LLMPurpose.COMPLETIONS,
      maxCompletionTokens: 65535,
      maxTotalTokens: 1048576,
    },
    secondaryCompletion: {
      modelKey: GCP_COMPLETIONS_GEMINI_PRO25,
      name: "Gemini Pro 2.5",
      urnEnvKey: VERTEXAI_GEMINI_COMPLETIONS_MODEL_SECONDARY_KEY,
      purpose: LLMPurpose.COMPLETIONS,
      maxCompletionTokens: 65535,
      maxTotalTokens: 1048576,
    },
  },
  errorPatterns: VERTEXAI_COMMON_ERROR_PATTERNS,
  providerSpecificConfig: {
    temperature: llmConfig.DEFAULT_ZERO_TEMP,
    topP: llmConfig.DEFAULT_TOP_P_LOWEST,
    topK: llmConfig.DEFAULT_TOP_K_LOWEST,
    requestTimeoutMillis: 10 * 60 * 1000,
    maxRetryAttempts: 3,
    minRetryDelayMillis: 30 * 1000,
    maxRetryDelayMillis: 150 * 1000,
  },
  implementation: VertexAIGeminiLLM,
};
