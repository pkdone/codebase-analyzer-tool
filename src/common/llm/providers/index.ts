/**
 * Static registry of all available LLM provider manifests.
 * This replaces the filesystem-based dynamic discovery with an explicit, maintainable registry.
 */

import { LLMProviderManifest } from "./llm-provider.types";
import { openAIProviderManifest, OPENAI } from "./openai/openai/openai.manifest";
import {
  azureOpenAIProviderManifest,
  AZURE_OPENAI,
} from "./openai/azureOpenai/azure-openai.manifest";
import {
  vertexAIGeminiProviderManifest,
  VERTEX_GEMINI,
} from "./vertexai/vertex-ai-gemini/vertex-ai-gemini.manifest";
import {
  bedrockClaudeProviderManifest,
  BEDROCK_CLAUDE_FAMILY,
} from "./bedrock/bedrockClaude/bedrock-claude.manifest";
import {
  bedrockDeepseekProviderManifest,
  BEDROCK_DEEPSEEK_FAMILY,
} from "./bedrock/bedrockDeepseek/bedrock-deepseek.manifest";
import {
  bedrockLlamaProviderManifest,
  BEDROCK_LLAMA_FAMILY,
} from "./bedrock/bedrockLlama/bedrock-llama.manifest";
import {
  bedrockMistralProviderManifest,
  BEDROCK_MISTRAL_FAMILY,
} from "./bedrock/bedrockMistral/bedrock-mistral.manifest";
import {
  bedrockNovaProviderManifest,
  BEDROCK_NOVA_FAMILY,
} from "./bedrock/bedrockNova/bedrock-nova.manifest";

/**
 * Map of model family names to their provider manifests.
 * The key is the model family identifier (case-insensitive matching is handled in manifest-loader).
 */
export const LLM_PROVIDER_REGISTRY: ReadonlyMap<string, LLMProviderManifest> = new Map([
  [OPENAI.toLowerCase(), openAIProviderManifest],
  [AZURE_OPENAI.toLowerCase(), azureOpenAIProviderManifest],
  [VERTEX_GEMINI.toLowerCase(), vertexAIGeminiProviderManifest],
  [BEDROCK_CLAUDE_FAMILY.toLowerCase(), bedrockClaudeProviderManifest],
  [BEDROCK_DEEPSEEK_FAMILY.toLowerCase(), bedrockDeepseekProviderManifest],
  [BEDROCK_LLAMA_FAMILY.toLowerCase(), bedrockLlamaProviderManifest],
  [BEDROCK_MISTRAL_FAMILY.toLowerCase(), bedrockMistralProviderManifest],
  [BEDROCK_NOVA_FAMILY.toLowerCase(), bedrockNovaProviderManifest],
]);
