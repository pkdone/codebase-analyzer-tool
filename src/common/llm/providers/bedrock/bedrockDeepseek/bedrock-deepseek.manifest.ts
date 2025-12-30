import { LLMProviderManifest } from "../../llm-provider.types";
import BedrockDeepseekLLM from "./bedrock-deepseek-llm";
import { LLMPurpose } from "../../../types/llm.types";
import { BEDROCK_COMMON_ERROR_PATTERNS } from "../common/bedrock-error-patterns";
import { z } from "zod";
import {
  createTitanEmbeddingsConfig,
  createBedrockEnvSchema,
} from "../common/bedrock-models.constants";
import { defaultBedrockProviderConfig } from "../common/bedrock-defaults.config";

// Model family constant - exported for use in provider registry
export const BEDROCK_DEEPSEEK_FAMILY = "BedrockDeepseek";

// Environment variable name constants
const BEDROCK_DEEPSEEK_COMPLETIONS_MODEL_PRIMARY_KEY = "BEDROCK_DEEPSEEK_COMPLETIONS_MODEL_PRIMARY";

// Model constants
const AWS_COMPLETIONS_DEEPSEEK_R1 = "AWS_COMPLETIONS_DEEPSEEK_R1";

export const bedrockDeepseekProviderManifest: LLMProviderManifest = {
  providerName: "Bedrock Deepseek",
  modelFamily: BEDROCK_DEEPSEEK_FAMILY,
  envSchema: createBedrockEnvSchema({
    [BEDROCK_DEEPSEEK_COMPLETIONS_MODEL_PRIMARY_KEY]: z.string().min(1),
  }),
  models: {
    embeddings: createTitanEmbeddingsConfig(),
    primaryCompletion: {
      modelKey: AWS_COMPLETIONS_DEEPSEEK_R1,
      name: "Deepseek R1",
      urnEnvKey: BEDROCK_DEEPSEEK_COMPLETIONS_MODEL_PRIMARY_KEY,
      purpose: LLMPurpose.COMPLETIONS,
      maxCompletionTokens: 16384,
      maxTotalTokens: 128000,
    },
  },
  errorPatterns: BEDROCK_COMMON_ERROR_PATTERNS,
  providerSpecificConfig: {
    ...defaultBedrockProviderConfig,
  },
  implementation: BedrockDeepseekLLM,
};
