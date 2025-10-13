# Test Helpers

This directory contains reusable test utilities organized by domain to support unit and integration testing across the codebase.

## Directory Structure

```
tests/helpers/
├── database/          # Database-related test utilities
│   └── db-test-helper.ts
├── llm/              # LLM and AI-related test utilities
│   ├── bedrock-test-helper.ts
│   └── json-processor-mock.ts
└── README.md
```

## Helpers Overview

### Database Helpers (`database/`)

#### `db-test-helper.ts`
Provides utilities for setting up and tearing down temporary MongoDB databases for integration tests.

**Key Functions:**
- `setupTestDatabase()`: Creates a unique test database with proper schema initialization
- `teardownTestDatabase()`: Cleans up and drops the test database
- `populateTestData()`: Optional helper for pre-populating test data

**Usage:**
```typescript
import { setupTestDatabase, teardownTestDatabase } from "../helpers/database/db-test-helper";

describe("My Integration Test", () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  // Your tests here...
});
```

### LLM Helpers (`llm/`)

#### `bedrock-test-helper.ts`
Utilities for creating mock environments and test data for AWS Bedrock LLM provider tests.

**Key Functions:**
- `createBedrockMockEnv(providerName, embeddingsUrn, primaryUrn, secondaryUrn?)`: Creates mock environment variables
- `createBedrockTestData(manifest, mockEnv, additionalModels?)`: Generates standardized test data from provider manifests

**Usage:**
```typescript
import { createBedrockMockEnv, createBedrockTestData } from "../../../../helpers/llm/bedrock-test-helper";
import { bedrockClaudeProviderManifest } from "../../../../../src/llm/providers/bedrock/bedrockClaude/bedrock-claude.manifest";

const mockEnv = createBedrockMockEnv(
  "BedrockClaude",
  "amazon.titan-embed-text-v1",
  "anthropic.claude-3-5-sonnet-20240620-v1:0"
);

const testData = createBedrockTestData(bedrockClaudeProviderManifest, mockEnv);
```

#### `json-processor-mock.ts`
Factory function for creating mock JsonProcessor instances for testing LLM JSON response handling.

**Key Functions:**
- `createMockJsonProcessor()`: Creates a JsonProcessor instance with logging disabled

**Usage:**
```typescript
import { createMockJsonProcessor } from "../../helpers/llm/json-processor-mock";

const jsonProcessor = createMockJsonProcessor();
```

## Best Practices

1. **Isolation**: Each test helper should be focused on a specific domain or concern
2. **Reusability**: Helpers should be generic enough to be used across multiple test files
3. **Clean Up**: Database helpers must properly clean up resources to prevent test pollution
4. **Type Safety**: All helpers should be fully typed with TypeScript
5. **Documentation**: Keep this README updated when adding new helpers

## Adding New Helpers

When adding a new test helper:

1. Determine the appropriate domain directory (database, llm, etc.)
2. Create the helper file with clear, descriptive function names
3. Add JSDoc comments explaining the purpose and usage
4. Update this README with the new helper's documentation
5. Create unit tests for the helper if it contains complex logic

