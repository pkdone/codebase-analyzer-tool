import { OpenAI } from "openai";
import {
  LLMModelKeysSet,
  ResolvedLLMModelMetadata,
  LLMErrorMsgRegExPattern,
} from "../../../types/llm.types";
import BaseOpenAILLM from "../base-openai-llm";
import { OPENAI } from "./openai.manifest";

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
    apiKey: string,
  ) {
    super(modelsKeys, modelsMetadata, errorPatterns);
    this.client = new OpenAI({ apiKey });
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
