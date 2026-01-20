import BedrockLlamaLLM from "./bedrock-llama-llm";
import { LLMPurpose } from "../../../types/llm-request.types";
import { z } from "zod";
import { createTitanEmbeddingsConfig } from "../common/bedrock-models.constants";
import { createBedrockManifest } from "../common/bedrock-manifest-factory";

// Model family constant - exported for use in provider registry
export const BEDROCK_LLAMA_FAMILY = "BedrockLlama";

// Re-export the config schema for use by tests and external validation
export { BedrockLlamaProviderConfigSchema } from "./bedrock-llama.types";

// Environment variable name constants
const BEDROCK_LLAMA_COMPLETIONS_MODEL_PRIMARY_KEY = "BEDROCK_LLAMA_COMPLETIONS_MODEL_PRIMARY";
const BEDROCK_LLAMA_COMPLETIONS_MODEL_SECONDARY_KEY = "BEDROCK_LLAMA_COMPLETIONS_MODEL_SECONDARY";

// Model constants
const AWS_COMPLETIONS_LLAMA_V32_90B_INSTRUCT = "AWS_COMPLETIONS_LLAMA_V32_90B_INSTRUCT";
const AWS_COMPLETIONS_LLAMA_V33_70B_INSTRUCT = "AWS_COMPLETIONS_LLAMA_V33_70B_INSTRUCT";

export const bedrockLlamaProviderManifest = createBedrockManifest(
  "Bedrock Llama",
  BEDROCK_LLAMA_FAMILY,
  {
    embeddings: createTitanEmbeddingsConfig(1536),
    primaryCompletion: {
      modelKey: AWS_COMPLETIONS_LLAMA_V33_70B_INSTRUCT,
      name: "Llama 3.3 70B",
      urnEnvKey: BEDROCK_LLAMA_COMPLETIONS_MODEL_PRIMARY_KEY,
      purpose: LLMPurpose.COMPLETIONS,
      maxCompletionTokens: 8192,
      maxTotalTokens: 128000,
    },
    secondaryCompletion: {
      modelKey: AWS_COMPLETIONS_LLAMA_V32_90B_INSTRUCT,
      name: "Llama 3.2 90B",
      urnEnvKey: BEDROCK_LLAMA_COMPLETIONS_MODEL_SECONDARY_KEY,
      purpose: LLMPurpose.COMPLETIONS,
      maxCompletionTokens: 4096,
      maxTotalTokens: 128000,
    },
  },
  {
    [BEDROCK_LLAMA_COMPLETIONS_MODEL_PRIMARY_KEY]: z.string().min(1),
    [BEDROCK_LLAMA_COMPLETIONS_MODEL_SECONDARY_KEY]: z.string().min(1),
  },
  {
    maxGenLenCap: 2048,
  },
  BedrockLlamaLLM,
);
