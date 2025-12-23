import {
  LLMPurpose,
  ResolvedLLMModelMetadata,
  LLMResponseTokensUsage,
  LLMContext,
  LLMOutputFormat,
  LLMResponseStatus,
} from "../../../../src/common/llm/types/llm.types";
import { SANITIZATION_STEP } from "../../../../src/common/llm/json-processing/sanitizers";
import {
  LLMImplSpecificResponseSummary,
  LLMProviderManifest,
  ProviderInit,
} from "../../../../src/common/llm/providers/llm-provider.types";
import AbstractLLM from "../../../../src/common/llm/providers/abstract-llm";
import { AWS_COMPLETIONS_LLAMA_V31_405B_INSTRUCT } from "../../../../src/common/llm/providers/bedrock/bedrockLlama/bedrock-llama.manifest";
import { createMockErrorLogger } from "../../helpers/llm/mock-error-logger";
import { z } from "zod";

// Test-only constants
const GPT_COMPLETIONS_GPT4_32k = "GPT_COMPLETIONS_GPT4_32k";
const GPT_EMBEDDINGS_GPT4 = "GPT_EMBEDDINGS_GPT4";

// Test models metadata for generic token extraction tests
const testModelsMetadata: Record<string, ResolvedLLMModelMetadata> = {
  [GPT_COMPLETIONS_GPT4_32k]: {
    modelKey: GPT_COMPLETIONS_GPT4_32k,
    name: "GPT-4 32k",
    urn: "gpt-4-32k",
    purpose: LLMPurpose.COMPLETIONS,
    maxCompletionTokens: 4096,
    maxTotalTokens: 32768,
  },
  [AWS_COMPLETIONS_LLAMA_V31_405B_INSTRUCT]: {
    modelKey: AWS_COMPLETIONS_LLAMA_V31_405B_INSTRUCT,
    name: "Llama 3.1 405B",
    urn: "meta.llama3-1-405b-instruct-v1:0",
    purpose: LLMPurpose.COMPLETIONS,
    maxCompletionTokens: 4096,
    maxTotalTokens: 128000,
  },
  [GPT_EMBEDDINGS_GPT4]: {
    modelKey: GPT_EMBEDDINGS_GPT4,
    name: "text-embedding-ada-002",
    urn: "text-embedding-ada-002",
    purpose: LLMPurpose.EMBEDDINGS,
    maxCompletionTokens: 0,
    maxTotalTokens: 8191,
    dimensions: 1536,
  },
};

// Stub class for manifest implementation field (not actually used in tests)
class StubLLM extends AbstractLLM {
  constructor() {
    super({
      manifest: {
        providerName: "Stub",
        modelFamily: "stub",
        envSchema: z.object({}),
        models: {
          embeddings: {
            modelKey: GPT_EMBEDDINGS_GPT4,
            name: "text-embedding-ada-002",
            urnEnvKey: "STUB_EMBED",
            purpose: LLMPurpose.EMBEDDINGS,
            maxTotalTokens: 8191,
            dimensions: 1536,
          },
          primaryCompletion: {
            modelKey: GPT_COMPLETIONS_GPT4_32k,
            name: "GPT-4 32k",
            urnEnvKey: "STUB_COMPLETE",
            purpose: LLMPurpose.COMPLETIONS,
            maxCompletionTokens: 4096,
            maxTotalTokens: 32768,
          },
        },
        errorPatterns: [],
        providerSpecificConfig: {
          requestTimeoutMillis: 60000,
          maxRetryAttempts: 3,
          minRetryDelayMillis: 1000,
          maxRetryDelayMillis: 5000,
        },
        implementation: StubLLM as any,
      },
      providerParams: {},
      resolvedModels: {
        embeddings: "stub-embed",
        primaryCompletion: "stub-complete",
      },
      errorLogger: createMockErrorLogger(),
    });
  }
  protected async invokeEmbeddingProvider(): Promise<LLMImplSpecificResponseSummary> {
    return {
      isIncompleteResponse: false,
      responseContent: [],
      tokenUsage: { promptTokens: 0, completionTokens: 0, maxTotalTokens: 0 },
    };
  }
  protected async invokeCompletionProvider(): Promise<LLMImplSpecificResponseSummary> {
    return {
      isIncompleteResponse: false,
      responseContent: "",
      tokenUsage: { promptTokens: 0, completionTokens: 0, maxTotalTokens: 0 },
    };
  }
  protected isLLMOverloaded(): boolean {
    return false;
  }
  protected isTokenLimitExceeded(): boolean {
    return false;
  }
}

