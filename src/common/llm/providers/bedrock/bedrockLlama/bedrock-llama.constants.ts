/**
 * Constants for AWS Bedrock Llama LLM provider.
 * Contains chat template tokens and formatting constants specific to Llama models.
 */

/**
 * Beginning of text token for Llama chat format.
 */
export const LLAMA_BEGIN_TOKEN = "<|begin_of_text|>";

/**
 * Header start token for Llama chat format.
 */
export const LLAMA_HEADER_START_TOKEN = "<|start_header_id|>";

/**
 * Header end token for Llama chat format.
 */
export const LLAMA_HEADER_END_TOKEN = "<|end_header_id|>";

/**
 * End of turn token for Llama chat format.
 */
export const LLAMA_EOT_TOKEN = "<|eot_id|>";

/**
 * Default system message for Llama completions.
 * Sets the assistant context for software engineering tasks.
 */
export const LLAMA_SYSTEM_MESSAGE =
  "You are a helpful software engineering and programming assistant, and you need to answer the question given without attempting to fill in any blanks in the question";

