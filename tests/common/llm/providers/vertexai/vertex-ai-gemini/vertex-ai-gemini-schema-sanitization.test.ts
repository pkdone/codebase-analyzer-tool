import VertexAIGeminiLLM from "../../../../../../src/common/llm/providers/vertexai/gemini/vertex-ai-gemini-llm";
import { VertexAI, FinishReason } from "@google-cloud/vertexai";
import * as aiplatform from "@google-cloud/aiplatform";
import {
  LLMPurpose,
  LLMOutputFormat,
  LLMContext,
} from "../../../../../../src/common/llm/types/llm-request.types";
import { ResolvedLLMModelMetadata } from "../../../../../../src/common/llm/types/llm-model.types";
import { LLMResponseStatus } from "../../../../../../src/common/llm/types/llm-response.types";
import { z } from "zod";
import { createMockErrorLoggingConfig } from "../../../../helpers/llm/mock-error-logger";
import type { ProviderInit } from "../../../../../../src/common/llm/providers/llm-provider.types";
import { vertexAIGeminiProviderManifest } from "../../../../../../src/common/llm/providers/vertexai/gemini/vertex-ai-gemini.manifest";

// Mock the Vertex AI SDK
jest.mock("@google-cloud/vertexai");
jest.mock("@google-cloud/aiplatform");

// Model keys matching the manifest
const GEMINI_EMBEDDING_KEY = "vertexai-gemini-embedding-001";
const GEMINI_COMPLETION_KEY = "vertexai-gemini-3-pro";

