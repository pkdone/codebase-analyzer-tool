import { LLMErrorMsgRegExPattern } from "../../llm.types";

/**
 * Common error patterns for OpenAI model providers
 */
export const OPENAI_COMMON_ERROR_PATTERNS: LLMErrorMsgRegExPattern[] = [
  // 1. "This model's maximum context length is 8191 tokens, however you requested 10346 tokens (10346 in your prompt; 5 for the completion). Please reduce your prompt; or completion length.",
  {
    pattern: /max.*?(\d+) tokens.*?\(.*?(\d+).*?prompt.*?(\d+).*?completion/,
    units: "tokens",
    isMaxFirst: true,
  },
  // 2. "This model's maximum context length is 8192 tokens. However, your messages resulted in 8545 tokens. Please reduce the length of the messages."
  { pattern: /max.*?(\d+) tokens.*?(\d+) /, units: "tokens", isMaxFirst: true },
] as const;