// Helper function to create ProviderInit for tests
function createTestProviderInit(
  primaryCompletionKey: string,
  embeddingsKey: string = GPT_EMBEDDINGS_GPT4,
): ProviderInit {
  const manifest: LLMProviderManifest = {
    providerName: "Test Provider",
    modelFamily: "test",
    envSchema: z.object({}),
    models: {
      embeddings: {
        modelKey: embeddingsKey,
        name: testModelsMetadata[embeddingsKey].name,
        urnEnvKey: "TEST_EMBEDDINGS_MODEL",
        purpose: LLMPurpose.EMBEDDINGS,
        maxTotalTokens: testModelsMetadata[embeddingsKey].maxTotalTokens,
        dimensions: testModelsMetadata[embeddingsKey].dimensions,
      },
      primaryCompletion: {
        modelKey: primaryCompletionKey,
        name: testModelsMetadata[primaryCompletionKey].name,
        urnEnvKey: "TEST_PRIMARY_MODEL",
        purpose: LLMPurpose.COMPLETIONS,
        maxCompletionTokens: testModelsMetadata[primaryCompletionKey].maxCompletionTokens,
        maxTotalTokens: testModelsMetadata[primaryCompletionKey].maxTotalTokens,
      },
    },
    errorPatterns: [],
    providerSpecificConfig: {
      requestTimeoutMillis: 60000,
      maxRetryAttempts: 3,
      minRetryDelayMillis: 1000,
      maxRetryDelayMillis: 5000,
    },
    implementation: StubLLM as any,
  };

  return {
    manifest,
    providerParams: {},
    resolvedModels: {
      embeddings: testModelsMetadata[embeddingsKey].urn,
      primaryCompletion: testModelsMetadata[primaryCompletionKey].urn,
    },
    errorLogger: createMockErrorLogger(),
  };
}

// Test concrete class that extends AbstractLLM to test token extraction functionality
class TestLLM extends AbstractLLM {
  private mockTokenUsage: LLMResponseTokensUsage = {
    promptTokens: 10,
    completionTokens: 20,
    maxTotalTokens: 100,
  };

  constructor() {
    super(createTestProviderInit(GPT_COMPLETIONS_GPT4_32k));
  }

  // Method to set mock token usage for testing
  setMockTokenUsage(tokenUsage: LLMResponseTokensUsage) {
    this.mockTokenUsage = tokenUsage;
  }

  protected async invokeEmbeddingProvider(): Promise<LLMImplSpecificResponseSummary> {
    return {
      isIncompleteResponse: false,
      responseContent: [0.1, 0.2, 0.3],
      tokenUsage: this.mockTokenUsage,
    };
  }

  protected async invokeCompletionProvider(): Promise<LLMImplSpecificResponseSummary> {
    return {
      isIncompleteResponse: true, // This triggers the private method we want to test
      responseContent: "test response",
      tokenUsage: this.mockTokenUsage,
    };
  }

  protected isLLMOverloaded(): boolean {
    return false;
  }

  protected isTokenLimitExceeded(): boolean {
    return false;
  }
}

