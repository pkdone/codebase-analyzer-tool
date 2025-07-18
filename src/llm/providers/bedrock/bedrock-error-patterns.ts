import { LLMErrorMsgRegExPattern } from "../../llm.types";

/**
 * Common error patterns for Bedrock model providers
 */
export const BEDROCK_COMMON_ERROR_PATTERNS: LLMErrorMsgRegExPattern[] = [
  // 1. "ValidationException: 400 Bad Request: Too many input tokens. Max input tokens: 8192, request input token count: 9279 "
  {
    pattern: /ax input tokens.*?(\d+).*?request input token count.*?(\d+)/,
    units: "tokens",
    isMaxFirst: true,
  },
  // 2. "ValidationException: Malformed input request: expected maxLength: 50000, actual: 52611, please reformat your input and try again."
  { pattern: /maxLength.*?(\d+).*?actual.*?(\d+)/, units: "chars", isMaxFirst: true },
  // 3. "ValidationException: This model's maximum context length is 8192 tokens. Please reduce the length of the prompt"
  { pattern: /maximum context length is ?(\d+) tokens/, units: "tokens", isMaxFirst: true },
  // 4. "ValidationException. Prompt contains 235396 tokens and 0 draft tokens, too large for model with 131072 maximum context length"
  {
    pattern: /Prompt contains (\d+) tokens.*?too large for model with (\d+) maximum context length/,
    units: "tokens",
    isMaxFirst: false,
  },
] as const;
