import { z } from "zod";
import BedrockLlamaLLM from "./bedrock-llama-llm";
import { LLMPurpose } from "../../../types/llm-request.types";
import { createBedrockManifest } from "../common/bedrock-manifest-factory";

// Model family constant - exported for use in provider registry
export const BEDROCK_LLAMA_FAMILY = "BedrockLlama";

// Re-export the config schema for use by tests and external validation
export { BedrockLlamaProviderConfigSchema } from "./bedrock-llama.types";

// Environment variable keys for model URNs
export const BEDROCK_LLAMA_33_70B_MODEL_URN_ID = "BEDROCK_LLAMA_33_70B_MODEL_URN";
export const BEDROCK_LLAMA_32_90B_MODEL_URN_ID = "BEDROCK_LLAMA_32_90B_MODEL_URN";

export const bedrockLlamaProviderManifest = createBedrockManifest(
  BEDROCK_LLAMA_FAMILY,
  {
    embeddings: [],
    completions: [
      {
        modelKey: "bedrock-meta-llama3-3-70b-instruct",
        purpose: LLMPurpose.COMPLETIONS,
        urnEnvKey: BEDROCK_LLAMA_33_70B_MODEL_URN_ID,
        maxCompletionTokens: 8192,
        maxTotalTokens: 128000,
      },
      {
        modelKey: "bedrock-meta-llama3-2-90b-instruct",
        purpose: LLMPurpose.COMPLETIONS,
        urnEnvKey: BEDROCK_LLAMA_32_90B_MODEL_URN_ID,
        maxCompletionTokens: 4096,
        maxTotalTokens: 128000,
      },
    ],
  },
  {
    [BEDROCK_LLAMA_33_70B_MODEL_URN_ID]: z.string().min(1),
    [BEDROCK_LLAMA_32_90B_MODEL_URN_ID]: z.string().min(1),
  },
  {
    maxGenLenCap: 2048,
  },
  BedrockLlamaLLM,
);
