import {
  VertexAI,
  RequestOptions,
  FinishReason,
  HarmCategory,
  HarmBlockThreshold,
  GoogleApiError,
  ClientError,
  GenerationConfig,
} from "@google-cloud/vertexai";
import * as aiplatform from "@google-cloud/aiplatform";
const { helpers } = aiplatform;
import { llmConfig } from "../../../config/llm.config";
import {
  LLMCompletionOptions,
  LLMOutputFormat,
  ShutdownBehavior,
  createTokenUsageRecord,
} from "../../../types/llm.types";
import { logWarn, logErr } from "../../../../utils/logging";
import { formatError } from "../../../../utils/error-formatters";
import BaseLLMProvider from "../../base-llm-provider";
import { LLMError, LLMErrorCode } from "../../../types/llm-errors.types";
import {
  zodToJsonSchemaWithoutMeta,
  sanitizeSchemaForProvider,
} from "../../../utils/schema-sanitizer";
import {
  VERTEXAI_API_ENDPOINT,
  VERTEXAI_TERMINAL_FINISH_REASONS,
  VERTEXAI_GLOBAL_LOCATION,
} from "./vertex-ai-gemini.constants";

/**
 * Class for the GCP Vertex AI Gemini service.
 *
 * Some of the possible receivable Vertex exceptions as of April 2025:
 *
 * GoogleApiError, ClientError, GoogleAuthError, GoogleGenerativeAIError, IllegalArgumentError
 */
export default class VertexAIGeminiLLM extends BaseLLMProvider {
  // Private fields
  private readonly vertexAiApiClient: VertexAI;
  private readonly embeddingsApiClient: aiplatform.PredictionServiceClient;
  private readonly apiEndpointPrefix: string;

  /**
   * Constructor
   *
   * Supports separate locations for embeddings and completions:
   * - VERTEXAI_EMBEDDINGS_LOCATION: Regional location for embeddings (e.g., "us-central1")
   * - VERTEXAI_COMPLETIONS_LOCATION: Location for completions (can be "global" for preview models)
   */
  constructor(init: import("../../llm-provider.types").ProviderInit) {
    super(init);
    const project = init.providerParams.VERTEXAI_PROJECTID as string;
    const embeddingsLocation = init.providerParams.VERTEXAI_EMBEDDINGS_LOCATION as string;
    const completionsLocation = init.providerParams.VERTEXAI_COMPLETIONS_LOCATION as string;

    // For 'global' location, the API endpoint is the base domain (no region prefix)
    // For regional locations, the SDK automatically constructs '{location}-aiplatform.googleapis.com'
    const completionsApiEndpoint =
      completionsLocation === VERTEXAI_GLOBAL_LOCATION ? VERTEXAI_API_ENDPOINT : undefined;
    this.vertexAiApiClient = new VertexAI({
      project,
      location: completionsLocation,
      ...(completionsApiEndpoint && { apiEndpoint: completionsApiEndpoint }),
    });

    // Use the specified regional location for embeddings
    this.embeddingsApiClient = new aiplatform.PredictionServiceClient({
      apiEndpoint: `${embeddingsLocation}-${VERTEXAI_API_ENDPOINT}`,
    });
    this.apiEndpointPrefix = `projects/${project}/locations/${embeddingsLocation}/publishers/google/models/`;
  }

  /**
   * Get the shutdown behavior for this provider.
   * Vertex AI requires process exit due to gRPC connection limitations in the SDK.
   */
  override getShutdownBehavior(): ShutdownBehavior {
    return ShutdownBehavior.REQUIRES_PROCESS_EXIT;
  }

  /**
   * Call close on underlying LLM client libraries to release resources.
   */
  override async close(): Promise<void> {
    try {
      // Close the embeddings API client (PredictionServiceClient)
      await this.embeddingsApiClient.close();
      // Known Google Cloud Node.js client limitation:
      // VertexAI SDK doesn't have explicit VertexAI.close() method and HTTP connections may persist
      // so can't clean up `this.vertexAiApiClient` properly.
      // This is documented behavior - see: https://github.com/googleapis/nodejs-pubsub/issues/1190
      // Use timeout-based cleanup as the recommended workaround at the end of the program to allow
      // the process to terminate.
    } catch (error: unknown) {
      logErr("Error when closing Vertex AI Gemini LLM clients", error);
    }
  }

  /**
   * Execute the embedding prompt against the LLM and return the relevant summary.
   */
  protected async invokeEmbeddingProvider(modelKey: string, prompt: string) {
    return await this.invokeEmbeddingsLLM(modelKey, prompt);
  }

  /**
   * Execute the completion prompt against the LLM and return the relevant summary.
   */
  protected async invokeCompletionProvider(
    modelKey: string,
    prompt: string,
    options?: LLMCompletionOptions,
  ) {
    return this.invokeCompletionLLM(modelKey, prompt, options);
  }

