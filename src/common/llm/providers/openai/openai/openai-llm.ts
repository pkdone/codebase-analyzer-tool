import { OpenAI } from "openai";
import BaseOpenAILLM from "../common/base-openai-llm";
import type { ProviderInit } from "../../llm-provider.types";
import { isOpenAIConfig } from "./openai.types";
import { LLMError, LLMErrorCode } from "../../../types/llm-errors.types";

/**
 * Class for the public OpenAI service.
 */
export default class OpenAILLM extends BaseOpenAILLM {
  // Private fields
  private readonly client: OpenAI;

  /**
   * Constructor.
   * Uses typed configuration extracted and validated via the manifest's extractConfig function,
   * decoupling this provider from specific environment variable names.
   * Config validation is performed in the manifest layer - no need to re-validate here.
   */
  constructor(init: ProviderInit) {
    super(init);

    // Validate config at instantiation for type safety
    if (!isOpenAIConfig(init.extractedConfig)) {
      throw new LLMError(
        LLMErrorCode.BAD_CONFIGURATION,
        "Invalid OpenAI configuration - missing or empty apiKey",
      );
    }
    const { apiKey } = init.extractedConfig;
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
