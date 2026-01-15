import { z } from "zod";

/**
 * Interface for LLM implementation provider.
 *
 * The completion methods use the new LLMFunction type which infers return types
 * from the options.jsonSchema at the call site, enabling end-to-end type safety.
 */
export interface LLMProvider {
  /** Optional feature flags indicating model-specific capabilities or constraints */
  readonly llmFeatures?: readonly string[];

  /** Generate embeddings for content. Returns a fixed number[] type. */
  generateEmbeddings: LLMEmbeddingFunction;

  /**
   * Execute completion using the primary model.
   * Return type is inferred from options.jsonSchema when provided.
   */
  executeCompletionPrimary: LLMFunction;

  /**
   * Execute completion using the secondary model.
   * Return type is inferred from options.jsonSchema when provided.
   */
  executeCompletionSecondary: LLMFunction;

  getModelsNames(): {
    embeddings: string;
    primaryCompletion: string;
    secondaryCompletion?: string;
  };
  getAvailableCompletionModelTiers(): LLMModelTier[];
  getEmbeddingModelDimensions(): number | undefined;
  getModelFamily(): string;
  getModelsMetadata(): Readonly<Record<string, ResolvedLLMModelMetadata>>;
  close(): Promise<void>;
  /**
   * Get the shutdown behavior required by this provider.
   * Used by the application lifecycle to determine how to clean up.
   */
  getShutdownBehavior(): ShutdownBehavior;
  /**
   * Validate provider credentials are available and not expired.
   * Throws if credentials are invalid, providing fail-fast behavior at startup.
   */
  validateCredentials(): Promise<void>;
}

/**
 * Enum to define the model tier (primary or secondary) for fallback chain positioning
 */
export const LLMModelTier = {
  PRIMARY: "primary",
  SECONDARY: "secondary",
} as const;
export type LLMModelTier = (typeof LLMModelTier)[keyof typeof LLMModelTier];

/**
 * Enum to define the shutdown behavior required by an LLM provider.
 * This abstracts provider-specific shutdown requirements from the consuming code.
 */
export const ShutdownBehavior = {
  /** Provider can be shut down gracefully via close() method */
  GRACEFUL: "graceful",
  /** Provider requires process.exit() due to SDK limitations (e.g., gRPC connections) */
  REQUIRES_PROCESS_EXIT: "requires_process_exit",
} as const;
export type ShutdownBehavior = (typeof ShutdownBehavior)[keyof typeof ShutdownBehavior];

/**
 * Types to define the status types statistics
 */
export interface LLMModelKeysSet {
  embeddingsModelKey: string;
  primaryCompletionModelKey: string;
  secondaryCompletionModelKey?: string;
}

/**
 * Enum to define the LLM task type
 */
export const LLMPurpose = {
  EMBEDDINGS: "embeddings",
  COMPLETIONS: "completions",
} as const;
export type LLMPurpose = (typeof LLMPurpose)[keyof typeof LLMPurpose];

/**
 * Enum to define the desired output format for LLM responses
 */
export enum LLMOutputFormat {
  JSON = "json",
  TEXT = "text",
}

/**
 * Interface for LLM completion options that can be passed to control output format.
 * Generic over the schema type to preserve type information through the call chain.
 *
 * @template S - The Zod schema type. Defaults to z.ZodType for backward compatibility.
 */
export interface LLMCompletionOptions<S extends z.ZodType = z.ZodType> {
  /** Desired output format */
  outputFormat: LLMOutputFormat;
  /** Zod schema for structured output providers that support it */
  jsonSchema?: S;
  /** Whether the response is expected to contain code - defaults to true */
  hasComplexSchema?: boolean;
  /** Optional sanitizer configuration for JSON processing (domain-specific) */
  sanitizerConfig?: import("../config/llm-module-config.types").LLMSanitizerConfig;
}

/**
 * Strongly-typed feature flags for LLM model capabilities and constraints.
 * These flags control provider-specific behavior and parameter handling.
 */
