import { OpenAI } from "openai";
import {
  LLMModelKeysSet,
  ResolvedLLMModelMetadata,
  LLMErrorMsgRegExPattern,
} from "../../../types/llm.types";
import BaseOpenAILLM from "../common/base-openai-llm";
import { LLMProviderSpecificConfig } from "../../llm-provider.types";
import { JsonProcessor } from "../../../json-processing/core/json-processor";
import { EnvVars } from "../../../../env/env.types";
import { getRequiredEnvVar } from "../../../../env/env-utils";

/**
 * Class for the public OpenAI service.
 */
export default class OpenAILLM extends BaseOpenAILLM {
  // Private fields
  private readonly client: OpenAI;

  /**
   * Constructor.
   */
  constructor(
    env: EnvVars,
    modelsKeys: LLMModelKeysSet,
    modelsMetadata: Record<string, ResolvedLLMModelMetadata>,
    errorPatterns: readonly LLMErrorMsgRegExPattern[],
    config: { providerSpecificConfig: LLMProviderSpecificConfig },
    jsonProcessor: JsonProcessor,
    modelFamily: string,
  ) {
    super(
      modelsKeys,
      modelsMetadata,
      errorPatterns,
      config.providerSpecificConfig,
      jsonProcessor,
      modelFamily,
    );
    const apiKey = getRequiredEnvVar(env, "OPENAI_LLM_API_KEY");
    this.client = new OpenAI({ apiKey });
  }

  /**
   * Abstract method to get the client object for the specific LLM provider.
   */
  protected getClient() {
    return this.client;
  }

  /**
   * Get the model identifier for OpenAI provider.
   * For OpenAI, this is the model URN from the metadata.
   */
  protected getModelIdentifier(modelKey: string): string {
    return this.llmModelsMetadata[modelKey].urn;
  }
}
