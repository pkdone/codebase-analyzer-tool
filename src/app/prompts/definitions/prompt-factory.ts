import { DataBlockHeader, PromptDefinition } from "../prompt.types";
import { z } from "zod";

/**
 * Builds a formatted instruction block from a title and a list of instruction parts.
 * The title is formatted with double underscores (__title__) and followed by a newline,
 * then all parts are joined with newlines.
 *
 * This is a local helper function used internally by the config files.
 * Exported for use in sources.config.ts and app-summaries.config.ts.
 *
 * @param title - The title for the instruction block (will be wrapped in __title__)
 * @param parts - Variable number of instruction parts, which can be strings or readonly string arrays
 * @returns A single formatted string with the title and joined parts
 *
 * @example
 * ```typescript
 * buildInstructionBlock(
 *   "Basic Info",
 *   ["Extract name", "Extract kind"],
 *   "Additional instruction"
 * )
 * // Returns: "__Basic Info__\nExtract name\nExtract kind\nAdditional instruction"
 * ```
 */
export function buildInstructionBlock(
  title: string,
  ...parts: (string | readonly string[])[]
): string {
  const flattenedParts = parts.flat();
  if (flattenedParts.length === 0) {
    return `__${title}__`;
  }
  return `__${title}__\n${flattenedParts.join("\n")}`;
}

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
 * @param configMap - The configuration map (e.g., sourceConfigMap, appSummaryConfigMap)
 * @param template - The template string to use for all prompts
 * @param options - Optional builders for schema, contentDesc, and instructions
 * @returns A record mapping keys to PromptDefinition objects with preserved schema types
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
          : "content",
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
