import { LLMErrorMsgRegExPattern } from "../../../types/llm-stats.types";

/**
 * Common error patterns for Vertex AI model providers.
 * Uses named capture groups for readable, maintainable extraction.
 */
export const VERTEXAI_COMMON_ERROR_PATTERNS: LLMErrorMsgRegExPattern[] = [
  // 1. "The input token count (1594712) exceeds the maximum number of tokens allowed (1048576)"
  {
    pattern:
      /input.*?token.*?count.*?\((?<prompt>\d+)\).*?exceeds.*?maximum.*?tokens.*?allowed.*?\((?<max>\d+)\)/,
    units: "tokens",
  },
] as const;
