import { z } from "zod";

/**
 * Validates a comma-separated model chain format: "Provider:modelKey,Provider:modelKey,..."
 * Each entry must be in the format "ProviderFamily:modelKey".
 */
const modelChainSchema = z
  .string()
  .min(1, "Model chain cannot be empty")
  .refine(
    (val) => {
      const entries = val.split(",").map((s) => s.trim());
      return entries.every((entry) => {
        const parts = entry.split(":");
        return parts.length === 2 && parts[0].length > 0 && parts[1].length > 0;
      });
    },
    {
      message:
        'Invalid model chain format. Expected comma-separated "Provider:modelKey" entries (e.g., "VertexAIGemini:gemini-3-pro,BedrockClaude:claude-opus-4.5")',
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
 *
 * @param chainStr The chain string in format "Provider:modelKey,Provider:modelKey,..."
 * @returns Array of parsed chain entries
 */
export function parseModelChain(chainStr: string): ParsedModelChainEntry[] {
  return chainStr.split(",").map((entry) => {
    const trimmed = entry.trim();
    const colonIndex = trimmed.indexOf(":");
    return {
      providerFamily: trimmed.substring(0, colonIndex),
      modelKey: trimmed.substring(colonIndex + 1),
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
