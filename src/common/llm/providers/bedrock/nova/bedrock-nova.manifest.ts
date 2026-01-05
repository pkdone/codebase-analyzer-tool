import BedrockNovaLLM from "./bedrock-nova-llm";
import { LLMPurpose } from "../../../types/llm.types";
import { z } from "zod";
import { createTitanEmbeddingsConfig } from "../common/bedrock-models.constants";
import { createBedrockManifest } from "../common/bedrock-manifest-factory";

// Model family constant - exported for use in provider registry
export const BEDROCK_NOVA_FAMILY = "BedrockNova";

// Environment variable name constants
const BEDROCK_NOVA_COMPLETIONS_MODEL_PRIMARY_KEY = "BEDROCK_NOVA_COMPLETIONS_MODEL_PRIMARY";
const BEDROCK_NOVA_COMPLETIONS_MODEL_SECONDARY_KEY = "BEDROCK_NOVA_COMPLETIONS_MODEL_SECONDARY";

// Model constants
const AWS_COMPLETIONS_NOVA_LITE_V1 = "AWS_COMPLETIONS_NOVA_LITE_V1";
const AWS_COMPLETIONS_NOVA_PRO_V1 = "AWS_COMPLETIONS_NOVA_PRO_V1";

export const bedrockNovaProviderManifest = createBedrockManifest(
  "Bedrock Nova",
  BEDROCK_NOVA_FAMILY,
  {
    embeddings: createTitanEmbeddingsConfig(),
    primaryCompletion: {
      modelKey: AWS_COMPLETIONS_NOVA_PRO_V1,
      name: "Nova Pro",
      urnEnvKey: BEDROCK_NOVA_COMPLETIONS_MODEL_PRIMARY_KEY,
      purpose: LLMPurpose.COMPLETIONS,
      maxCompletionTokens: 5000,
      maxTotalTokens: 300000,
    },
    secondaryCompletion: {
      modelKey: AWS_COMPLETIONS_NOVA_LITE_V1,
      name: "Nova Lite",
      urnEnvKey: BEDROCK_NOVA_COMPLETIONS_MODEL_SECONDARY_KEY,
      purpose: LLMPurpose.COMPLETIONS,
      maxCompletionTokens: 5000,
      maxTotalTokens: 300000,
    },
  },
  {
    [BEDROCK_NOVA_COMPLETIONS_MODEL_PRIMARY_KEY]: z.string().min(1),
    [BEDROCK_NOVA_COMPLETIONS_MODEL_SECONDARY_KEY]: z.string().min(1),
  },
  {},
  BedrockNovaLLM,
);
