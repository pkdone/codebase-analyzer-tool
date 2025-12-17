import { z } from "zod";

/**
 * Zod schema for Bedrock Llama provider-specific configuration.
 * Validates that the providerSpecificConfig contains all required fields,
 * including the maxGenLenCap property needed for the CAP_MAX_GEN_LEN feature.
 */
export const BedrockLlamaProviderConfigSchema = z.object({
  requestTimeoutMillis: z.number().int().positive(),
  maxRetryAttempts: z.number().int().nonnegative(),
  minRetryDelayMillis: z.number().int().nonnegative(),
  maxRetryDelayMillis: z.number().int().nonnegative(),
  maxGenLenCap: z.number().int().positive(),
});
