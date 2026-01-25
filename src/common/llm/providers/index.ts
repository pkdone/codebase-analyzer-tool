/**
 * LLM provider manifests and family constants.
 *
 * This module exports all available provider manifests and their family identifiers.
 * The application layer is responsible for constructing the registry of providers
 * it intends to use by selecting from these exports.
 *
 * This design allows consuming applications to:
 * 1. Include only the providers they need (reducing bundle size)
 * 2. Add custom providers without modifying this module
 * 3. Maintain full control over provider initialization
 */

// OpenAI providers
export { openAIProviderManifest, OPENAI_FAMILY } from "./openai/openai/openai.manifest";
export {
  azureOpenAIProviderManifest,
  AZURE_OPENAI_FAMILY,
} from "./openai/azure/azure-openai.manifest";

// Vertex AI providers
export {
  vertexAIGeminiProviderManifest,
  VERTEXAI_GEMINI_FAMILY,
} from "./vertexai/gemini/vertex-ai-gemini.manifest";

// Bedrock providers
export {
  bedrockClaudeProviderManifest,
  BEDROCK_CLAUDE_FAMILY,
} from "./bedrock/claude/bedrock-claude.manifest";
export {
  bedrockDeepseekProviderManifest,
  BEDROCK_DEEPSEEK_FAMILY,
} from "./bedrock/deepseek/bedrock-deepseek.manifest";
export {
  bedrockLlamaProviderManifest,
  BEDROCK_LLAMA_FAMILY,
} from "./bedrock/llama/bedrock-llama.manifest";
export {
  bedrockMistralProviderManifest,
  BEDROCK_MISTRAL_FAMILY,
} from "./bedrock/mistral/bedrock-mistral.manifest";
export {
  bedrockNovaProviderManifest,
  BEDROCK_NOVA_FAMILY,
} from "./bedrock/nova/bedrock-nova.manifest";

// Type exports
export type {
  LLMProviderManifest,
  LLMRetryConfig,
  LLMProviderSpecificConfig,
  ProviderInit,
  LLMImplSpecificResponseSummary,
} from "./llm-provider.types";
