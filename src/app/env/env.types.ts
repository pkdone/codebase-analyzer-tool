import { z } from "zod";
import { getProviderFamilyForModelKey } from "../../common/llm/utils/model-registry";

/**
 * Validates a comma-separated model chain format: "modelKey,modelKey,..."
 * Each entry must be a non-empty model key. Model keys must be globally unique
 * across all providers, so no provider prefix is needed.
 */
const modelChainSchema = z
  .string()
  .min(1, "Model chain cannot be empty")
  .refine(
    (val) => {
      const entries = val.split(",").map((s) => s.trim());
      return entries.every((entry) => entry.length > 0);
    },
    {
      message:
        'Invalid model chain format. Expected comma-separated model keys (e.g., "gemini-3-pro,bedrock-claude-opus-4.5")',
    },
  );

/**
 * Base schema for common environment variables
 */
export const baseEnvVarsSchema = z.object({
  MONGODB_URL: z.string().url(),
  CODEBASE_DIR_PATH: z.string().min(1, "CODEBASE_DIR_PATH cannot be empty"),
  SKIP_ALREADY_PROCESSED_FILES: z
    .preprocess((val) => String(val).toLowerCase() === "true", z.boolean())
    .default(false),
  LLM_COMPLETIONS: modelChainSchema,
  LLM_EMBEDDINGS: modelChainSchema,
});

export type BaseEnvVars = z.infer<typeof baseEnvVarsSchema>;

/**
 * Valid types that can be produced by dotenv and Zod parsing.
 * Environment variables are strings by default, but Zod can transform
 * them to numbers or booleans via preprocessing.
 */
type EnvVarValue = string | number | boolean | undefined;

/**
 * Represents the fully parsed environment variables, including provider-specific ones.
 * The actual shape depends on the dynamically constructed schema in bootstrap.ts.
 * Uses EnvVarValue constraint to ensure only valid parsed types are allowed.
 */
export type EnvVars = BaseEnvVars & Record<string, EnvVarValue>;

/**
 * Parsed model chain entry
 */
export interface ParsedModelChainEntry {
  providerFamily: string;
  modelKey: string;
}

/**
 * Parse a model chain string into an array of entries.
 * Provider families are automatically looked up from the global model registry
 * based on the unique model key.
 *
 * @param chainStr The chain string in format "modelKey,modelKey,..."
 * @returns Array of parsed chain entries with provider families resolved
 * @throws {LLMError} If any model key is not found in the registry
 */
export function parseModelChain(chainStr: string): ParsedModelChainEntry[] {
  return chainStr.split(",").map((entry) => {
    const modelKey = entry.trim();
    const providerFamily = getProviderFamilyForModelKey(modelKey);
    return {
      providerFamily,
      modelKey,
    };
  });
}

/**
 * Get unique provider families from a model chain.
 *
 * @param entries The parsed model chain entries
 * @returns Array of unique provider family names
 */
export function getUniqueProviderFamilies(entries: ParsedModelChainEntry[]): string[] {
  return [...new Set(entries.map((e) => e.providerFamily))];
}
