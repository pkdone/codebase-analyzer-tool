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
  createTokenUsage,
} from "../../../types/llm.types";
import { logOneLineWarning, logOneLineError } from "../../../../utils/logging";
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
      logOneLineError("Error when closing Vertex AI Gemini LLM clients", error);
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
    const responseContentRaw = embeddingsArray[0];
    // Convert undefined to null to match LLMGeneratedContent type
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    const responseContent = responseContentRaw ?? null;

    // Capture finish reason
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    const isIncompleteResponse = responseContent == null;

    // Capture token usage (Embeddings API doesn't provide token counts)
    const tokenUsage = createTokenUsage();
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
    // Using extra checking because even though Vertex AI types say these should exists they may not
    // if there is a bad "finish reason"
    // Preserve null values from LLM (null has different semantic meaning than empty string)
    // Convert undefined to null to match LLMGeneratedContent type
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    const responseContent = llmResponse?.content?.parts?.[0]?.text ?? null;

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
    const tokenUsage = createTokenUsage(
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
          generationConfig.responseSchema = sanitizedSchema;
        } else {
          logOneLineWarning(
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
      // For Gemini models, the response structure might be different
      /* eslint-disable @typescript-eslint/no-unnecessary-condition */
      const values =
        p.structValue?.fields?.embeddings?.structValue?.fields?.values?.listValue?.values ??
        p.listValue?.values ??
        [];
      /* eslint-enable @typescript-eslint/no-unnecessary-condition */
      const numbers = values.map((v) => v.numberValue ?? 0);
      return numbers.length > 0 ? [numbers] : [];
    });
  }
}

/**
 * Type guard to check if a JSON schema is compatible with VertexAI's Schema type.
 * This is a structural compatibility check since the exact Schema interface may not be directly
 * accessible. VertexAI expects schemas to have type information and properties structure.
 */
function isVertexAICompatibleSchema(schema: unknown): schema is Record<string, unknown> {
  if (!schema || typeof schema !== "object") return false;
  const schemaObj = schema as Record<string, unknown>;
  return (
    "type" in schemaObj &&
    typeof schemaObj.type === "string" &&
    (schemaObj.type === "object" ? "properties" in schemaObj : true)
  );
}
