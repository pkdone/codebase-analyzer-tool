import {
  DataBlockHeader,
  DATA_BLOCK_HEADERS,
  PromptDefinition,
  BasePromptConfigEntry,
} from "../prompt.types";
import { z } from "zod";
import { LLMOutputFormat } from "../../../common/llm/types/llm.types";

/**
 * Helper type to extract the schema type from a config entry.
 * Returns z.ZodType if responseSchema is undefined.
 */
type ExtractSchemaType<T> = T extends { responseSchema: infer S extends z.ZodType } ? S : z.ZodType;

/**
 * Mapped type that transforms a config map into a record of PromptDefinitions
 * while preserving the specific schema type for each key.
 */
type PromptMetadataResult<TConfigMap extends Record<string, BasePromptConfigEntry>> = {
  [K in keyof TConfigMap]: PromptDefinition<ExtractSchemaType<TConfigMap[K]>>;
};

/**
 * Options for creating prompt metadata from a configuration map.
 * Simplified to use direct values instead of builder callbacks since
 * configs now contain all necessary data (contentDesc, instructions).
 */
interface CreatePromptMetadataOptions {
  /**
   * The header text for the data block section.
   * Defaults to FILE_SUMMARIES if not provided.
   */
  dataBlockHeader?: DataBlockHeader;
  /**
   * Whether to wrap content in code blocks.
   * Defaults to false if not provided.
   */
  wrapInCodeBlock?: boolean;
}

/**
 * Generic factory function to create prompt metadata from a configuration map.
 * This eliminates duplication between sources and app-summaries prompt generation.
 *
 * The return type uses a mapped type (PromptMetadataResult) to preserve the specific
 * schema type for each key in the config map. This enables better type inference
 * for downstream consumers when accessing prompt definitions by key.
 *
 * This simplified version reads contentDesc and instructions directly from the config
 * entries, since all configs now contain these fields explicitly. This removes the need
 * for builder callbacks and makes the factory a pure data mapper.
 *
 * @param configMap - The configuration map (e.g., sourceConfigMap, appSummaryConfigMap)
 * @param template - The template string to use for all prompts
 * @param options - Optional settings for dataBlockHeader and wrapInCodeBlock
 * @returns A record mapping keys to PromptDefinition objects with preserved schema types
 */
export function createPromptMetadata<TConfigMap extends Record<string, BasePromptConfigEntry>>(
  configMap: TConfigMap,
  template: string,
  options: CreatePromptMetadataOptions = {},
): PromptMetadataResult<TConfigMap> {
  const { dataBlockHeader = DATA_BLOCK_HEADERS.FILE_SUMMARIES, wrapInCodeBlock = false } = options;

  return Object.fromEntries(
    Object.entries(configMap).map(([key, config]) => {
      const typedConfig = config as TConfigMap[keyof TConfigMap];
      const configWithHasComplexSchema = typedConfig as { hasComplexSchema?: boolean };
      const definition: PromptDefinition = {
        label: typedConfig.label,
        contentDesc: typedConfig.contentDesc ?? "content",
        responseSchema: typedConfig.responseSchema ?? z.unknown(),
        template,
        instructions: typedConfig.instructions ?? [],
        dataBlockHeader,
        wrapInCodeBlock,
      };

      // Preserve hasComplexSchema if it exists in the config
      // For sources, default to true when undefined
      if ("hasComplexSchema" in typedConfig) {
        definition.hasComplexSchema = configWithHasComplexSchema.hasComplexSchema ?? true;
      }

      return [key, definition];
    }),
  ) as PromptMetadataResult<TConfigMap>;
}

/**
 * Options for creating a TEXT-mode prompt definition.
 * Excludes responseSchema and outputFormat as these are set automatically.
 */
export type TextPromptDefinitionOptions = Omit<PromptDefinition, "responseSchema" | "outputFormat">;

/**
 * Creates a TEXT-mode prompt definition with standard configuration.
 * TEXT-mode prompts do not require JSON schema validation and return plain text responses.
 *
 * This helper ensures consistent configuration for TEXT-mode prompts:
 * - Sets `responseSchema` to `z.string()` (placeholder for type consistency)
 * - Sets `outputFormat` to `LLMOutputFormat.TEXT`
 *
 * @param options - The prompt definition options (excluding responseSchema and outputFormat)
 * @returns A fully-typed PromptDefinition configured for TEXT output
 *
 * @example
 * ```typescript
 * const queryPrompt = createTextPromptDefinition({
 *   label: "Codebase Query",
 *   contentDesc: "source code files",
 *   instructions: [],
 *   template: CODEBASE_QUERY_TEMPLATE,
 *   dataBlockHeader: "CODE",
 * });
 * ```
 */
export function createTextPromptDefinition(
  options: TextPromptDefinitionOptions,
): PromptDefinition<z.ZodString> {
  return {
    ...options,
    responseSchema: z.string(),
    outputFormat: LLMOutputFormat.TEXT,
  };
}

/**
 * Options for creating a JSON-mode prompt definition.
 * Excludes outputFormat as it is set automatically to JSON.
 */
export type JsonPromptDefinitionOptions<S extends z.ZodType> = Omit<
  PromptDefinition<S>,
  "outputFormat"
>;

/**
 * Creates a JSON-mode prompt definition with standard configuration.
 * JSON-mode prompts require a Zod schema for response validation.
 *
 * This helper ensures consistent configuration for JSON-mode prompts:
 * - Sets `outputFormat` to `LLMOutputFormat.JSON` (default behavior)
 * - Provides default values for optional fields like `wrapInCodeBlock` and `hasComplexSchema`
 *
 * @param options - The prompt definition options (excluding outputFormat)
 * @returns A fully-typed PromptDefinition configured for JSON output
 *
 * @example
 * ```typescript
 * const reducePrompt = createJsonPromptDefinition({
 *   label: "Reduce Insights",
 *   contentDesc: "fragmented data",
 *   instructions: ["consolidate the list"],
 *   responseSchema: mySchema,
 *   template: BASE_PROMPT_TEMPLATE,
 *   dataBlockHeader: "FRAGMENTED_DATA",
 * });
 * ```
 */
export function createJsonPromptDefinition<S extends z.ZodType>(
  options: JsonPromptDefinitionOptions<S>,
): PromptDefinition<S> {
  return {
    wrapInCodeBlock: false,
    hasComplexSchema: false,
    ...options,
    outputFormat: LLMOutputFormat.JSON,
  };
}
