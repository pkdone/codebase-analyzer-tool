import { LLMErrorMsgRegExPattern } from "../../../types/llm-stats.types";

/**
 * Error patterns for Vertex AI Claude model providers.
 * Uses named capture groups for readable, maintainable extraction.
 */
export const VERTEXAI_CLAUDE_ERROR_PATTERNS: LLMErrorMsgRegExPattern[] = [
  // 1. "prompt is too long: X tokens > Y maximum"
  {
    pattern: /prompt is too long:\s*(?<prompt>\d+)\s*tokens\s*>\s*(?<max>\d+)\s*maximum/i,
    units: "tokens",
  },
  // 2. "exceeds maximum context length" style errors
  {
    pattern:
      /exceeds.*?maximum.*?context.*?(?:length|tokens)?.*?(?<prompt>\d+).*?(?<max>\d+)|(?<max2>\d+).*?context.*?(?<prompt2>\d+)/i,
    units: "tokens",
  },
  // 3. "request too large" with token counts
  {
    pattern: /request.*?too large.*?(?<prompt>\d+).*?tokens.*?(?<max>\d+)/i,
    units: "tokens",
  },
] as const;
