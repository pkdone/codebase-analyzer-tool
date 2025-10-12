/**
 * Shared constants for Bedrock model internal keys and environment variable names.
 * These constants are used across multiple Bedrock provider manifests to avoid duplication.
 */

// Shared environment variable name constants
export const BEDROCK_TITAN_EMBEDDINGS_MODEL_KEY = "BEDROCK_TITAN_EMBEDDINGS_MODEL";

// Shared model internal key constants
export const AWS_EMBEDDINGS_TITAN_V1 = "AWS_EMBEDDINGS_TITAN_V1";

// Model family constants
export const BEDROCK_CLAUDE_FAMILY = "BedrockClaude";
export const BEDROCK_LLAMA_FAMILY = "BedrockLlama";
export const BEDROCK_MISTRAL_FAMILY = "BedrockMistral";
export const BEDROCK_NOVA_FAMILY = "BedrockNova";
export const BEDROCK_DEEPSEEK_FAMILY = "BedrockDeepseek";
