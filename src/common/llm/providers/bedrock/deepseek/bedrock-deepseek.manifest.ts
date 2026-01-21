import { z } from "zod";
import BedrockDeepseekLLM from "./bedrock-deepseek-llm";
import { LLMPurpose } from "../../../types/llm-request.types";
import { createBedrockManifest } from "../common/bedrock-manifest-factory";

// Model family constant - exported for use in provider registry
export const BEDROCK_DEEPSEEK_FAMILY = "BedrockDeepseek";

// Environment variable keys for model URNs
export const BEDROCK_DEEPSEEK_R1_MODEL_URN_ID = "BEDROCK_DEEPSEEK_R1_MODEL_URN";

export const bedrockDeepseekProviderManifest = createBedrockManifest(
  BEDROCK_DEEPSEEK_FAMILY,
  {
    embeddings: [],
    completions: [
      {
        modelKey: "bedrock-deepseek-r1",
        purpose: LLMPurpose.COMPLETIONS,
        urnEnvKey: BEDROCK_DEEPSEEK_R1_MODEL_URN_ID,
        maxCompletionTokens: 16384,
        maxTotalTokens: 128000,
      },
    ],
  },
  {
    [BEDROCK_DEEPSEEK_R1_MODEL_URN_ID]: z.string().min(1),
  },
  {},
  BedrockDeepseekLLM,
);
