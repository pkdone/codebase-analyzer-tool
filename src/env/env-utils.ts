import { BadConfigurationLLMError } from "../llm/types/llm-errors.types";
import { EnvVars } from "./env.types";

/**
 * Helper to retrieve a required environment variable from the already validated EnvVars object.
 * Even though provider env vars are validated earlier with Zod, this provides a defensive check
 * at the usage site and a clear error message should something become inconsistent.
 */
export function getRequiredEnvVar(env: EnvVars, key: string): string {
  const value = env[key];
  if (typeof value === "string" && value.length > 0) return value;
  throw new BadConfigurationLLMError(
    `Required environment variable '${key}' is missing or not a non-empty string`,
    { key, value },
  );
}