export type LLMModelFeature =
  /** Model requires fixed temperature (cannot be customized) */
  | "fixed_temperature"
  /** Model uses max_completion_tokens parameter instead of max_tokens */
  | "max_completion_tokens";

/**
 * Base interface for LLM model metadata containing all common fields.
 *
 * Notes:
 *  - For Completions LLMs, the total allowed tokens is the sum of the prompt tokens and the
 *    completion tokens.
 *  - For Embeddings LLMs, the total allowed tokens is the amount of prompt tokens only (the
 *    response is a fixed size array of numbers).
 */
interface BaseLLMModelMetadata {
  /** The string identifier for this model */
  readonly modelKey: string;
  /** User-friendly name for the model, defined in its manifest */
  readonly name: string;
  /** Whether this is an embedding or completion model */
  readonly purpose: LLMPurpose;
  /** Number of dimensions for embedding models */
  readonly dimensions?: number;
  /** Maximum completion tokens for completion models */
  readonly maxCompletionTokens?: number;
  /** Normalized model name for use with llm-cost token calculation library */
  /** Maximum total tokens (prompt + completion) */
  readonly maxTotalTokens: number;
  /** Optional array of feature flags indicating model-specific capabilities or constraints */
  readonly features?: readonly LLMModelFeature[];
}

/**
 * Type to define the main characteristics of the LLM model with declarative URN resolution.
 */
export interface LLMModelMetadata extends BaseLLMModelMetadata {
  /** The environment variable key that contains the actual model ID/name used by the provider API */
  readonly urnEnvKey: string;
}

/**
 * Type to define resolved model metadata where URNs are always strings.
 * This is used in LLM implementations after environment resolution.
 */
export interface ResolvedLLMModelMetadata extends BaseLLMModelMetadata {
  /** The actual model ID/name used by the provider API - always a resolved string */
  readonly urn: string;
}

/**
 * Interface to define the context object that is passed to and from the LLM provider
 */
export interface LLMContext {
  /** The resource name being processed */
  resource: string;
  /** The LLM purpose (embeddings or completions) */
  purpose: LLMPurpose;
  /** The model tier being used (primary or secondary) */
  modelTier?: LLMModelTier;
  /** The desired output format */
  outputFormat?: LLMOutputFormat;
  /** Error text when JSON parsing / validating fails during response processing */
  responseContentParseError?: string;
}

/**
 * Enum to define the LLM task type
 */
export const LLMResponseStatus = {
  UNKNOWN: "unknown",
  COMPLETED: "completed",
  EXCEEDED: "exceeded",
  OVERLOADED: "overloaded",
  INVALID: "invalid",
  ERRORED: "error",
} as const;
export type LLMResponseStatus = (typeof LLMResponseStatus)[keyof typeof LLMResponseStatus];

/**
 * Type to define the token counts
 */
export interface LLMResponseTokensUsage {
  readonly promptTokens: number;
  readonly completionTokens: number;
  readonly maxTotalTokens: number;
}

/** Default value for unknown token counts */
const UNKNOWN_TOKEN_COUNT = -1;

/**
 * Creates a standardized token usage record with consistent defaults.
 * This helper normalizes raw (potentially undefined) token counts into a
 * standardized LLMResponseTokensUsage object, ensuring all providers use
 * the same default value (-1) for unknown token counts.
 *
 * @param promptTokens - Number of tokens in the prompt (default: -1)
 * @param completionTokens - Number of tokens in the completion (default: -1)
 * @param maxTotalTokens - Maximum total tokens allowed (default: -1)
 * @returns A standardized LLMResponseTokensUsage object
 */
export function createTokenUsageRecord(
  promptTokens?: number,
  completionTokens?: number,
  maxTotalTokens?: number,
): LLMResponseTokensUsage {
  return {
    promptTokens: promptTokens ?? UNKNOWN_TOKEN_COUNT,
    completionTokens: completionTokens ?? UNKNOWN_TOKEN_COUNT,
    maxTotalTokens: maxTotalTokens ?? UNKNOWN_TOKEN_COUNT,
  };
}

