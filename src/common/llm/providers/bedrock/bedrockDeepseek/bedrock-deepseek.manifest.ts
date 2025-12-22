import { LLMProviderManifest } from "../../llm-provider.types";
import BedrockDeepseekLLM from "./bedrock-deepseek-llm";
import { LLMPurpose } from "../../../types/llm.types";
import { BEDROCK_COMMON_ERROR_PATTERNS } from "../common/bedrock-error-patterns";
import { z } from "zod";
import {
  BEDROCK_TITAN_EMBEDDINGS_MODEL_KEY,
  AWS_EMBEDDINGS_TITAN_V1,
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
  envSchema: z.object({
    [BEDROCK_TITAN_EMBEDDINGS_MODEL_KEY]: z.string().min(1),
    [BEDROCK_DEEPSEEK_COMPLETIONS_MODEL_PRIMARY_KEY]: z.string().min(1),
  }),
  models: {
    embeddings: {
      modelKey: AWS_EMBEDDINGS_TITAN_V1,
      name: "Titan Embeddings v1",
      urnEnvKey: BEDROCK_TITAN_EMBEDDINGS_MODEL_KEY,
      purpose: LLMPurpose.EMBEDDINGS,
      dimensions: 1024,
      maxTotalTokens: 8192,
    },
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
