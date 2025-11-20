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
import { llmConfig } from "../../../llm.config";
import { appConfig } from "../../../../config/app.config";
import {
  LLMModelKeysSet,
  LLMPurpose,
  ResolvedLLMModelMetadata,
  LLMErrorMsgRegExPattern,
  LLMCompletionOptions,
  LLMOutputFormat,
} from "../../../types/llm.types";
import { logSingleLineWarning, logErrorMsgAndDetail } from "../../../../common/utils/logging";
import { formatError } from "../../../../common/utils/error-formatters";
import AbstractLLM from "../../abstract-llm";
import {
  BadConfigurationLLMError,
  BadResponseContentLLMError,
  RejectionResponseLLMError,
} from "../../../types/llm-errors.types";
import { LLMProviderSpecificConfig } from "../../llm-provider.types";
import { toMongoJsonSchema } from "../../../../common/mongodb/utils/zod-to-mongodb-schema";
import { isJsonObject } from "../../../../common/utils/type-guards";
import { JsonProcessor } from "../../../json-processing/core/json-processor";
import { EnvVars } from "../../../../env/env.types";
import { getRequiredEnvVar } from "../../../../env/env-utils";

// Constant for the finish reasons that are considered terminal and should be rejected
const VERTEXAI_TERMINAL_FINISH_REASONS = [
  FinishReason.BLOCKLIST,
  FinishReason.PROHIBITED_CONTENT,
  FinishReason.RECITATION,
  FinishReason.SAFETY,
  FinishReason.SPII,
];

/**
 * Class for the GCP Vertex AI Gemini service.
 *
 * Some of the possible receivable Vertex exceptions as of April 2025:
 *
 * GoogleApiError, ClientError, GoogleAuthError, GoogleGenerativeAIError, IllegalArgumentError
 */
export default class VertexAIGeminiLLM extends AbstractLLM {
  // Private fields
  private readonly vertexAiApiClient: VertexAI;
  private readonly embeddingsApiClient: aiplatform.PredictionServiceClient;
  private readonly apiEndpointPrefix: string;

  /**
   * Constructor
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
    const project = getRequiredEnvVar(env, "VERTEXAI_PROJECTID");
    const location = getRequiredEnvVar(env, "VERTEXAI_LOCATION");
    this.vertexAiApiClient = new VertexAI({ project, location });
    this.embeddingsApiClient = new aiplatform.PredictionServiceClient({
      apiEndpoint: `${location}-aiplatform.googleapis.com`,
    });
    this.apiEndpointPrefix = `projects/${project}/locations/${location}/publishers/google/models/`;
  }

  /**
   * Whether the LLM provider needs to be forcefully shut down.
   */
  override needsForcedShutdown(): boolean {
    return true;
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
      logErrorMsgAndDetail("Error when closing Vertex AI Gemini LLM clients", error);
    }
  }

  /**
   * Execute the prompt against the LLM and return the relevant sumamry of the LLM's answer.
   */
  protected async invokeProvider(
    taskType: LLMPurpose,
    modelKey: string,
    prompt: string,
    options?: LLMCompletionOptions,
  ) {
    if (taskType === LLMPurpose.EMBEDDINGS) {
      return await this.invokeEmbeddingsLLM(modelKey, prompt);
    } else {
      return this.invokeCompletionLLM(modelKey, prompt, options);
    }
  }

  /**
   * See if the respnse error indicated that the LLM was overloaded.
   */
  protected isLLMOverloaded(error: unknown) {
    if (error instanceof Error) {
      const errMsg = formatError(error).toLowerCase() || "";
      if (error instanceof GoogleApiError && error.code === 429) return true;
      if (error instanceof ClientError && errMsg.includes("429 too many requests")) return true;

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
    const responseContent = embeddingsArray[0];

    // Capture finish reason
    const isIncompleteResponse = !responseContent;

    // Capture token usage
    const tokenUsage = { promptTokens: -1, completionTokens: -1, maxTotalTokens: -1 }; // API doesn't provide token counts
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
    if (!llmResponse) throw new BadResponseContentLLMError("LLM response was completely empty");

    // Capture response content
    // Using extra checking because even though Vertex AI types say these should exists they may not
    // if there is a bad "finish reason"
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    const responseContent = llmResponse?.content?.parts?.[0]?.text ?? "";

    // Capture finish reason
    const finishReason = llmResponse.finishReason ?? FinishReason.OTHER;
    if (VERTEXAI_TERMINAL_FINISH_REASONS.includes(finishReason))
      throw new RejectionResponseLLMError(
        `LLM response was not safely completed - reason given: ${finishReason}`,
        finishReason,
      );
    const isIncompleteResponse = finishReason !== FinishReason.STOP || !responseContent;

    // Capture token usage
    const promptTokens = usageMetadata?.promptTokenCount ?? -1;
    const completionTokens = usageMetadata?.candidatesTokenCount ?? -1;
    const maxTotalTokens = -1; // Not "totalTokenCount" as that is total of prompt + cpompletion tokens tokens and not the max limit
    const tokenUsage = { promptTokens, completionTokens, maxTotalTokens };
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
    if (!instance) throw new BadConfigurationLLMError("Failed to convert prompt to IValue");
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
      generationConfig.responseMimeType = appConfig.MIME_TYPE_JSON;

      // Only force Vertex AI to use the JSON schema if the schema shape does not contain some
      // schema definiton elements that the Vertex AI API chokes on - otherwise VertexAI throws
      // ClientError - INVALID_ARGUMENT - fieldViolations errors
      if (options.jsonSchema && !options.hasComplexSchema) {
        const jsonSchema = toMongoJsonSchema(options.jsonSchema);
        const sanitizedSchema = sanitizeVertexAISchema(jsonSchema);

        if (isVertexAICompatibleSchema(sanitizedSchema)) {
          generationConfig.responseSchema = sanitizedSchema;
        } else {
          logSingleLineWarning(
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
 * Recursively remove unsupported keywords from JSON Schema for Vertex AI compatibility.
 * Vertex AI doesn't support the `const` keyword in response schemas, which causes
 * INVALID_ARGUMENT errors when present at any nesting level (e.g., within anyOf, allOf, items, etc.).
 */
function sanitizeVertexAISchema(schema: unknown): unknown {
  if (Array.isArray(schema)) {
    return schema.map((item) => sanitizeVertexAISchema(item));
  }

  if (isJsonObject(schema)) {
    // Create a new object to avoid mutating the original
    const sanitized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(schema)) {
      if (key === "const") continue; // Skip const fields - Vertex AI doesn't support them
      sanitized[key] = sanitizeVertexAISchema(value); // Recursively sanitize nested objs ^ arrays
    }

    return sanitized;
  }

  return schema;
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
