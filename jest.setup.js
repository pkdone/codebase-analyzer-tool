// This file sets up Jest environment for testing LLM provider manifests
// Environment variables are mocked to prevent manifest loading errors during tests
const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config();

// Mock environment variables that might be needed during testing
process.env.NODE_ENV = 'test';
// Note: LLM_COMPLETION_MODEL_CHAIN and LLM_EMBEDDING_MODEL_CHAIN should come from .env to ensure test consistency
// with production configuration. Only set defaults if not already defined in .env
// Format: comma-separated model keys (no provider prefix needed - model keys are globally unique)
process.env.LLM_COMPLETION_MODEL_CHAIN ||= 'vertexai-gemini-3-pro';
process.env.LLM_EMBEDDING_MODEL_CHAIN ||= 'vertexai-gemini-embedding-001';
process.env.CODEBASE_DIR_PATH = "/test/path/petstore1.3.2";
// Use MONGODB_URL from .env if it exists, otherwise use a default
process.env.MONGODB_URL ||= "mongodb://localhost:27017/test";
process.env.SKIP_ALREADY_PROCESSED_FILES = "false";

// Default Model URN environment variables for testing
// VertexAI (used by default chain)
process.env.VERTEXAI_PROJECTID ||= "test-project";
process.env.VERTEXAI_EMBEDDINGS_LOCATION ||= "us-central1";
process.env.VERTEXAI_COMPLETIONS_LOCATION ||= "global";
process.env.VERTEXAI_GEMINI_EMBEDDING_001_MODEL_URN ||= "gemini-embedding-001";
process.env.VERTEXAI_GEMINI_31_PRO_MODEL_URN ||= "gemini-3.1-pro-preview";
process.env.VERTEXAI_GEMINI_3_PRO_MODEL_URN ||= "gemini-3-pro";
process.env.VERTEXAI_GEMINI_25_PRO_MODEL_URN ||= "gemini-2.5-pro";
process.env.VERTEXAI_CLAUDE_OPUS_46_MODEL_URN ||= "claude-opus-4-6@20250514";
process.env.VERTEXAI_CLAUDE_SONNET_46_MODEL_URN ||= "claude-sonnet-4-6";
// OpenAI
process.env.OPENAI_LLM_API_KEY ||= "test-api-key";
process.env.OPENAI_EMBEDDING_3_SMALL_MODEL_URN ||= "text-embedding-3-small";
process.env.OPENAI_GPT5_MODEL_URN ||= "gpt-5";
process.env.OPENAI_GPT4O_MODEL_URN ||= "gpt-4o";
// Azure OpenAI
process.env.AZURE_OPENAI_LLM_API_KEY ||= "test-api-key";
process.env.AZURE_OPENAI_ENDPOINT ||= "https://test.openai.azure.com/";
process.env.AZURE_OPENAI_EMBEDDINGS_MODEL_DEPLOYMENT ||= "test-embeddings";
process.env.AZURE_OPENAI_GPT4O_MODEL_DEPLOYMENT ||= "test-gpt4o-deployment";
process.env.AZURE_OPENAI_GPT4_TURBO_MODEL_DEPLOYMENT ||= "test-gpt4-turbo-deployment";
process.env.AZURE_OPENAI_ADA_EMBEDDINGS_MODEL_URN ||= "text-embedding-ada-002";
process.env.AZURE_OPENAI_GPT4O_MODEL_URN ||= "gpt-4o";
process.env.AZURE_OPENAI_GPT4_TURBO_MODEL_URN ||= "gpt-4-turbo";
// Bedrock (shared Titan embeddings + Claude)
process.env.BEDROCK_TITAN_EMBEDDINGS_MODEL_URN ||= "amazon.titan-embed-text-v1";
process.env.BEDROCK_CLAUDE_OPUS_45_MODEL_URN ||= "global.anthropic.claude-opus-4-5-20251101-v1:0";
process.env.BEDROCK_CLAUDE_OPUS_46_MODEL_URN ||= "us.anthropic.claude-opus-4-6-v1:0";
process.env.BEDROCK_CLAUDE_SONNET_46_MODEL_URN ||= "global.anthropic.claude-sonnet-4-6-v1";
process.env.BEDROCK_CLAUDE_SONNET_45_MODEL_URN ||= "us.anthropic.claude-sonnet-4-5-20250929-v1:0";
process.env.BEDROCK_NOVA_PRO_MODEL_URN ||= "us.amazon.nova-pro-v1:0";
process.env.BEDROCK_NOVA_LITE_MODEL_URN ||= "us.amazon.nova-lite-v1:0";
process.env.BEDROCK_LLAMA_33_70B_MODEL_URN ||= "us.meta.llama3-3-70b-instruct-v1:0";
process.env.BEDROCK_LLAMA_32_90B_MODEL_URN ||= "us.meta.llama3-2-90b-instruct-v1:0";
process.env.BEDROCK_MISTRAL_LARGE_2407_MODEL_URN ||= "mistral.mistral-large-2407-v1:0";
process.env.BEDROCK_MISTRAL_LARGE_2402_MODEL_URN ||= "mistral.mistral-large-2402-v1:0";
process.env.BEDROCK_DEEPSEEK_R1_MODEL_URN ||= "us.deepseek.r1-v1:0";

// Conditional log silencing to reduce test noise unless explicitly requested
if (!process.env.SHOW_TEST_LOGS || process.env.SHOW_TEST_LOGS === 'false') {
	const noop = () => undefined;
	// Preserve original error logging for unexpected failures but silence known noisy channels
	console.warn = noop;
	console.log = noop;
	// Keep console.error but allow opt-in silencing via SHOW_TEST_ERRORS=false
	if (process.env.SHOW_TEST_ERRORS === 'false') {
		console.error = noop;
	}
}