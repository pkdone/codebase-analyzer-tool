import { z } from "zod";

/**
 * Base schema for common environment variables
 */
export const baseEnvVarsSchema = z.object({
  MONGODB_URL: z.string().url(),
  CODEBASE_DIR_PATH: z.string().min(1, "CODEBASE_DIR_PATH cannot be empty"),
  SKIP_ALREADY_PROCESSED_FILES: z
    .preprocess((val) => String(val).toLowerCase() === "true", z.boolean())
    .default(false),
  LLM: z.string().min(1, "LLM provider selection cannot be empty"),
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
