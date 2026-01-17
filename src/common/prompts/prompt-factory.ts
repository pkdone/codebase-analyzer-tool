/**
 * Factory utilities for creating prompt definitions from configuration maps.
 */

import type { z } from "zod";
import type { RenderablePrompt, PromptConfig } from "./prompt.types";

/**
 * Helper type to extract the schema type from a config entry.
 * Returns z.ZodType if responseSchema is undefined.
 */
type ExtractSchemaType<T> = T extends { responseSchema: infer S extends z.ZodType } ? S : z.ZodType;

/**
 * Mapped type that transforms a config map into a record of RenderablePrompts
 * while preserving the specific schema type for each key.
 */
type PromptMetadataResult<TConfigMap extends Record<string, PromptConfig>> = {
  [K in keyof TConfigMap]: RenderablePrompt<ExtractSchemaType<TConfigMap[K]>>;
};

/**
 * Generic factory function to create prompt metadata from a configuration map.
 * This eliminates duplication between different prompt type generation.
 *
 * The return type uses a mapped type (PromptMetadataResult) to preserve the specific
 * schema type for each key in the config map. This enables better type inference
 * for downstream consumers when accessing prompt definitions by key.
 *
 * This factory is a pure data mapper that transforms config entries into RenderablePrompt
 * objects. All config entries must provide dataBlockHeader and wrapInCodeBlock values.
 *
 * @param configMap - The configuration map containing prompt config entries
 * @param template - The template string to use for all prompts
 * @returns A record mapping keys to RenderablePrompt objects with preserved schema types
 *
 * @example
 * ```typescript
 * const myPrompts = createPromptMetadata(myConfigMap, MY_TEMPLATE);
 * // Each key in myPrompts is a fully typed RenderablePrompt
 * ```
 */
export function createPromptMetadata<TConfigMap extends Record<string, PromptConfig>>(
  configMap: TConfigMap,
  template: string,
): PromptMetadataResult<TConfigMap> {
  return Object.fromEntries(
    Object.entries(configMap).map(([key, config]) => {
      const typedConfig = config as TConfigMap[keyof TConfigMap];
      const definition: RenderablePrompt = {
        label: typedConfig.label,
        contentDesc: typedConfig.contentDesc,
        responseSchema: typedConfig.responseSchema,
        template,
        instructions: typedConfig.instructions,
        dataBlockHeader: typedConfig.dataBlockHeader,
        wrapInCodeBlock: typedConfig.wrapInCodeBlock,
      };
      return [key, definition];
    }),
  ) as PromptMetadataResult<TConfigMap>;
}