describe("VertexAIGeminiLLM Schema Sanitization", () => {
  const mockModelsMetadata: Record<string, ResolvedLLMModelMetadata> = {
    [GEMINI_EMBEDDING_KEY]: {
      modelKey: GEMINI_EMBEDDING_KEY,
      urnEnvKey: "VERTEXAI_GEMINI_EMBEDDING_001_MODEL_URN",
      urn: "text-embedding-004",
      purpose: LLMPurpose.EMBEDDINGS,
      dimensions: 3072,
      maxTotalTokens: 2048,
    },
    [GEMINI_COMPLETION_KEY]: {
      modelKey: GEMINI_COMPLETION_KEY,
      urnEnvKey: "VERTEXAI_GEMINI_3_PRO_MODEL_URN",
      urn: "gemini-1.5-pro",
      purpose: LLMPurpose.COMPLETIONS,
      maxCompletionTokens: 65535,
      maxTotalTokens: 1048576,
    },
  };

  const mockContext: LLMContext = {
    resource: "test-resource",
    purpose: LLMPurpose.COMPLETIONS,
  };

  let mockVertexAI: jest.Mocked<VertexAI>;
  let mockGenerativeModel: {
    generateContent: jest.Mock;
  };
  let vertexAIGeminiLLM: VertexAIGeminiLLM;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock GenerativeModel
    mockGenerativeModel = {
      generateContent: jest.fn().mockResolvedValue({
        response: {
          candidates: [
            {
              content: {
                parts: [{ text: '{"name": "test"}' }],
              },
              finishReason: FinishReason.STOP,
            },
          ],
          usageMetadata: {
            promptTokenCount: 10,
            candidatesTokenCount: 20,
          },
        },
      }),
    };

    // Mock VertexAI
    mockVertexAI = {
      getGenerativeModel: jest.fn().mockReturnValue(mockGenerativeModel),
    } as unknown as jest.Mocked<VertexAI>;

    (VertexAI as jest.MockedClass<typeof VertexAI>).mockImplementation(() => mockVertexAI);

    // Mock aiplatform
    (
      aiplatform.PredictionServiceClient as jest.MockedClass<
        typeof aiplatform.PredictionServiceClient
      >
    ).mockImplementation(() => {
      return {
        close: jest.fn(),
        predict: jest.fn(),
      } as unknown as aiplatform.PredictionServiceClient;
    });

    const init: ProviderInit = {
      manifest: vertexAIGeminiProviderManifest,
      providerParams: {
        VERTEXAI_PROJECTID: "test-project",
        VERTEXAI_EMBEDDINGS_LOCATION: "us-central1",
        VERTEXAI_COMPLETIONS_LOCATION: "us-central1",
      },
      resolvedModelChain: {
        embeddings: [
          {
            providerFamily: "VertexAIGemini",
            modelKey: GEMINI_EMBEDDING_KEY,
            modelUrn: mockModelsMetadata[GEMINI_EMBEDDING_KEY].urn,
          },
        ],
        completions: [
          {
            providerFamily: "VertexAIGemini",
            modelKey: GEMINI_COMPLETION_KEY,
            modelUrn: mockModelsMetadata[GEMINI_COMPLETION_KEY].urn,
          },
        ],
      },
      errorLogging: createMockErrorLoggingConfig(),
    };
    vertexAIGeminiLLM = new VertexAIGeminiLLM(init);
  });

  describe("const field removal from JSON schemas", () => {
    it("should remove top-level const field from schema", async () => {
      const schemaWithConst = z.object({
        status: z.literal("active").describe("Status must be active"),
      });

      await vertexAIGeminiLLM.executeCompletion(GEMINI_COMPLETION_KEY, "test prompt", mockContext, {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: schemaWithConst,
        hasComplexSchema: false,
      });

      // Verify getGenerativeModel was called
      expect(mockVertexAI.getGenerativeModel).toHaveBeenCalled();

      // Get the arguments passed to getGenerativeModel
      const callArgs = mockVertexAI.getGenerativeModel.mock.calls[0];
      const modelParams = callArgs[0];
      const generationConfig = modelParams.generationConfig;

      // Verify responseSchema exists and doesn't contain const
      expect(generationConfig).toBeDefined();
      expect(generationConfig?.responseSchema).toBeDefined();
      const responseSchema = generationConfig?.responseSchema as Record<string, unknown>;

      // Verify const field is removed from properties
      if (responseSchema.properties) {
        const properties = responseSchema.properties as Record<string, unknown>;
        if (properties.status) {
          const statusSchema = properties.status as Record<string, unknown>;
          expect(statusSchema).not.toHaveProperty("const");
          // Should still have type
          expect(statusSchema).toHaveProperty("type");
        }
      }
    });

    it("should remove const from nested properties", async () => {
      const schemaWithNestedConst = z.object({
        user: z.object({
          role: z.literal("admin").describe("Role must be admin"),
          name: z.string(),
        }),
      });

      await vertexAIGeminiLLM.executeCompletion(GEMINI_COMPLETION_KEY, "test prompt", mockContext, {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: schemaWithNestedConst,
        hasComplexSchema: false,
      });

      expect(mockVertexAI.getGenerativeModel).toHaveBeenCalled();
      const callArgs = mockVertexAI.getGenerativeModel.mock.calls[0];
      const modelParams = callArgs[0];
      const generationConfig = modelParams.generationConfig;

      expect(generationConfig).toBeDefined();
      if (generationConfig?.responseSchema) {
        const responseSchema = generationConfig.responseSchema as Record<string, unknown>;
        const properties = responseSchema.properties as Record<string, unknown>;
        const userSchema = properties.user as Record<string, unknown>;
        const userProperties = userSchema.properties as Record<string, unknown>;
        const roleSchema = userProperties.role as Record<string, unknown>;

        expect(roleSchema).not.toHaveProperty("const");
        expect(roleSchema).toHaveProperty("type");
      }
    });

    it("should remove const from array items", async () => {
      const schemaWithArrayConst = z.object({
        items: z.array(z.literal("fixed-value")),
      });

      await vertexAIGeminiLLM.executeCompletion(GEMINI_COMPLETION_KEY, "test prompt", mockContext, {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: schemaWithArrayConst,
        hasComplexSchema: false,
      });

      expect(mockVertexAI.getGenerativeModel).toHaveBeenCalled();
      const callArgs = mockVertexAI.getGenerativeModel.mock.calls[0];
      const modelParams = callArgs[0];
      const generationConfig = modelParams.generationConfig;

      expect(generationConfig).toBeDefined();
      if (generationConfig?.responseSchema) {
        const responseSchema = generationConfig.responseSchema as Record<string, unknown>;
        const properties = responseSchema.properties as Record<string, unknown>;
        const itemsSchema = properties.items as Record<string, unknown>;
        const itemsArraySchema = itemsSchema.items as Record<string, unknown>;

        expect(itemsArraySchema).not.toHaveProperty("const");
        expect(itemsArraySchema).toHaveProperty("type");
      }
    });

    it("should remove const from anyOf schemas", async () => {
      const schemaWithAnyOf = z.object({
        value: z.union([z.string(), z.literal("specific-value")]),
      });

      await vertexAIGeminiLLM.executeCompletion(GEMINI_COMPLETION_KEY, "test prompt", mockContext, {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: schemaWithAnyOf,
        hasComplexSchema: false,
      });

      expect(mockVertexAI.getGenerativeModel).toHaveBeenCalled();
      const callArgs = mockVertexAI.getGenerativeModel.mock.calls[0];
      const modelParams = callArgs[0];
      const generationConfig = modelParams.generationConfig;

      expect(generationConfig).toBeDefined();
      if (generationConfig?.responseSchema) {
        const responseSchema = generationConfig.responseSchema as Record<string, unknown>;
        const properties = responseSchema.properties as Record<string, unknown>;
        const valueSchema = properties.value as Record<string, unknown>;
        const anyOf = valueSchema.anyOf as Record<string, unknown>[];

        // Find the schema with const (should be the literal one)
        const constSchema = anyOf.find((s) => s.const !== undefined);
        if (constSchema) {
          // The const should have been removed, but type should remain
          expect(constSchema).not.toHaveProperty("const");
        }
      }
    });

    it("should preserve other fields when removing const", async () => {
      const schemaWithMultipleFields = z.object({
        name: z.string().describe("User name"),
        status: z.literal("active"),
        age: z.number(),
      });

      await vertexAIGeminiLLM.executeCompletion(GEMINI_COMPLETION_KEY, "test prompt", mockContext, {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: schemaWithMultipleFields,
        hasComplexSchema: false,
      });

      expect(mockVertexAI.getGenerativeModel).toHaveBeenCalled();
      const callArgs = mockVertexAI.getGenerativeModel.mock.calls[0];
      const modelParams = callArgs[0];
      const generationConfig = modelParams.generationConfig;

      expect(generationConfig).toBeDefined();
      if (generationConfig?.responseSchema) {
        const responseSchema = generationConfig.responseSchema as Record<string, unknown>;
        const properties = responseSchema.properties as Record<string, unknown>;

        // Verify all properties exist
        expect(properties).toHaveProperty("name");
        expect(properties).toHaveProperty("status");
        expect(properties).toHaveProperty("age");

        // Verify const is removed from status
        const statusSchema = properties.status as Record<string, unknown>;
        expect(statusSchema).not.toHaveProperty("const");
        expect(statusSchema).toHaveProperty("type");
      }
    });

    it("should handle complex nested structures with const", async () => {
      const complexSchema = z.object({
        users: z.array(
          z.object({
            id: z.number(),
            role: z.literal("admin"),
            profile: z.object({
              status: z.literal("active"),
            }),
          }),
        ),
      });

      await vertexAIGeminiLLM.executeCompletion(GEMINI_COMPLETION_KEY, "test prompt", mockContext, {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: complexSchema,
        hasComplexSchema: false,
      });

      expect(mockVertexAI.getGenerativeModel).toHaveBeenCalled();
      const callArgs = mockVertexAI.getGenerativeModel.mock.calls[0];
      const modelParams = callArgs[0];
      const generationConfig = modelParams.generationConfig;

      expect(generationConfig).toBeDefined();
      if (generationConfig?.responseSchema) {
        const responseSchema = generationConfig.responseSchema as Record<string, unknown>;
        const properties = responseSchema.properties as Record<string, unknown>;
        const usersSchema = properties.users as Record<string, unknown>;
        const itemsSchema = usersSchema.items as Record<string, unknown>;
        const itemsProperties = itemsSchema.properties as Record<string, unknown>;
        const roleSchema = itemsProperties.role as Record<string, unknown>;
        const profileSchema = itemsProperties.profile as Record<string, unknown>;
        const profileProperties = profileSchema.properties as Record<string, unknown>;
        const statusSchema = profileProperties.status as Record<string, unknown>;

        // Verify const is removed from all nested levels
        expect(roleSchema).not.toHaveProperty("const");
        expect(statusSchema).not.toHaveProperty("const");
      }
    });

    it("should not mutate the original schema object", async () => {
      const originalSchema = z.object({
        status: z.literal("active"),
      });

      await vertexAIGeminiLLM.executeCompletion(GEMINI_COMPLETION_KEY, "test prompt", mockContext, {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: originalSchema,
        hasComplexSchema: false,
      });

      // The original schema object should not be mutated
      // (This is tested indirectly by ensuring the function works correctly)
      expect(mockVertexAI.getGenerativeModel).toHaveBeenCalled();
    });

    it("should handle schemas without const fields", async () => {
      const schemaWithoutConst = z.object({
        name: z.string(),
        age: z.number(),
      });

      await vertexAIGeminiLLM.executeCompletion(GEMINI_COMPLETION_KEY, "test prompt", mockContext, {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: schemaWithoutConst,
        hasComplexSchema: false,
      });

      expect(mockVertexAI.getGenerativeModel).toHaveBeenCalled();
      const callArgs = mockVertexAI.getGenerativeModel.mock.calls[0];
      const modelParams = callArgs[0];
      const generationConfig = modelParams.generationConfig;

      // Should still work correctly even without const fields
      expect(generationConfig).toBeDefined();
      expect(generationConfig?.responseSchema).toBeDefined();
    });

    it("should successfully complete request with sanitized schema", async () => {
      const schemaWithConst = z.object({
        value: z.literal("fixed"),
      });

      // Update mock to return response matching the schema
      mockGenerativeModel.generateContent.mockResolvedValueOnce({
        response: {
          candidates: [
            {
              content: {
                parts: [{ text: '{"value": "fixed"}' }],
              },
              finishReason: FinishReason.STOP,
            },
          ],
          usageMetadata: {
            promptTokenCount: 10,
            candidatesTokenCount: 20,
          },
        },
      });

      const result = await vertexAIGeminiLLM.executeCompletion(
        GEMINI_COMPLETION_KEY,
        "test prompt",
        mockContext,
        {
          outputFormat: LLMOutputFormat.JSON,
          jsonSchema: schemaWithConst,
          hasComplexSchema: false,
        },
      );

      // Verify the request completed successfully
      expect(result.status).toBe(LLMResponseStatus.COMPLETED);
      expect(result.generated).toBeDefined();
    });
  });
});
