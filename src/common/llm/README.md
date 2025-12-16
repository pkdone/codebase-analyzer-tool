# LLM Module

A standalone, reusable TypeScript module for interacting with various Large Language Model (LLM) providers with built-in resilience, retry logic, and JSON response processing.

## Overview

This module provides a unified interface for working with multiple LLM providers (OpenAI, Azure OpenAI, AWS Bedrock, Google Vertex AI) with automatic fallback, retry mechanisms, and sophisticated JSON response sanitization.

**Key Features:**
- **Multi-Provider Support**: Unified interface for OpenAI, Azure OpenAI, AWS Bedrock (Claude, Llama, Mistral, Nova, Deepseek), and Google Vertex AI Gemini
- **Framework-Agnostic**: No dependency injection framework required - use standalone or integrate with any DI system
- **Resilient Execution**: Built-in retry with exponential backoff and automatic provider fallback
- **JSON Processing**: Sophisticated sanitization and validation of LLM JSON responses
- **Type-Safe**: Full TypeScript support with schema-driven type inference
- **Configurable**: Externalize all configuration through simple interfaces

## Quick Start

### Installation

The module is self-contained within `src/common/llm`. No additional dependencies beyond those in the parent project.

### Basic Usage

```typescript
import { createLLMRouter, LLMModuleConfig } from './common/llm/llm-factory';

// 1. Define configuration
const config: LLMModuleConfig = {
  modelFamily: "OpenAI",
  errorLogging: {
    errorLogDirectory: "output/errors",
    errorLogFilenameTemplate: "error-{timestamp}.log",
  },
  envVars: {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OPENAI_MODEL_PRIMARY: "gpt-4-turbo",
    // ... other required env vars
  },
};

// 2. Create router
const { router, stats } = createLLMRouter({ config });

// 3. Execute completion
const result = await router.executeCompletion(
  "Explain quantum computing",
  { resourceName: "quantum-explanation" },
  { jsonSchema: myResponseSchema }
);
```

### With Custom Sanitization

```typescript
const config: LLMModuleConfig = {
  modelFamily: "OpenAI",
  errorLogging: { /* ... */ },
  sanitizer: {
    propertyNameMappings: {
      "abbrev": "fullPropertyName",
    },
    numericProperties: ["count", "total"],
    // ... other sanitization rules
  },
  envVars: { /* ... */ },
};
```

## Architecture

```
LLM Module
├── config/                    # Configuration types
│   └── llm-module-config.types.ts
├── llm-factory.ts            # Factory for standalone instantiation
├── llm-router.ts             # Main entry point - routes to providers
├── llm-execution-pipeline.ts # Orchestrates retry/fallback/adaptation
├── providers/                # Provider implementations
│   ├── abstract-llm.ts       # Base class for all providers
│   ├── openai/               # OpenAI & Azure OpenAI
│   ├── bedrock/              # AWS Bedrock (Claude, Llama, etc.)
│   └── vertexai/             # Google Vertex AI Gemini
├── strategies/               # Execution strategies
│   ├── retry-strategy.ts     # Retry with exponential backoff
│   ├── fallback-strategy.ts  # Provider fallback logic
│   └── prompt-adaptation-strategy.ts  # Token limit adaptation
├── json-processing/          # JSON sanitization & validation
│   ├── core/                 # Main processing pipeline
│   ├── sanitizers/           # Text sanitizers
│   └── transforms/           # Post-parse transforms
└── utils/                    # Utilities (schema, chunking, etc.)
```

## Configuration

### LLMModuleConfig

```typescript
interface LLMModuleConfig {
  modelFamily: string;                    // e.g., "OpenAI", "BedrockClaude"
  errorLogging: LLMErrorLoggingConfig;    // Error log configuration
  sanitizer?: LLMSanitizerConfig;         // Optional JSON sanitization rules
  envVars: Record<string, string>;        // Environment variables
}
```

### Required Environment Variables

Varies by provider. Examples:

**OpenAI:**
- `OPENAI_API_KEY`
- `OPENAI_MODEL_PRIMARY`
- `OPENAI_MODEL_SECONDARY` (optional)

**AWS Bedrock:**
- `BEDROCK_REGION`
- `BEDROCK_MODEL_PRIMARY`
- AWS credentials (via SDK default credential chain)

**Vertex AI:**
- `VERTEX_AI_PROJECT`
- `VERTEX_AI_LOCATION`
- `VERTEX_AI_MODEL_PRIMARY`

## Provider Manifests

Each provider is defined by a manifest that declares:
- Model metadata (URNs, token limits, capabilities)
- Error patterns for resilient parsing
- Factory function for instantiation

See `src/common/llm/providers/*/manifest.ts` for examples.

## JSON Processing

The module includes sophisticated JSON sanitization to handle common LLM response issues:
- Truncated property names
- Unquoted property names
- String concatenation expressions  
- Invalid literals (`undefined`, corrupted numbers)
- Unescaped quotes
- Malformed structures

Configure via `LLMSanitizerConfig` or use defaults.

## Integration Examples

### Standalone (No DI)

```typescript
const { router } = createLLMRouter({ config: myConfig });
```

### With Dependency Injection (tsyringe example)

```typescript
// In your DI registration module
import { createLLMRouter } from './common/llm/llm-factory';
import { buildLLMModuleConfig } from './config/llm-config-builder';

const envVars = container.resolve<EnvVars>(tokens.EnvVars);
const llmConfig = buildLLMModuleConfig(envVars, "OpenAI");
const { router, stats } = createLLMRouter({ config: llmConfig });

container.registerInstance(tokens.LLMRouter, router);
container.registerInstance(tokens.LLMStats, stats);
```

## Testing

The module is designed to be testable without a DI container. Create test configurations and mock dependencies as needed:

```typescript
const testConfig: LLMModuleConfig = {
  modelFamily: "TEST",
  errorLogging: {
    errorLogDirectory: "test-output",
    errorLogFilenameTemplate: "test-{timestamp}.log",
  },
  envVars: { /* mock env vars */ },
};

const { router } = createLLMRouter({ config: testConfig });
```

## Migration from DI-Coupled Version

If migrating from the previous DI-coupled version:

1. Replace `container.resolve(llmTokens.LLMRouter)` with `createLLMRouter({ config })`
2. Build `LLMModuleConfig` from your application's configuration
3. Register the returned router instance in your DI container if needed

## License

See project root LICENSE file.

## Contributing

This module is framework-agnostic and should remain free of application-specific dependencies. When adding features:
- Keep configuration external via `LLMModuleConfig`
- Avoid hardcoded values
- Maintain provider manifest pattern for extensibility

