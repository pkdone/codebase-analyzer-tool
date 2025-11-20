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
import { bedrockClaudeProviderManifest } from "./bedrock/bedrockClaude/bedrock-claude.manifest";
import { bedrockDeepseekProviderManifest } from "./bedrock/bedrockDeepseek/bedrock-deepseek.manifest";
import { bedrockLlamaProviderManifest } from "./bedrock/bedrockLlama/bedrock-llama.manifest";
import { bedrockMistralProviderManifest } from "./bedrock/bedrockMistral/bedrock-mistral.manifest";
import { bedrockNovaProviderManifest } from "./bedrock/bedrockNova/bedrock-nova.manifest";
import {
  BEDROCK_CLAUDE_FAMILY,
  BEDROCK_DEEPSEEK_FAMILY,
  BEDROCK_LLAMA_FAMILY,
  BEDROCK_MISTRAL_FAMILY,
  BEDROCK_NOVA_FAMILY,
} from "./bedrock/common/bedrock-models.constants";

/**
 * Map of model family names to their provider manifests.
 * The key is the model family identifier (case-insensitive matching is handled in LLMProviderManager).
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
