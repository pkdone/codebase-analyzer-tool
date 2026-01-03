import BedrockMistralLLM from "./bedrock-mistral-llm";
import { LLMPurpose } from "../../../types/llm.types";
import { z } from "zod";
import { createTitanEmbeddingsConfig } from "../common/bedrock-models.constants";
import { createBedrockManifest } from "../common/bedrock-manifest-factory";

// Model family constant - exported for use in provider registry
export const BEDROCK_MISTRAL_FAMILY = "BedrockMistral";

// Environment variable name constants
const BEDROCK_MISTRAL_COMPLETIONS_MODEL_PRIMARY_KEY = "BEDROCK_MISTRAL_COMPLETIONS_MODEL_PRIMARY";
const BEDROCK_MISTRAL_COMPLETIONS_MODEL_SECONDARY_KEY =
  "BEDROCK_MISTRAL_COMPLETIONS_MODEL_SECONDARY";

// Model constants
const AWS_COMPLETIONS_MISTRAL_LARGE = "AWS_COMPLETIONS_MISTRAL_LARGE";
const AWS_COMPLETIONS_MISTRAL_LARGE2 = "AWS_COMPLETIONS_MISTRAL_LARGE2";

export const bedrockMistralProviderManifest = createBedrockManifest(
  "Bedrock Mistral",
  BEDROCK_MISTRAL_FAMILY,
  {
    embeddings: createTitanEmbeddingsConfig(),
    primaryCompletion: {
      modelKey: AWS_COMPLETIONS_MISTRAL_LARGE2,
      name: "Mistral Large 2",
      urnEnvKey: BEDROCK_MISTRAL_COMPLETIONS_MODEL_PRIMARY_KEY,
      purpose: LLMPurpose.COMPLETIONS,
      maxCompletionTokens: 8192,
      maxTotalTokens: 131072,
    },
    secondaryCompletion: {
      modelKey: AWS_COMPLETIONS_MISTRAL_LARGE,
      name: "Mistral Large",
      urnEnvKey: BEDROCK_MISTRAL_COMPLETIONS_MODEL_SECONDARY_KEY,
      purpose: LLMPurpose.COMPLETIONS,
      maxCompletionTokens: 8192,
      maxTotalTokens: 32768,
    },
  },
  {
    [BEDROCK_MISTRAL_COMPLETIONS_MODEL_PRIMARY_KEY]: z.string().min(1),
    [BEDROCK_MISTRAL_COMPLETIONS_MODEL_SECONDARY_KEY]: z.string().min(1),
  },
  {},
  BedrockMistralLLM,
);
