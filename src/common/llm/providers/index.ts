/**
 * Static registry of all available LLM provider manifests.
 */

import { LLMProviderManifest } from "./llm-provider.types";
import { openAIProviderManifest, OPENAI_FAMILY } from "./openai/openai/openai.manifest";
import {
  azureOpenAIProviderManifest,
  AZURE_OPENAI_FAMILY,
} from "./openai/azure/azure-openai.manifest";
import {
  vertexAIGeminiProviderManifest,
  VERTEXAI_GEMINI_FAMILY,
} from "./vertexai/gemini/vertex-ai-gemini.manifest";
import {
  bedrockClaudeProviderManifest,
  BEDROCK_CLAUDE_FAMILY,
} from "./bedrock/claude/bedrock-claude.manifest";
import {
  bedrockDeepseekProviderManifest,
  BEDROCK_DEEPSEEK_FAMILY,
} from "./bedrock/deepseek/bedrock-deepseek.manifest";
import {
  bedrockLlamaProviderManifest,
  BEDROCK_LLAMA_FAMILY,
} from "./bedrock/llama/bedrock-llama.manifest";
import {
  bedrockMistralProviderManifest,
  BEDROCK_MISTRAL_FAMILY,
} from "./bedrock/mistral/bedrock-mistral.manifest";
import {
  bedrockNovaProviderManifest,
  BEDROCK_NOVA_FAMILY,
} from "./bedrock/nova/bedrock-nova.manifest";

/**
 * Map of provider family identifiers to their provider manifests.
 * The key is the provider family identifier (case-insensitive matching is handled in manifest-loader).
 */
export const LLM_PROVIDER_REGISTRY: ReadonlyMap<string, LLMProviderManifest> = new Map([
  [OPENAI_FAMILY.toLowerCase(), openAIProviderManifest],
  [AZURE_OPENAI_FAMILY.toLowerCase(), azureOpenAIProviderManifest],
  [VERTEXAI_GEMINI_FAMILY.toLowerCase(), vertexAIGeminiProviderManifest],
  [BEDROCK_CLAUDE_FAMILY.toLowerCase(), bedrockClaudeProviderManifest],
  [BEDROCK_DEEPSEEK_FAMILY.toLowerCase(), bedrockDeepseekProviderManifest],
  [BEDROCK_LLAMA_FAMILY.toLowerCase(), bedrockLlamaProviderManifest],
  [BEDROCK_MISTRAL_FAMILY.toLowerCase(), bedrockMistralProviderManifest],
  [BEDROCK_NOVA_FAMILY.toLowerCase(), bedrockNovaProviderManifest],
]);