describe("Abstract LLM Token Extraction", () => {
  let testLLM: TestLLM;
  let testContext: LLMContext;

  beforeEach(() => {
    testLLM = new TestLLM();
    testContext = {
      resource: "test-resource",
      purpose: LLMPurpose.COMPLETIONS,
    };
  });

  describe("Token extraction from metadata", () => {
    test("extracts tokens with missing maxTotalTokens", async () => {
      const tokenUsage = {
        promptTokens: 200,
        completionTokens: 0,
        maxTotalTokens: -1,
      };
      testLLM.setMockTokenUsage(tokenUsage);

      const result = await testLLM.executeCompletionPrimary("test prompt", testContext);

      expect(result.tokensUsage).toStrictEqual({
        completionTokens: 0,
        promptTokens: 200,
        maxTotalTokens: 32768,
      });
    });

    test("extracts tokens with missing completionTokens", async () => {
      const tokenUsage = {
        promptTokens: 32760,
        completionTokens: -1,
        maxTotalTokens: -1,
      };
      testLLM.setMockTokenUsage(tokenUsage);

      const result = await testLLM.executeCompletionPrimary("test prompt", testContext);

      expect(result.tokensUsage).toStrictEqual({
        completionTokens: 0,
        promptTokens: 32760,
        maxTotalTokens: 32768,
      });
    });

    test("extracts tokens with missing promptTokens", async () => {
      const tokenUsage = {
        promptTokens: -1,
        completionTokens: 200,
        maxTotalTokens: -1,
      };
      testLLM.setMockTokenUsage(tokenUsage);

      const result = await testLLM.executeCompletionPrimary("test prompt", testContext);

      expect(result.tokensUsage).toStrictEqual({
        completionTokens: 200,
        promptTokens: 32769,
        maxTotalTokens: 32768,
      });
    });

    test("extracts tokens for different model", async () => {
      // Create a TestLLM that uses the Llama model as primary
      class TestLlamaLLM extends AbstractLLM {
        private mockTokenUsage: LLMResponseTokensUsage = {
          promptTokens: 10,
          completionTokens: 20,
          maxTotalTokens: 100,
        };

        constructor() {
          super(createTestProviderInit(AWS_COMPLETIONS_LLAMA_V31_405B_INSTRUCT));
        }

        setMockTokenUsage(tokenUsage: LLMResponseTokensUsage) {
          this.mockTokenUsage = tokenUsage;
        }

        protected async invokeEmbeddingProvider(): Promise<LLMImplSpecificResponseSummary> {
          return {
            isIncompleteResponse: false,
            responseContent: [0.1, 0.2, 0.3],
            tokenUsage: this.mockTokenUsage,
          };
        }

        protected async invokeCompletionProvider(): Promise<LLMImplSpecificResponseSummary> {
          return {
            isIncompleteResponse: true,
            responseContent: "test response",
            tokenUsage: this.mockTokenUsage,
          };
        }

        protected isLLMOverloaded(): boolean {
          return false;
        }

        protected isTokenLimitExceeded(): boolean {
          return false;
        }
      }

      const llamaLLM = new TestLlamaLLM();
      const tokenUsage = {
        promptTokens: 243,
        completionTokens: -1,
        maxTotalTokens: -1,
      };
      llamaLLM.setMockTokenUsage(tokenUsage);

      const result = await llamaLLM.executeCompletionPrimary("test prompt", testContext);

      expect(result.tokensUsage).toStrictEqual({
        completionTokens: 0,
        promptTokens: 243,
        maxTotalTokens: 128000,
      });
    });
  });
});

// Test class for JSON response testing
class TestJSONLLM extends AbstractLLM {
  private mockResponseContent = "";
  private mockIsIncomplete = false;
  private mockEmbeddingResponseContent: number[] = [0.1, 0.2, 0.3];

  constructor() {
    super(createTestProviderInit(GPT_COMPLETIONS_GPT4_32k));
  }

  setMockResponse(content: string, isIncomplete = false) {
    this.mockResponseContent = content;
    this.mockIsIncomplete = isIncomplete;
  }

  setMockEmbeddingResponse(content: number[]) {
    this.mockEmbeddingResponseContent = content;
  }

  protected async invokeEmbeddingProvider(): Promise<LLMImplSpecificResponseSummary> {
    return {
      isIncompleteResponse: false,
      responseContent: this.mockEmbeddingResponseContent,
      tokenUsage: {
        promptTokens: 10,
        completionTokens: 20,
        maxTotalTokens: 100,
      },
    };
  }

  protected async invokeCompletionProvider(): Promise<LLMImplSpecificResponseSummary> {
    return {
      isIncompleteResponse: this.mockIsIncomplete,
      responseContent: this.mockResponseContent,
      tokenUsage: {
        promptTokens: 10,
        completionTokens: 20,
        maxTotalTokens: 100,
      },
    };
  }

