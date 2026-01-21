import { z } from "zod";
import type { LLMProviderManifest } from "../../llm-provider.types";
import OpenAILLM from "./openai-llm";
import { LLMPurpose } from "../../../types/llm-request.types";
import type { LLMModelFeature } from "../../../types/llm-model.types";
import { OPENAI_COMMON_ERROR_PATTERNS } from "../common/openai-error-patterns";
import { defaultOpenAIProviderConfig } from "../common/openai-defaults.config";

// Environment variable name constants
const OPENAI_LLM_API_KEY_KEY = "OPENAI_LLM_API_KEY";

// Model family constant - exported for use in provider registry
export const OPENAI = "OpenAI";

// Environment variable keys for model URNs
export const OPENAI_EMBEDDING_3_SMALL_MODEL_URN_ID = "OPENAI_EMBEDDING_3_SMALL_MODEL_URN";
export const OPENAI_GPT5_MODEL_URN_ID = "OPENAI_GPT5_MODEL_URN";
export const OPENAI_GPT4O_MODEL_URN_ID = "OPENAI_GPT4O_MODEL_URN";

export const openAIProviderManifest: LLMProviderManifest = {
  providerName: "OpenAI GPT",
  modelFamily: OPENAI,
  envSchema: z.object({
    [OPENAI_LLM_API_KEY_KEY]: z.string().min(1),
    [OPENAI_EMBEDDING_3_SMALL_MODEL_URN_ID]: z.string().min(1),
    [OPENAI_GPT5_MODEL_URN_ID]: z.string().min(1),
    [OPENAI_GPT4O_MODEL_URN_ID]: z.string().min(1),
  }),
  models: {
    embeddings: [
      {
        modelKey: "text-embedding-3-small",
        purpose: LLMPurpose.EMBEDDINGS,
        urnEnvKey: OPENAI_EMBEDDING_3_SMALL_MODEL_URN_ID,
        dimensions: 1536,
        maxTotalTokens: 8191,
      },
    ],
    completions: [
      {
        modelKey: "gpt-5",
        purpose: LLMPurpose.COMPLETIONS,
        urnEnvKey: OPENAI_GPT5_MODEL_URN_ID,
        maxCompletionTokens: 128_000,
        maxTotalTokens: 400_000,
        features: [
          "fixed_temperature" satisfies LLMModelFeature,
          "max_completion_tokens" satisfies LLMModelFeature,
        ],
      },
      {
        modelKey: "gpt-4o",
        purpose: LLMPurpose.COMPLETIONS,
        urnEnvKey: OPENAI_GPT4O_MODEL_URN_ID,
        maxCompletionTokens: 16_384,
        maxTotalTokens: 128_000,
      },
    ],
  },
  errorPatterns: OPENAI_COMMON_ERROR_PATTERNS,
  providerSpecificConfig: {
    ...defaultOpenAIProviderConfig,
  },
  implementation: OpenAILLM,
};
