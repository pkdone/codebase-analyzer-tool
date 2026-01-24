import { LLMErrorMsgRegExPattern } from "../../../types/llm-stats.types";

/**
 * Common error patterns for Bedrock model providers.
 * Uses named capture groups for readable, maintainable extraction.
 */
export const BEDROCK_COMMON_ERROR_PATTERNS = [
  // 1. "ValidationException: 400 Bad Request: Too many input tokens. Max input tokens: 8192, request input token count: 9279"
  {
    pattern: /ax input tokens.*?(?<max>\d+).*?request input token count.*?(?<prompt>\d+)/,
    units: "tokens",
  },
  // 2. "ValidationException: Malformed input request: expected maxLength: 50000, actual: 52611, please reformat your input and try again."
  {
    pattern: /maxLength.*?(?<charLimit>\d+).*?actual.*?(?<charPrompt>\d+)/,
    units: "chars",
  },
  // 3. "ValidationException: This model's maximum context length is 8192 tokens. Please reduce the length of the prompt"
  {
    pattern: /maximum context length is ?(?<max>\d+) tokens/,
    units: "tokens",
  },
  // 4. "ValidationException. Prompt contains 235396 tokens and 0 draft tokens, too large for model with 131072 maximum context length"
  {
    pattern:
      /Prompt contains (?<prompt>\d+) tokens.*?too large for model with (?<max>\d+) maximum context length/,
    units: "tokens",
  },
] as const satisfies readonly LLMErrorMsgRegExPattern[];