  /**
   * See if the respnse error indicated that the LLM was overloaded.
   */
  protected isLLMOverloaded(error: unknown) {
    if (error instanceof Error) {
      const errMsg = formatError(error).toLowerCase() || "";
      if (error instanceof GoogleApiError && error.code === 429) return true;
      if (error instanceof ClientError && errMsg.includes("429 too many requests")) return true;
      if (error instanceof ClientError && errMsg.includes("499 client closed request")) return true;

      if (
        errMsg.includes("reason given: recitation") ||
        errMsg.includes("exception posting request to model") ||
        errMsg.includes("internal server error") ||
        errMsg.includes("deadline exceeded")
      ) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check to see if error code indicates potential token limit has been execeeded - this should
   * not occur with error object thrown so always returns false
   */
  protected isTokenLimitExceeded(error: unknown) {
    if (error instanceof Error) {
      const errMsg = formatError(error).toLowerCase() || "";
      if (error instanceof ClientError && errMsg.includes("exceeds the maximum number of tokens"))
        return true;
      if (
        error instanceof ClientError &&
        errMsg.includes("contains text fields that are too large")
      )
        return true;
    }

    return false;
  }

  /**
   * Invoke the actuall LLM's embedding API directly.
   */
  private async invokeEmbeddingsLLM(modelKey: string, prompt: string) {
    // Invoke LLM using PredictionServiceClient for embeddings
    const fullParameters = this.buildFullEmbeddingsLLMParameters(modelKey, prompt);
    const llmResponses = await this.embeddingsApiClient.predict(fullParameters);
    const [predictionResponses] = llmResponses;
    const predictions = predictionResponses.predictions;

    // Capture response content
    const embeddingsArray = this.extractEmbeddingsFromPredictions(predictions);
    // Array access may return undefined for empty arrays - use explicit check for type safety
    const responseContent = embeddingsArray.length > 0 ? embeddingsArray[0] : null;
    const isIncompleteResponse = responseContent === null;

    // Capture token usage (Embeddings API doesn't provide token counts)
    const tokenUsage = createTokenUsageRecord();
    return { isIncompleteResponse, responseContent, tokenUsage };
  }

  /**
   * Invoke the actuall LLM's completion API directly.
   */
  private async invokeCompletionLLM(
    modelKey: string,
    prompt: string,
    options?: LLMCompletionOptions,
  ) {
    // Invoke LLM
    const { modelParams, requestOptions } = this.buildFullCompletionLLMParameters(
      modelKey,
      options,
    );
    const llm = this.vertexAiApiClient.getGenerativeModel(modelParams, requestOptions);
    const llmResponses = await llm.generateContent(prompt);
    const usageMetadata = llmResponses.response.usageMetadata;
    const llmResponse = llmResponses.response.candidates?.[0];
    if (!llmResponse)
      throw new LLMError(LLMErrorCode.BAD_RESPONSE_CONTENT, "LLM response was completely empty");

    // Capture response content
    // llmResponse is verified to exist above with the guard check.
    // Per SDK types, content and parts are required. Access the first part's text if available.
    // Parts array is typed as non-empty per SDK, so parts[0] is guaranteed to exist.
    const firstPart = llmResponse.content.parts[0];
    const responseContent = firstPart.text ?? null;

    // Capture finish reason
    const finishReason = llmResponse.finishReason ?? FinishReason.OTHER;
    if (VERTEXAI_TERMINAL_FINISH_REASONS.includes(finishReason))
      throw new LLMError(
        LLMErrorCode.REJECTION_RESPONSE,
        `LLM response was not safely completed - reason given: ${finishReason}`,
        finishReason,
      );
    const isIncompleteResponse = finishReason !== FinishReason.STOP || responseContent == null;

    // Capture token usage
    const tokenUsage = createTokenUsageRecord(
      usageMetadata?.promptTokenCount,
      usageMetadata?.candidatesTokenCount,
    );
    return { isIncompleteResponse, responseContent, tokenUsage };
  }

  /**
   * Assemble the GCP API parameters structure for the given model and prompt (for Gemini embeddings).
   */
  private buildFullEmbeddingsLLMParameters(modelKey: string, prompt: string) {
    const model = this.llmModelsMetadata[modelKey].urn;
    const endpoint = `${this.apiEndpointPrefix}${model}`;
    // For Gemini models, we don't use task_type parameter
    const instance = helpers.toValue({ content: prompt });
    if (!instance)
      throw new LLMError(LLMErrorCode.BAD_CONFIGURATION, "Failed to convert prompt to IValue");
    const parameters = helpers.toValue({});
    return { endpoint, instances: [instance], parameters };
  }

  /**
   * Assemble the GCP API parameters structure for the given model and prompt.
   */
  private buildFullCompletionLLMParameters(modelKey: string, options?: LLMCompletionOptions) {
    const config = this.providerSpecificConfig;
    const generationConfig: GenerationConfig = {
      candidateCount: 1,
      topP: config.topP ?? llmConfig.DEFAULT_TOP_P_LOWEST,
      topK: config.topK ?? llmConfig.DEFAULT_TOP_K_LOWEST,
      temperature: config.temperature ?? llmConfig.DEFAULT_ZERO_TEMP,
      maxOutputTokens: this.llmModelsMetadata[modelKey].maxCompletionTokens,
    };

    if (options?.outputFormat === LLMOutputFormat.JSON) {
      generationConfig.responseMimeType = llmConfig.MIME_TYPE_JSON;

      // Only force Vertex AI to use the JSON schema if the schema shape does not contain some
      // schema definiton elements that the Vertex AI API chokes on - otherwise VertexAI throws
      // ClientError - INVALID_ARGUMENT - fieldViolations errors
      if (options.jsonSchema && !options.hasComplexSchema) {
        const jsonSchema = zodToJsonSchemaWithoutMeta(options.jsonSchema);
        const sanitizedSchema = sanitizeSchemaForProvider(jsonSchema, ["const"]);

        if (isVertexAICompatibleSchema(sanitizedSchema)) {
          // Cast to unknown first, then to ResponseSchema - the type guard validates compatibility
          generationConfig.responseSchema =
            sanitizedSchema as unknown as typeof generationConfig.responseSchema;
        } else {
          logWarn(
            "Generated JSON schema is not compatible with VertexAI SDK's Schema type. " +
              "Proceeding without schema enforcement to avoid runtime errors.",
          );
        }
      }
    }

    const modelParams = {
      model: this.llmModelsMetadata[modelKey].urn,
      generationConfig,
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_UNSPECIFIED,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
      ],
    };

    const requestOptions = {
      timeout: config.requestTimeoutMillis,
    } as RequestOptions;

    return { modelParams, requestOptions };
  }

  /**
   * Extract the embeddings from the predictions (for Gemini embeddings).
   */
  private extractEmbeddingsFromPredictions(
    predictions: aiplatform.protos.google.protobuf.IValue[] | null | undefined,
  ): number[][] {
    if (!predictions) return [];
    return predictions.flatMap((p) => {
      // Protobuf IValue has multiple possible shapes - extract values from either structure
      const values = this.extractValuesFromProtobufValue(p);
      const numbers = values.map((v) => v.numberValue ?? 0);
      return numbers.length > 0 ? [numbers] : [];
    });
  }

  /**
   * Extract list values from a protobuf IValue, handling both embedding and direct list structures.
   * Protobuf types declare fields as potentially undefined even when they exist at runtime,
   * so we use explicit checks to satisfy TypeScript while handling both response formats.
   */
  private extractValuesFromProtobufValue(
    value: aiplatform.protos.google.protobuf.IValue,
  ): aiplatform.protos.google.protobuf.IValue[] {
    // Try the nested embeddings structure first (standard Gemini embedding response)
    const embeddingsStruct = value.structValue?.fields?.embeddings;

    if (embeddingsStruct) {
      const valuesField = embeddingsStruct.structValue?.fields?.values;
      if (valuesField?.listValue?.values) {
        return valuesField.listValue.values;
      }
    }

    // Fall back to direct list structure
    if (value.listValue?.values) {
      return value.listValue.values;
    }
    return [];
  }
}

/**
 * Interface representing a JSON schema that is structurally compatible with VertexAI's Schema type.
 * Defines the expected shape validated by isVertexAICompatibleSchema type guard.
 *
 * This interface captures the structural requirements for VertexAI's ResponseSchema:
 * - type: Required string that maps to SchemaType enum at runtime
 * - description: Optional description of the schema
 * - properties: Required for object types, maps property names to nested schemas
 * - required: Optional array of required property names
 * - items: Optional schema for array item types
 * - enum: Optional array of allowed string values
 *
 * Note: Uses Record<string, unknown> as the base to remain compatible with the SDK's
 * ResponseSchema type, while the type guard validates the structure at runtime.
 */
interface VertexCompatibleSchema extends Record<string, unknown> {
  readonly type: string;
  readonly description?: string;
  readonly properties?: Readonly<Record<string, unknown>>;
  readonly required?: readonly string[];
  readonly items?: unknown;
  readonly enum?: readonly string[];
}

/**
 * Type guard to check if a JSON schema is compatible with VertexAI's Schema type.
 * This performs a structural compatibility check validating that:
 * - The schema is a non-null object
 * - It has a 'type' property that is a string (maps to SchemaType enum at runtime)
 * - For object types, it has a 'properties' object
 *
 * @param schema - The schema to validate
 * @returns True if the schema is compatible with VertexAI
 */
function isVertexAICompatibleSchema(schema: unknown): schema is VertexCompatibleSchema {
  if (!schema || typeof schema !== "object") return false;
  const schemaObj = schema as Record<string, unknown>;
  if (!("type" in schemaObj) || typeof schemaObj.type !== "string") return false;
  // For object types, require properties to be present
  if (schemaObj.type === "object" && !("properties" in schemaObj)) return false;
  return true;
}
