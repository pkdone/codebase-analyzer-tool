import { z } from "zod";
import { LLMProviderManifest } from "../../llm-provider.types";
import VertexAIGeminiLLM, { VertexAIConfig } from "./vertex-ai-gemini-llm";
import { LLMPurpose } from "../../../types/llm.types";
import { llmConfig } from "../../../llm.config";
import { VERTEXAI_COMMON_ERROR_PATTERNS } from "./vertex-ai-error-patterns";

// Environment variable name constants
const VERTEXAI_PROJECTID_KEY = "VERTEXAI_PROJECTID";
const VERTEXAI_LOCATION_KEY = "VERTEXAI_LOCATION";
const VERTEXAI_TEXT_EMBEDDINGS_MODEL_KEY = "VERTEXAI_TEXT_EMBEDDINGS_MODEL";
const VERTEXAI_GEMINI_COMPLETIONS_MODEL_PRIMARY_KEY = "VERTEXAI_GEMINI_COMPLETIONS_MODEL_PRIMARY";
const VERTEXAI_GEMINI_COMPLETIONS_MODEL_SECONDARY_KEY =
  "VERTEXAI_GEMINI_COMPLETIONS_MODEL_SECONDARY";

// Exported constants
export const VERTEX_GEMINI = "VertexAIGemini";
const GCP_EMBEDDINGS_GEMINI_001 = "GCP_EMBEDDINGS_GEMINI_001";
const GCP_COMPLETIONS_GEMINI_PRO25 = "GCP_COMPLETIONS_GEMINI_PRO25";
const GCP_COMPLETIONS_GEMINI_FLASH20 = "GCP_COMPLETIONS_GEMINI_FLASH20";

export const vertexAIGeminiProviderManifest: LLMProviderManifest = {
  providerName: "VertexAI Gemini",
  modelFamily: VERTEX_GEMINI,
  envSchema: z.object({
    [VERTEXAI_PROJECTID_KEY]: z.string().min(1),
    [VERTEXAI_LOCATION_KEY]: z.string().min(1),
    [VERTEXAI_TEXT_EMBEDDINGS_MODEL_KEY]: z.string().min(1),
    [VERTEXAI_GEMINI_COMPLETIONS_MODEL_PRIMARY_KEY]: z.string().min(1),
    [VERTEXAI_GEMINI_COMPLETIONS_MODEL_SECONDARY_KEY]: z.string().min(1),
  }),
  models: {
    embeddings: {
      modelKey: GCP_EMBEDDINGS_GEMINI_001,
      urnEnvKey: VERTEXAI_TEXT_EMBEDDINGS_MODEL_KEY,
      purpose: LLMPurpose.EMBEDDINGS,
      dimensions: 3072, // Either: 768, 1536 or 3072
      maxTotalTokens: 2048,
    },
    primaryCompletion: {
      modelKey: GCP_COMPLETIONS_GEMINI_PRO25,
      urnEnvKey: VERTEXAI_GEMINI_COMPLETIONS_MODEL_PRIMARY_KEY,
      purpose: LLMPurpose.COMPLETIONS,
      maxCompletionTokens: 65535,
      maxTotalTokens: 1048576,
    },
    secondaryCompletion: {
      modelKey: GCP_COMPLETIONS_GEMINI_FLASH20,
      urnEnvKey: VERTEXAI_GEMINI_COMPLETIONS_MODEL_SECONDARY_KEY,
      purpose: LLMPurpose.COMPLETIONS,
      maxCompletionTokens: 8192,
      maxTotalTokens: 1048576,
    },
  },
  errorPatterns: VERTEXAI_COMMON_ERROR_PATTERNS,
  providerSpecificConfig: {
    temperature: llmConfig.DEFAULT_ZERO_TEMP,
    topP: llmConfig.DEFAULT_TOP_P_LOWEST,
    topK: llmConfig.DEFAULT_TOP_K_LOWEST,
    requestTimeoutMillis: 6 * 60 * 1000, // Shorter timeout for GCP
    maxRetryAttempts: 3, // Standard retries for Vertex AI
    minRetryDelayMillis: 40 * 1000, // Fair amount delay for GCP
    maxRetryAdditionalDelayMillis: 100 * 1000, // Fair amount ofadditional random delay
  },
  factory: (envConfig, modelsKeysSet, modelsMetadata, errorPatterns, providerSpecificConfig) => {
    const config: VertexAIConfig = {
      // envConfig is already the fully typed object
      project: envConfig[VERTEXAI_PROJECTID_KEY] as string,
      location: envConfig[VERTEXAI_LOCATION_KEY] as string,
      providerSpecificConfig,
    };
    return new VertexAIGeminiLLM(modelsKeysSet, modelsMetadata, errorPatterns, config);
  },
};
