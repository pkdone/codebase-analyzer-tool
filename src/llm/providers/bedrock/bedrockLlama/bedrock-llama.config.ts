/**
 * Configuration constants for AWS Bedrock Llama models.
 * Contains chat template tokens and formatting constants specific to Llama.
 */
export const bedrockLlamaConfig = {
  /**
   * Llama chat template tokens
   * These special tokens are used to format prompts for Llama models
   */
  LLAMA_BEGIN_TOKEN: "<|begin_of_text|>",
  LLAMA_HEADER_START_TOKEN: "<|start_header_id|>",
  LLAMA_HEADER_END_TOKEN: "<|end_header_id|>",
  LLAMA_EOT_TOKEN: "<|eot_id|>",

  /**
   * Llama system prompt template
   * Default system message for Llama models
   */
  LLAMA_SYSTEM_MESSAGE:
    "You are a helpful software engineering and programming assistant, and you need to answer the question given without attempting to fill in any blanks in the question",
} as const;
