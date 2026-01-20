import { z } from "zod";
import { LLMProviderManifest } from "../../llm-provider.types";
import OpenAILLM from "./openai-llm";
import { LLMPurpose } from "../../../types/llm-request.types";
import { LLMModelFeature } from "../../../types/llm-model.types";
import { OPENAI_COMMON_ERROR_PATTERNS } from "../common/openai-error-patterns";
import { defaultOpenAIProviderConfig } from "../common/openai-defaults.config";

// Environment variable name constants
const OPENAI_LLM_API_KEY_KEY = "OPENAI_LLM_API_KEY";
const OPENAI_TEXT_EMBEDDINGS_MODEL_KEY = "OPENAI_TEXT_EMBEDDINGS_MODEL";
const OPENAI_GPT_COMPLETIONS_MODEL_PRIMARY_KEY = "OPENAI_GPT_COMPLETIONS_MODEL_PRIMARY";
const OPENAI_GPT_COMPLETIONS_MODEL_SECONDARY_KEY = "OPENAI_GPT_COMPLETIONS_MODEL_SECONDARY";

// Model constants
export const OPENAI = "OpenAI";
const GPT_EMBEDDINGS_TEXT_3SMALL = "GPT_EMBEDDINGS_TEXT_3SMALL";
const GPT_COMPLETIONS_GPT5 = "GPT_COMPLETIONS_GPT5";
const GPT_COMPLETIONS_GPT4_O = "GPT_COMPLETIONS_GPT4_O";

export const openAIProviderManifest: LLMProviderManifest = {
  providerName: "OpenAI GPT",
  modelFamily: OPENAI,
  envSchema: z.object({
    [OPENAI_LLM_API_KEY_KEY]: z.string().min(1),
    [OPENAI_TEXT_EMBEDDINGS_MODEL_KEY]: z.string().min(1),
    [OPENAI_GPT_COMPLETIONS_MODEL_PRIMARY_KEY]: z.string().min(1),
    [OPENAI_GPT_COMPLETIONS_MODEL_SECONDARY_KEY]: z.string().min(1),
  }),
  models: {
    embeddings: {
      modelKey: GPT_EMBEDDINGS_TEXT_3SMALL,
      name: "text-embedding-3-small",
      urnEnvKey: OPENAI_TEXT_EMBEDDINGS_MODEL_KEY,
      purpose: LLMPurpose.EMBEDDINGS,
      dimensions: 1536,
      maxTotalTokens: 8191,
    },
    primaryCompletion: {
      modelKey: GPT_COMPLETIONS_GPT5,
      name: "GPT-5",
      urnEnvKey: OPENAI_GPT_COMPLETIONS_MODEL_PRIMARY_KEY,
      purpose: LLMPurpose.COMPLETIONS,
      maxCompletionTokens: 128_000,
      maxTotalTokens: 400_000,
      features: [
        "fixed_temperature" satisfies LLMModelFeature,
        "max_completion_tokens" satisfies LLMModelFeature,
      ],
    },
    secondaryCompletion: {
      modelKey: GPT_COMPLETIONS_GPT4_O,
      name: "GPT-4o",
      urnEnvKey: OPENAI_GPT_COMPLETIONS_MODEL_SECONDARY_KEY,
      purpose: LLMPurpose.COMPLETIONS,
      maxCompletionTokens: 16_384,
      maxTotalTokens: 128_000,
    },
  },
  errorPatterns: OPENAI_COMMON_ERROR_PATTERNS,
  providerSpecificConfig: {
    ...defaultOpenAIProviderConfig,
  },
  implementation: OpenAILLM,
};