  protected isLLMOverloaded(): boolean {
    return false;
  }

  protected isTokenLimitExceeded(): boolean {
    return false;
  }
}

describe("Abstract LLM Sanitization Steps Propagation", () => {
  let testLLM: TestJSONLLM;
  let testContext: LLMContext;

  beforeEach(() => {
    testLLM = new TestJSONLLM();
    testContext = {
      resource: "test-resource",
      purpose: LLMPurpose.COMPLETIONS,
    };
  });

  describe("JSON response with sanitization steps", () => {
    test("should have empty sanitization steps for clean JSON with whitespace", async () => {
      // JSON with leading/trailing whitespace is handled by JSON.parse naturally
      testLLM.setMockResponse('  {"name": "test", "value": 123}  ');

      const result = await testLLM.executeCompletionPrimary("test prompt", testContext, {
        outputFormat: LLMOutputFormat.JSON,
      });

      expect(result.status).toBe(LLMResponseStatus.COMPLETED);
      expect(result.mutationSteps).toBeDefined();
      expect(result.mutationSteps).toEqual([]);
    });

    test("should propagate sanitization steps for JSON with code fences", async () => {
      // JSON wrapped in markdown code fence requires sanitization
      testLLM.setMockResponse('```json\n{"name": "test", "value": 123}\n```');

      const result = await testLLM.executeCompletionPrimary("test prompt", testContext, {
        outputFormat: LLMOutputFormat.JSON,
      });

      expect(result.status).toBe(LLMResponseStatus.COMPLETED);
      expect(result.mutationSteps).toBeDefined();
      expect(
        result.mutationSteps?.some(
          (s: string) =>
            s.includes("Fixed JSON structure and noise") ||
            s.includes("Removed markdown code fences") ||
            s === SANITIZATION_STEP.REMOVED_CODE_FENCES,
        ),
      ).toBe(true);
    });

    test("should propagate sanitization steps for JSON with trailing comma", async () => {
      // JSON with trailing comma (requires sanitization)
      testLLM.setMockResponse('{"name": "test", "value": 123,}');

      const result = await testLLM.executeCompletionPrimary("test prompt", testContext, {
        outputFormat: LLMOutputFormat.JSON,
      });

      expect(result.status).toBe(LLMResponseStatus.COMPLETED);
      expect(result.mutationSteps).toBeDefined();
      expect(result.mutationSteps?.length).toBeGreaterThan(0);
    });

    test("should not have sanitization steps for clean JSON", async () => {
      // Clean JSON that doesn't need any sanitization
      testLLM.setMockResponse('{"name":"test","value":123}');

      const result = await testLLM.executeCompletionPrimary("test prompt", testContext, {
        outputFormat: LLMOutputFormat.JSON,
      });

      expect(result.status).toBe(LLMResponseStatus.COMPLETED);
      expect(result.mutationSteps).toBeDefined();
      expect(result.mutationSteps).toEqual([]);
    });

    test("should not have sanitization steps for text output format", async () => {
      // When output format is TEXT, no sanitization steps should be recorded
      testLLM.setMockResponse("This is plain text");

      const result = await testLLM.executeCompletionPrimary("test prompt", testContext, {
        outputFormat: LLMOutputFormat.TEXT,
      });

      expect(result.status).toBe(LLMResponseStatus.COMPLETED);
      expect(result.mutationSteps).toBeUndefined();
    });

    test("should not have sanitization steps when JSON parsing fails", async () => {
      // Invalid JSON that cannot be fixed
      testLLM.setMockResponse("This is not JSON at all");

      const result = await testLLM.executeCompletionPrimary("test prompt", testContext, {
        outputFormat: LLMOutputFormat.JSON,
      });

      expect(result.status).toBe(LLMResponseStatus.INVALID);
      expect(result.mutationSteps).toBeUndefined();
    });
  });
});

