import { DataBlockHeader, PromptDefinition } from "../prompt.types";
import { z } from "zod";
import { LLMOutputFormat } from "../../../common/llm/types/llm.types";

/**
 * Generic configuration entry that must have at least a label.
 * responseSchema is optional because some configs (like sources) build it dynamically.
 * Specific config types can extend this interface.
 *
 * This interface is generic over the schema type S to preserve specific Zod schema types
 * through the type system, enabling better type inference for downstream consumers.
 *
 * @template S - The Zod schema type. Defaults to z.ZodType for backward compatibility.
 */
interface BaseConfigEntry<S extends z.ZodType = z.ZodType> {
  label?: string;
  responseSchema?: S;
}

/**
 * Helper type to extract the schema type from a config entry.
 * Returns z.ZodType if responseSchema is undefined.
 */
type ExtractSchemaType<T> = T extends { responseSchema: infer S extends z.ZodType } ? S : z.ZodType;

/**
 * Mapped type that transforms a config map into a record of PromptDefinitions
 * while preserving the specific schema type for each key.
 */
type PromptMetadataResult<TConfigMap extends Record<string, BaseConfigEntry>> = {
  [K in keyof TConfigMap]: PromptDefinition<ExtractSchemaType<TConfigMap[K]>>;
};

/**
 * Options for creating prompt metadata from a configuration map.
 */
interface CreatePromptMetadataOptions<TConfig extends BaseConfigEntry> {
  /**
   * Optional function to build the response schema from the config.
   * If not provided, uses config.responseSchema directly.
   */
  schemaBuilder?: (config: TConfig) => z.ZodType;
  /**
   * Optional function to build the contentDesc for the PromptDefinition.
   * If not provided, uses a default generic description.
   */
  contentDescBuilder?: (config: TConfig) => string;
  /**
   * Optional function to build the instructions array from the config.
   * If not provided, must be handled by the config type itself.
   */
  instructionsBuilder?: (config: TConfig) => readonly string[];
  /**
   * Optional function to build the dataBlockHeader for the PromptDefinition.
   * If not provided, uses a default value based on the template type.
   */
  dataBlockHeaderBuilder?: (config: TConfig) => DataBlockHeader;
  /**
   * Optional function to determine if content should be wrapped in code blocks.
   * If not provided, defaults to false.
   */
  wrapInCodeBlockBuilder?: (config: TConfig) => boolean;
}

/**
 * Generic factory function to create prompt metadata from a configuration map.
 * This eliminates duplication between sources and app-summaries prompt generation.
 *
 * The return type uses a mapped type (PromptMetadataResult) to preserve the specific
 * schema type for each key in the config map. This enables better type inference
 * for downstream consumers when accessing prompt definitions by key.
 *
 * @param configMap - The configuration map (e.g., sourceConfigMap, appSummaryConfigMap)
 * @param template - The template string to use for all prompts
 * @param options - Optional builders for schema, contentDesc, and instructions
 * @returns A record mapping keys to PromptDefinition objects with preserved schema types
 */
export function createPromptMetadata<TConfigMap extends Record<string, BaseConfigEntry>>(
  configMap: TConfigMap,
  template: string,
  options: CreatePromptMetadataOptions<TConfigMap[keyof TConfigMap]> = {},
): PromptMetadataResult<TConfigMap> {
  const {
    schemaBuilder,
    contentDescBuilder,
    instructionsBuilder,
    dataBlockHeaderBuilder,
    wrapInCodeBlockBuilder,
  } = options;

  return Object.fromEntries(
    Object.entries(configMap).map(([key, config]) => {
      const typedConfig = config as TConfigMap[keyof TConfigMap];
      const configWithHasComplexSchema = typedConfig as { hasComplexSchema?: boolean };
      const definition: PromptDefinition = {
        label: typedConfig.label,
        contentDesc: contentDescBuilder ? contentDescBuilder(typedConfig) : "content",
        responseSchema: schemaBuilder
          ? schemaBuilder(typedConfig)
          : (typedConfig.responseSchema ?? z.unknown()),
        template,
        instructions: instructionsBuilder ? instructionsBuilder(typedConfig) : [],
        dataBlockHeader: dataBlockHeaderBuilder
          ? dataBlockHeaderBuilder(typedConfig)
          : ("FILE_SUMMARIES" as const),
        wrapInCodeBlock: wrapInCodeBlockBuilder ? wrapInCodeBlockBuilder(typedConfig) : false,
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
