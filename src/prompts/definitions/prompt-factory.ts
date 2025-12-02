import { DataBlockHeader, PromptDefinition } from "../prompt.types";
import { z } from "zod";

/**
 * Generic configuration entry that must have at least a label.
 * responseSchema is optional because some configs (like sources) build it dynamically.
 * Specific config types can extend this interface.
 */
interface BaseConfigEntry {
  label?: string;
  responseSchema?: z.ZodType;
}

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
   * If not provided, uses a default generic value.
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
 * @param configMap - The configuration map (e.g., sourceConfigMap, appSummaryConfigMap)
 * @param template - The template string to use for all prompts
 * @param options - Optional builders for schema, contentDesc, and instructions
 * @returns A record mapping keys to PromptDefinition objects
 */
export function createPromptMetadata<TKey extends string, TConfig extends BaseConfigEntry>(
  configMap: Record<TKey, TConfig>,
  template: string,
  options: CreatePromptMetadataOptions<TConfig> = {},
): Record<TKey, PromptDefinition> {
  const {
    schemaBuilder,
    contentDescBuilder,
    instructionsBuilder,
    dataBlockHeaderBuilder,
    wrapInCodeBlockBuilder,
  } = options;

  return Object.fromEntries(
    Object.entries(configMap).map(([key, config]) => {
      const typedConfig = config as TConfig;
      const configWithHasComplexSchema = typedConfig as { hasComplexSchema?: boolean };
      const definition: PromptDefinition = {
        label: typedConfig.label,
        contentDesc: contentDescBuilder
          ? contentDescBuilder(typedConfig)
          : "a set of source file summaries",
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
  ) as Record<TKey, PromptDefinition>;
}
