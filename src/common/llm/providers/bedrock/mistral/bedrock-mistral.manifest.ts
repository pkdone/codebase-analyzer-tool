import { z } from "zod";
import BedrockMistralLLM from "./bedrock-mistral-llm";
import { LLMPurpose } from "../../../types/llm-request.types";
import { createBedrockManifest } from "../common/bedrock-manifest-factory";

// Model family constant - exported for use in provider registry
export const BEDROCK_MISTRAL_FAMILY = "BedrockMistral";

// Environment variable keys for model URNs
export const BEDROCK_MISTRAL_LARGE_2407_MODEL_URN_ID = "BEDROCK_MISTRAL_LARGE_2407_MODEL_URN";
export const BEDROCK_MISTRAL_LARGE_2402_MODEL_URN_ID = "BEDROCK_MISTRAL_LARGE_2402_MODEL_URN";

export const bedrockMistralProviderManifest = createBedrockManifest(
  "Bedrock Mistral",
  BEDROCK_MISTRAL_FAMILY,
  {
    embeddings: [],
    completions: [
      {
        modelKey: "bedrock-mistral-large-2407",
        purpose: LLMPurpose.COMPLETIONS,
        urnEnvKey: BEDROCK_MISTRAL_LARGE_2407_MODEL_URN_ID,
        maxCompletionTokens: 8192,
        maxTotalTokens: 131072,
      },
      {
        modelKey: "bedrock-mistral-large-2402",
        purpose: LLMPurpose.COMPLETIONS,
        urnEnvKey: BEDROCK_MISTRAL_LARGE_2402_MODEL_URN_ID,
        maxCompletionTokens: 8192,
        maxTotalTokens: 32768,
      },
    ],
  },
  {
    [BEDROCK_MISTRAL_LARGE_2407_MODEL_URN_ID]: z.string().min(1),
    [BEDROCK_MISTRAL_LARGE_2402_MODEL_URN_ID]: z.string().min(1),
  },
  {},
  BedrockMistralLLM,
);
