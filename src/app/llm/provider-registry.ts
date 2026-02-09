/**
 * Application-specific LLM provider registry.
 *
 * This module constructs the registry of LLM providers that this application uses.
 * The registry is injected into the LLM module configuration, allowing the common
 * LLM layer to remain decoupled from specific provider implementations.
 *
 * To add or remove providers, modify the map entries below.
 */

import type { LLMProviderRegistry } from "../../common/llm/config/llm-module-config.types";

// Import all provider manifests and family constants
import {
  openAIProviderManifest,
  OPENAI_FAMILY,
} from "../../common/llm/providers/openai/openai/openai.manifest";
import {
  azureOpenAIProviderManifest,
  AZURE_OPENAI_FAMILY,
} from "../../common/llm/providers/openai/azure/azure-openai.manifest";
import {
  vertexAIGeminiProviderManifest,
  VERTEXAI_GEMINI_FAMILY,
} from "../../common/llm/providers/vertexai/gemini/vertex-ai-gemini.manifest";
import {
  vertexAIClaudeProviderManifest,
  VERTEXAI_CLAUDE_FAMILY,
} from "../../common/llm/providers/vertexai/claude/vertex-ai-claude.manifest";
import {
  bedrockClaudeProviderManifest,
  BEDROCK_CLAUDE_FAMILY,
} from "../../common/llm/providers/bedrock/claude/bedrock-claude.manifest";
import {
  bedrockDeepseekProviderManifest,
  BEDROCK_DEEPSEEK_FAMILY,
} from "../../common/llm/providers/bedrock/deepseek/bedrock-deepseek.manifest";
import {
  bedrockLlamaProviderManifest,
  BEDROCK_LLAMA_FAMILY,
} from "../../common/llm/providers/bedrock/llama/bedrock-llama.manifest";
import {
  bedrockMistralProviderManifest,
  BEDROCK_MISTRAL_FAMILY,
} from "../../common/llm/providers/bedrock/mistral/bedrock-mistral.manifest";
import {
  bedrockNovaProviderManifest,
  BEDROCK_NOVA_FAMILY,
} from "../../common/llm/providers/bedrock/nova/bedrock-nova.manifest";

/**
 * Registry of all LLM providers used by this application.
 * Provider family identifiers are stored in lowercase for case-insensitive lookup.
 */
export const APP_PROVIDER_REGISTRY: LLMProviderRegistry = new Map([
  [OPENAI_FAMILY.toLowerCase(), openAIProviderManifest],
  [AZURE_OPENAI_FAMILY.toLowerCase(), azureOpenAIProviderManifest],
  [VERTEXAI_GEMINI_FAMILY.toLowerCase(), vertexAIGeminiProviderManifest],
  [VERTEXAI_CLAUDE_FAMILY.toLowerCase(), vertexAIClaudeProviderManifest],
  [BEDROCK_CLAUDE_FAMILY.toLowerCase(), bedrockClaudeProviderManifest],
  [BEDROCK_DEEPSEEK_FAMILY.toLowerCase(), bedrockDeepseekProviderManifest],
  [BEDROCK_LLAMA_FAMILY.toLowerCase(), bedrockLlamaProviderManifest],
  [BEDROCK_MISTRAL_FAMILY.toLowerCase(), bedrockMistralProviderManifest],
  [BEDROCK_NOVA_FAMILY.toLowerCase(), bedrockNovaProviderManifest],
]);
