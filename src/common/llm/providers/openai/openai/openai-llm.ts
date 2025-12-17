import { OpenAI } from "openai";
import {
  LLMModelKeysSet,
  ResolvedLLMModelMetadata,
  LLMErrorMsgRegExPattern,
} from "../../../types/llm.types";
import BaseOpenAILLM from "../common/base-openai-llm";
import { LLMProviderSpecificConfig } from "../../llm-provider.types";

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
    providerParams: Record<string, unknown>,
    modelsKeys: LLMModelKeysSet,
    modelsMetadata: Record<string, ResolvedLLMModelMetadata>,
    errorPatterns: readonly LLMErrorMsgRegExPattern[],
    providerSpecificConfig: LLMProviderSpecificConfig,
    modelFamily: string,
    errorLogger: import("../../../tracking/llm-error-logger.interface").IErrorLogger,
    llmFeatures?: readonly string[],
  ) {
    super(
      modelsKeys,
      modelsMetadata,
      errorPatterns,
      providerSpecificConfig,
      modelFamily,
      errorLogger,
      llmFeatures,
    );
    const apiKey = providerParams.OPENAI_LLM_API_KEY as string;
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