/**
 * Type representing all possible generated content types from LLM responses.
 *
 * This union type covers:
 * - `string`: Raw text responses (TEXT output format)
 * - `Record<string, unknown>`: JSON object responses
 * - `unknown[]`: JSON array responses (e.g., from z.array() schemas)
 * - `null`: Absence of content (error cases, empty responses)
 *
 * Note: `unknown[]` covers all array types including `number[]` (embeddings),
 * `{ name: string }[]` (array of objects), etc. The generic `unknown[]` ensures
 * type compatibility with `T extends LLMGeneratedContent` constraints when T is
 * inferred as a specific array type from a Zod schema.
 *
 * For type-safe JSON value operations, use the type guards from json-value.types.ts
 * (isJsonPrimitive, isJsonObject, isJsonArray, isJsonValue) to narrow types.
 */
export type LLMGeneratedContent = string | Record<string, unknown> | unknown[] | null;

/**
 * Helper type to infer the response data type from LLMCompletionOptions.
 * This type is format-aware and provides stronger type safety:
 * - When outputFormat is JSON with a schema, infers the type from that schema
 * - When outputFormat is JSON without a schema, returns Record<string, unknown>
 * - When outputFormat is TEXT, returns string
 * - Otherwise, defaults to LLMGeneratedContent
 *
 * This enables end-to-end type safety through the LLM call chain by allowing
 * the return type to be inferred from the options passed at the call site.
 */
export type InferResponseType<TOptions extends LLMCompletionOptions> = TOptions extends {
  outputFormat: LLMOutputFormat.JSON;
  jsonSchema: infer S;
}
  ? S extends z.ZodType
    ? z.infer<S>
    : Record<string, unknown>
  : TOptions extends { outputFormat: LLMOutputFormat.TEXT }
    ? string
    : LLMGeneratedContent;

/**
 * Type-safe completion options for JSON output with a schema.
 * Used for discriminated union pattern to enable better type narrowing.
 */
export interface JsonCompletionOptions<
  S extends z.ZodType = z.ZodType,
> extends LLMCompletionOptions<S> {
  outputFormat: LLMOutputFormat.JSON;
  jsonSchema: S;
}

/**
 * Type-safe completion options for TEXT output.
 * Used for discriminated union pattern to enable better type narrowing.
 */
export interface TextCompletionOptions extends Omit<LLMCompletionOptions, "jsonSchema"> {
  outputFormat: LLMOutputFormat.TEXT;
  jsonSchema?: never;
}

/**
 * Type guard to check if options are for JSON output with a schema.
 * Enables TypeScript to narrow the type when checking output format.
 *
 * @param options - The completion options to check
 * @returns True if options specify JSON output with a schema
 *
 * @example
 * ```typescript
 * if (isJsonOptionsWithSchema(options)) {
 *   // TypeScript knows options.jsonSchema exists here
 *   const validated = options.jsonSchema.parse(data);
 * }
 * ```
 */
export function isJsonOptionsWithSchema<S extends z.ZodType>(
  options: LLMCompletionOptions<S> | undefined,
): options is JsonCompletionOptions<S> {
  return (
    options !== undefined &&
    options.outputFormat === LLMOutputFormat.JSON &&
    options.jsonSchema !== undefined
  );
}

/**
 * Type guard to check if options are for TEXT output.
 * Enables TypeScript to narrow the type when checking output format.
 *
 * @param options - The completion options to check
 * @returns True if options specify TEXT output
 *
 * @example
 * ```typescript
 * if (isTextOptions(options)) {
 *   // TypeScript knows this is TEXT output, no schema expected
 *   const result: string = response.generated;
 * }
 * ```
 */
export function isTextOptions(
  options: LLMCompletionOptions | undefined,
): options is TextCompletionOptions {
  return options !== undefined && options.outputFormat === LLMOutputFormat.TEXT;
}

/**
 * Type to define the LLM response with type-safe generated content.
 * The generic type parameter T represents the type of the generated content,
 * which is inferred from the Zod schema when JSON validation is used.
 *
 * @template T - The type of the generated content. Defaults to LLMGeneratedContent for backward compatibility.
 */
