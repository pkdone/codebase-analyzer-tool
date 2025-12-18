import { OpenAI } from "openai";
import BaseOpenAILLM from "../common/base-openai-llm";
import type { ProviderInit } from "../../llm-provider.types";

/**
 * Class for the public OpenAI service.
 */
export default class OpenAILLM extends BaseOpenAILLM {
  // Private fields
  private readonly client: OpenAI;

  /**
   * Constructor.
   */
  constructor(init: ProviderInit) {
    super(init);
    const apiKey = init.providerParams.OPENAI_LLM_API_KEY as string;
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
