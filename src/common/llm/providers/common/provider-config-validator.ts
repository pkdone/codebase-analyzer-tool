import { z } from "zod";
import { LLMError, LLMErrorCode } from "../../types/llm-errors.types";

/**
 * Result of creating a provider config validator.
 * Contains both a type guard and an assertion function for the config type.
 *
 * @template T - The validated config type
 */
export interface ProviderConfigValidator<T> {
  /**
   * Type guard that checks if an object is a valid config.
   * @param obj - The object to validate
   * @returns True if the object matches the schema
   */
  readonly isValid: (obj: unknown) => obj is T;

  /**
   * Asserts that an object is a valid config, throwing if invalid.
   * Provides detailed error messages listing missing/invalid fields.
   * @param obj - The object to validate
   * @returns The validated config
   * @throws LLMError with BAD_CONFIGURATION code if validation fails
   */
  readonly assert: (obj: unknown) => T;
}

/**
 * Creates a provider config validator from a Zod schema.
 *
 * This factory generates standardized type guard and assertion functions
 * that follow consistent patterns across all LLM providers. It eliminates
 * the need for manual validation code and ensures consistent error messages.
 *
 * @param schema - The Zod schema defining the config structure
 * @param configName - Human-readable name for error messages (e.g., "OpenAI", "Azure OpenAI")
 * @returns An object with isValid type guard and assert functions
 *
 * @example
 * ```typescript
 * const OpenAIConfigSchema = z.object({
 *   apiKey: z.string().min(1),
 * });
 *
 * type OpenAIConfig = z.infer<typeof OpenAIConfigSchema>;
 *
 * const { isValid: isOpenAIConfig, assert: assertOpenAIConfig } =
 *   createProviderConfigValidator(OpenAIConfigSchema, "OpenAI");
 *
 * // Type guard usage
 * if (isOpenAIConfig(config)) {
 *   // config is typed as OpenAIConfig
 * }
 *
 * // Assertion usage
 * const validConfig = assertOpenAIConfig(config);
 * ```
 */
export function createProviderConfigValidator<T>(
  schema: z.ZodType<T>,
  configName: string,
): ProviderConfigValidator<T> {
  return {
    isValid(obj: unknown): obj is T {
      return schema.safeParse(obj).success;
    },
    assert(obj: unknown): T {
      if (!obj || typeof obj !== "object") {
        throw new LLMError(
          LLMErrorCode.BAD_CONFIGURATION,
          `Invalid ${configName} configuration - expected an object`,
        );
      }

      const result = schema.safeParse(obj);

      if (result.success) {
        // Merge parsed result (with defaults) with extra properties from original object
        // This preserves backward compatibility while applying schema defaults
        return { ...obj, ...result.data };
      }

      // Extract field-level errors for detailed message
      const fieldErrors = result.error.issues
        .map((issue) => {
          const path = issue.path.join(".");
          return path ? `${path}: ${issue.message}` : issue.message;
        })
        .join(", ");
      throw new LLMError(
        LLMErrorCode.BAD_CONFIGURATION,
        `Invalid ${configName} configuration - ${fieldErrors}`,
      );
    },
  };
}
