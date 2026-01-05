import BedrockDeepseekLLM from "./bedrock-deepseek-llm";
import { LLMPurpose } from "../../../types/llm.types";
import { z } from "zod";
import { createTitanEmbeddingsConfig } from "../common/bedrock-models.constants";
import { createBedrockManifest } from "../common/bedrock-manifest-factory";

// Model family constant - exported for use in provider registry
export const BEDROCK_DEEPSEEK_FAMILY = "BedrockDeepseek";

// Environment variable name constants
const BEDROCK_DEEPSEEK_COMPLETIONS_MODEL_PRIMARY_KEY = "BEDROCK_DEEPSEEK_COMPLETIONS_MODEL_PRIMARY";

// Model constants
const AWS_COMPLETIONS_DEEPSEEK_R1 = "AWS_COMPLETIONS_DEEPSEEK_R1";

export const bedrockDeepseekProviderManifest = createBedrockManifest(
  "Bedrock Deepseek",
  BEDROCK_DEEPSEEK_FAMILY,
  {
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
  {
    [BEDROCK_DEEPSEEK_COMPLETIONS_MODEL_PRIMARY_KEY]: z.string().min(1),
  },
  {},
  BedrockDeepseekLLM,
);