export interface LLMFunctionResponse<T = LLMGeneratedContent> {
  readonly status: LLMResponseStatus;
  readonly request: string;
  readonly modelKey: string;
  readonly context: LLMContext;
  readonly generated?: T;
  readonly tokensUsage?: LLMResponseTokensUsage;
  readonly error?: unknown;
  /**
   * Individual repair operations applied to fix JSON issues during processing.
   * Used for determining significance of changes. Contains entries from
   * REPAIR_STEP constants (e.g., "Removed code fences", "coerceStringToArray").
   */
  readonly repairs?: readonly string[];
  /**
   * High-level pipeline step descriptions (which sanitizers/phases ran during JSON processing).
   * Used for logging context about what processing occurred.
   */
  readonly pipelineSteps?: readonly string[];
}

/**
 * Type to define the embedding or completion function.
 *
 * This is a generic function type (not a generic type with a function).
 * The return type is inferred from the `options.jsonSchema` at the call site,
 * enabling type-safe responses without requiring explicit type parameters.
 *
 * Generic over the schema type S directly to simplify type inference through
 * the async call chain, avoiding the need for conditional type extraction.
 *
 * The return type uses z.infer<S> for schema-based inference. For TEXT format
 * or when no schema is provided, the generated content will be string or
 * LLMGeneratedContent at runtime.
 *
 * For embeddings, use LLMEmbeddingFunction instead.
 */
export type LLMFunction = <S extends z.ZodType>(
  content: string,
  context: LLMContext,
  options?: LLMCompletionOptions<S>,
) => Promise<LLMFunctionResponse<z.infer<S>>>;

/**
 * Type for embedding functions that always return number[].
 * Embeddings don't use the schema-based type inference.
 */
export type LLMEmbeddingFunction = (
  content: string,
  context: LLMContext,
  options?: LLMCompletionOptions,
) => Promise<LLMFunctionResponse<number[]>>;

/**
 * A bound LLM function ready for execution with options already applied.
 * Generic over the response data type T, enabling a unified execution pipeline
 * that handles both completions and embeddings.
 *
 * - For completions: T is z.infer<S> where S is the schema type
 * - For embeddings: T is number[]
 *
 * This type allows the execution pipeline to work with a single code path
 * while preserving type safety through the generic parameter.
 */
export type BoundLLMFunction<T> = (
  content: string,
  context: LLMContext,
) => Promise<LLMFunctionResponse<T>>;

/**
 * Type to define a candidate LLM function with its associated metadata.
 * The function uses call-site type inference from options.jsonSchema.
 */
export interface LLMCandidateFunction {
  readonly func: LLMFunction;
  readonly modelTier: LLMModelTier;
  readonly description: string;
}

/**
 * Type definitions for a partucular status
 */
export interface LLMStatsCategoryStatus {
  readonly description: string;
  readonly symbol: string;
  count: number;
}

/**
 * Base interface for LLM statistics categories (excluding computed fields)
 */
export interface LLMStatsCategoriesBase {
  readonly SUCCESS: LLMStatsCategoryStatus;
  readonly FAILURE: LLMStatsCategoryStatus;
  readonly SWITCH: LLMStatsCategoryStatus;
  readonly OVERLOAD_RETRY: LLMStatsCategoryStatus;
  readonly HOPEFUL_RETRY: LLMStatsCategoryStatus;
  readonly CROP: LLMStatsCategoryStatus;
  readonly JSON_MUTATED: LLMStatsCategoryStatus;
}

/**
 * Type to define the status types summary including computed fields
 */
export interface LLMStatsCategoriesSummary extends LLMStatsCategoriesBase {
  readonly TOTAL?: LLMStatsCategoryStatus;
}

/**
 * Type to define the pattern definition for the error messages
 */
export interface LLMErrorMsgRegExPattern {
  readonly pattern: RegExp;
  readonly units: string;
  readonly isMaxFirst: boolean;
}
