import { LLMErrorMsgRegExPattern } from "../../../types/llm.types";

/**
 * Common error patterns for Vertex AI model providers
 */
export const VERTEXAI_COMMON_ERROR_PATTERNS: LLMErrorMsgRegExPattern[] = [
  // 1. "The input token count (1594712) exceeds the maximum number of tokens allowed (1048576)"
  {
    pattern: /input.*?token.*?count.*?\((\d+)\).*?exceeds.*?maximum.*?tokens.*?allowed.*?\((\d+)\)/,
    units: "tokens",
    isMaxFirst: false,
  },
] as const;
