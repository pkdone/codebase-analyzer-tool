/**
 * Interface representing the result of a sanitizer operation.
 */
export interface SanitizerResult {
  content: string;
  changed: boolean;
  description?: string;
  /**
   * Optional array of repair messages providing details about specific
   * patterns matched and changes made by this sanitizer.
   * Useful for debugging JSON processing issues.
   */
  repairs?: string[];
}

/**
 * Type definition for a sanitizer function.
 */
export type Sanitizer = (
  input: string,
  config?: import("../../config/llm-module-config.types").LLMSanitizerConfig,
) => SanitizerResult;

/**
 * Type definition for a schema fixing transformation function.
 * These operate on the parsed object structure rather than raw strings,
 * and are applied after successful JSON.parse when initial validation fails
 * to normalize and correct parsed data to help it pass schema validation.
 */
export type SchemaFixingTransform = (
  data: unknown,
  config?: import("../../config/llm-module-config.types").LLMSanitizerConfig,
) => unknown;