describe("Abstract LLM Deep Immutability", () => {
  let testLLM: TestLLM;

  beforeEach(() => {
    testLLM = new TestLLM();
  });

  describe("getModelsMetadata", () => {
    test("should return a frozen object", () => {
      const metadata = testLLM.getModelsMetadata();
      expect(Object.isFrozen(metadata)).toBe(true);
    });

    test("should return a deep clone that prevents mutation of nested objects", () => {
      const metadata1 = testLLM.getModelsMetadata();
      const metadata2 = testLLM.getModelsMetadata();

      // Should be different object references (deep clone)
      expect(metadata1).not.toBe(metadata2);
      expect(metadata1[GPT_COMPLETIONS_GPT4_32k]).not.toBe(metadata2[GPT_COMPLETIONS_GPT4_32k]);

      // But should have equal values
      expect(metadata1).toEqual(metadata2);
    });

    test("should prevent modification of returned metadata", () => {
      const metadata = testLLM.getModelsMetadata();

      expect(() => {
        (metadata as any).newKey = "newValue";
      }).toThrow();
    });

    test("should contain expected model keys", () => {
      const metadata = testLLM.getModelsMetadata();

      expect(metadata[GPT_COMPLETIONS_GPT4_32k]).toBeDefined();
      expect(metadata[GPT_EMBEDDINGS_GPT4]).toBeDefined();
      expect(metadata[GPT_COMPLETIONS_GPT4_32k].urn).toBe("gpt-4-32k");
      expect(metadata[GPT_EMBEDDINGS_GPT4].urn).toBe("text-embedding-ada-002");
    });
  });
});

