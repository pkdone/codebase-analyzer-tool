import { OpenAI } from "openai";
import {
  LLMModelKeysSet,
  ResolvedLLMModelMetadata,
  LLMErrorMsgRegExPattern,
} from "../../../types/llm.types";
import BaseOpenAILLM from "../common/base-openai-llm";
import { OPENAI } from "./openai.manifest";
import { LLMProviderSpecificConfig } from "../../llm-provider.types";
import { JsonProcessor } from "../../../json-processing/core/json-processor";

/**
 * Configuration object for OpenAI LLM provider.
 * Encapsulates all OpenAI-specific configuration parameters.
 */
export interface OpenAIConfig {
  apiKey: string;
  providerSpecificConfig?: LLMProviderSpecificConfig;
}

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
    modelsKeys: LLMModelKeysSet,
    modelsMetadata: Record<string, ResolvedLLMModelMetadata>,
    errorPatterns: readonly LLMErrorMsgRegExPattern[],
    config: OpenAIConfig,
    jsonProcessor: JsonProcessor,
  ) {
    if (!config.providerSpecificConfig) {
      throw new Error("providerSpecificConfig is required but was not provided");
    }
    super(modelsKeys, modelsMetadata, errorPatterns, config.providerSpecificConfig, jsonProcessor);
    this.client = new OpenAI({ apiKey: config.apiKey });
  }

  /**
   * Get the model family this LLM implementation belongs to.
   */
  getModelFamily(): string {
    return OPENAI;
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
