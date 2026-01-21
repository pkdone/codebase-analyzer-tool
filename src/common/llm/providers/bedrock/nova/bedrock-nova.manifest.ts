import { z } from "zod";
import BedrockNovaLLM from "./bedrock-nova-llm";
import { LLMPurpose } from "../../../types/llm-request.types";
import { createBedrockManifest } from "../common/bedrock-manifest-factory";

// Model family constant - exported for use in provider registry
export const BEDROCK_NOVA_FAMILY = "BedrockNova";

// Environment variable keys for model URNs
export const BEDROCK_NOVA_PRO_MODEL_URN_ID = "BEDROCK_NOVA_PRO_MODEL_URN";
export const BEDROCK_NOVA_LITE_MODEL_URN_ID = "BEDROCK_NOVA_LITE_MODEL_URN";
export const BEDROCK_TITAN_EMBEDDINGS_MODEL_URN_ID = "BEDROCK_TITAN_EMBEDDINGS_MODEL_URN";

export const bedrockNovaProviderManifest = createBedrockManifest(
  "Bedrock Nova",
  BEDROCK_NOVA_FAMILY,
  {
    embeddings: [
      {
        modelKey: "bedrock-amazon-titan-embed-text",
        purpose: LLMPurpose.EMBEDDINGS,
        urnEnvKey: BEDROCK_TITAN_EMBEDDINGS_MODEL_URN_ID,
        dimensions: 1024,
        maxTotalTokens: 8192,
      },
    ],
    completions: [
      {
        modelKey: "bedrock-amazon-nova-pro-v1",
        purpose: LLMPurpose.COMPLETIONS,
        urnEnvKey: BEDROCK_NOVA_PRO_MODEL_URN_ID,
        maxCompletionTokens: 5000,
        maxTotalTokens: 300000,
      },
      {
        modelKey: "bedrock-amazon-nova-lite-v1",
        purpose: LLMPurpose.COMPLETIONS,
        urnEnvKey: BEDROCK_NOVA_LITE_MODEL_URN_ID,
        maxCompletionTokens: 5000,
        maxTotalTokens: 300000,
      },
    ],
  },
  {
    [BEDROCK_NOVA_PRO_MODEL_URN_ID]: z.string().min(1),
    [BEDROCK_NOVA_LITE_MODEL_URN_ID]: z.string().min(1),
    [BEDROCK_TITAN_EMBEDDINGS_MODEL_URN_ID]: z.string().min(1),
  },
  {},
  BedrockNovaLLM,
);
