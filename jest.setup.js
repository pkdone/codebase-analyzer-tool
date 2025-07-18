// This file sets up Jest environment for testing LLM provider manifests
// Environment variables are mocked to prevent manifest loading errors during tests
const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config();

// Mock environment variables that might be needed during testing
process.env.NODE_ENV = 'test';
process.env.LLM = 'AzureOpenAI';
process.env.CODEBASE_DIR_PATH = "/test/path/petstore1.3.2";
// Use MONGODB_URL from .env if it exists, otherwise use a default
process.env.MONGODB_URL = process.env.MONGODB_URL || "mongodb://localhost:27017/test";
process.env.IGNORE_ALREADY_PROCESSED_FILES = "false";
// OpenAI API variables - sourced from .env
// Azure OpenAI API variables - sourced from .env
// GCP VertexAI API variables - sourced from .env
// AWS Bedrock API variables - sourced from .env