describe("Abstract LLM Type Safety with InferResponseType", () => {
  let testLLM: TestJSONLLM;
  const testContext: LLMContext = {
    resource: "test-resource",
    purpose: LLMPurpose.COMPLETIONS,
    outputFormat: LLMOutputFormat.JSON,
  };

  beforeEach(() => {
    testLLM = new TestJSONLLM();
  });

  describe("TEXT format responses", () => {
    test("should return string type for TEXT format", async () => {
      const textResponse = "This is a plain text response from the LLM";
      testLLM.setMockResponse(textResponse);

      const result = await testLLM.executeCompletionPrimary("test prompt", testContext, {
        outputFormat: LLMOutputFormat.TEXT,
      });

      expect(result.status).toBe(LLMResponseStatus.COMPLETED);
      expect(typeof result.generated).toBe("string");
      expect(result.generated).toBe(textResponse);

      // TypeScript infers string type with proper narrowing
      if (result.generated && typeof result.generated === "string") {
        const upperCase = result.generated.toUpperCase();
        expect(upperCase).toBe(textResponse.toUpperCase());
      }
    });

    test("should handle TEXT responses without type assertions", async () => {
      testLLM.setMockResponse("Sample text");

      const result = await testLLM.executeCompletionPrimary("test prompt", testContext, {
        outputFormat: LLMOutputFormat.TEXT,
      });

      // No 'as string' cast needed with type narrowing
      expect(result.generated).toBe("Sample text");
      expect(typeof result.generated).toBe("string");
    });
  });

  describe("JSON format responses with schema", () => {
    test("should return correctly typed object for JSON with schema", async () => {
      const userSchema = z.object({
        id: z.number(),
        name: z.string(),
        email: z.string(),
      });

      const mockData = {
        id: 123,
        name: "Test User",
        email: "test@example.com",
      };

      testLLM.setMockResponse(JSON.stringify(mockData));

      const result = await testLLM.executeCompletionPrimary("test prompt", testContext, {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: userSchema,
      });

      expect(result.status).toBe(LLMResponseStatus.COMPLETED);
      expect(result.generated).toEqual(mockData);

      // Type is inferred, with narrowing for access
      if (
        result.generated &&
        typeof result.generated === "object" &&
        !Array.isArray(result.generated)
      ) {
        const data = result.generated as Record<string, any>;
        expect(data.id).toBe(123);
        expect(data.name).toBe("Test User");
      }
    });

    test("should handle complex nested schemas", async () => {
      const complexSchema = z.object({
        metadata: z.object({
          version: z.number(),
          timestamp: z.string(),
        }),
        data: z.object({
          items: z.array(
            z.object({
              id: z.string(),
              count: z.number(),
            }),
          ),
          total: z.number(),
        }),
      });

      const mockData = {
        metadata: {
          version: 1,
          timestamp: "2024-01-01T00:00:00Z",
        },
        data: {
          items: [
            { id: "item1", count: 5 },
            { id: "item2", count: 10 },
          ],
          total: 15,
        },
      };

      testLLM.setMockResponse(JSON.stringify(mockData));

      const result = await testLLM.executeCompletionPrimary("test prompt", testContext, {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: complexSchema,
      });

      expect(result.status).toBe(LLMResponseStatus.COMPLETED);
      expect(result.generated).toEqual(mockData);

      if (
        result.generated &&
        typeof result.generated === "object" &&
        !Array.isArray(result.generated)
      ) {
        const data = result.generated as Record<string, any>;
        expect(data.data.items).toHaveLength(2);
        expect(data.metadata.version).toBe(1);
      }
    });

    test("should handle array schemas", async () => {
      const arraySchema = z.array(
        z.object({
          id: z.string(),
          name: z.string(),
          active: z.boolean(),
        }),
      );

      const mockData = [
        { id: "1", name: "First", active: true },
        { id: "2", name: "Second", active: false },
      ];

      testLLM.setMockResponse(JSON.stringify(mockData));

      const result = await testLLM.executeCompletionPrimary("test prompt", testContext, {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: arraySchema,
      });

      expect(result.status).toBe(LLMResponseStatus.COMPLETED);
      expect(Array.isArray(result.generated)).toBe(true);
      expect(result.generated).toHaveLength(2);
    });
  });

  describe("type preservation through call chain", () => {
    test("should maintain type information from schema through response", async () => {
      const technologiesSchema = z.object({
        technologies: z.array(
          z.object({
            name: z.string(),
            description: z.string(),
          }),
        ),
      });

      const mockData = {
        technologies: [
          { name: "TypeScript", description: "Typed JavaScript" },
          { name: "Node.js", description: "JavaScript runtime" },
        ],
      };

      testLLM.setMockResponse(JSON.stringify(mockData));

      const result = await testLLM.executeCompletionPrimary("test prompt", testContext, {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: technologiesSchema,
      });

      expect(result.status).toBe(LLMResponseStatus.COMPLETED);

      // Type is inferred, with narrowing for access
      if (
        result.generated &&
        typeof result.generated === "object" &&
        !Array.isArray(result.generated)
      ) {
        const data = result.generated as Record<string, any>;
        expect(data.technologies).toBeDefined();
        expect(data.technologies[0].name).toBe("TypeScript");
      }
    });

    test("should handle optional fields correctly", async () => {
      const optionalSchema = z.object({
        required: z.string(),
        optional: z.string().optional(),
        nullable: z.number().nullable(),
      });

      const mockData = {
        required: "present",
        nullable: null,
      };

      testLLM.setMockResponse(JSON.stringify(mockData));

      const result = await testLLM.executeCompletionPrimary("test prompt", testContext, {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: optionalSchema,
      });

      expect(result.status).toBe(LLMResponseStatus.COMPLETED);

      if (
        result.generated &&
        typeof result.generated === "object" &&
        !Array.isArray(result.generated)
      ) {
        const data = result.generated as Record<string, any>;
        expect(data.required).toBe("present");
        expect(data.optional).toBeUndefined();
        expect(data.nullable).toBeNull();
      }
    });
  });

  describe("embeddings type safety", () => {
    test("should always return number array for embeddings", async () => {
      const embeddingVector = [0.1, 0.2, 0.3, 0.4, 0.5];
      testLLM.setMockEmbeddingResponse(embeddingVector);

      const result = await testLLM.generateEmbeddings("test content", {
        resource: "test",
        purpose: LLMPurpose.EMBEDDINGS,
      });

      expect(result.status).toBe(LLMResponseStatus.COMPLETED);
      expect(Array.isArray(result.generated)).toBe(true);
      expect(result.generated).toEqual(embeddingVector);

      // Type should be number[] without casts
      if (result.generated) {
        result.generated.forEach((num) => {
          expect(typeof num).toBe("number");
        });
      }
    });
  });
});
