import "reflect-metadata";
import { describe, test, expect } from "@jest/globals";
import {
  LLMRequestContext,
  LLMExecutionContext,
  LLMPurpose,
  LLMOutputFormat,
  toExecutionContext,
} from "../../../../src/common/llm/types/llm-request.types";

describe("LLM Context Types", () => {
  describe("LLMRequestContext", () => {
    test("should create valid request context without modelKey", () => {
      const context: LLMRequestContext = {
        resource: "test-resource",
        purpose: LLMPurpose.COMPLETIONS,
      };

      expect(context.resource).toBe("test-resource");
      expect(context.purpose).toBe(LLMPurpose.COMPLETIONS);
      expect("modelKey" in context).toBe(false);
    });

    test("should create request context with optional outputFormat", () => {
      const context: LLMRequestContext = {
        resource: "test-resource",
        purpose: LLMPurpose.EMBEDDINGS,
        outputFormat: LLMOutputFormat.JSON,
      };

      expect(context.resource).toBe("test-resource");
      expect(context.purpose).toBe(LLMPurpose.EMBEDDINGS);
      expect(context.outputFormat).toBe(LLMOutputFormat.JSON);
    });
  });

  describe("LLMExecutionContext", () => {
    test("should create valid execution context with mandatory modelKey", () => {
      const context: LLMExecutionContext = {
        resource: "test-resource",
        purpose: LLMPurpose.COMPLETIONS,
        modelKey: "test-model",
      };

      expect(context.resource).toBe("test-resource");
      expect(context.purpose).toBe(LLMPurpose.COMPLETIONS);
      expect(context.modelKey).toBe("test-model");
    });

    test("should create execution context with all fields", () => {
      const context: LLMExecutionContext = {
        resource: "test-resource",
        purpose: LLMPurpose.COMPLETIONS,
        modelKey: "test-model",
        outputFormat: LLMOutputFormat.TEXT,
      };

      expect(context.resource).toBe("test-resource");
      expect(context.purpose).toBe(LLMPurpose.COMPLETIONS);
      expect(context.modelKey).toBe("test-model");
      expect(context.outputFormat).toBe(LLMOutputFormat.TEXT);
    });
  });

  describe("toExecutionContext helper", () => {
    test("should convert request context to execution context", () => {
      const requestContext: LLMRequestContext = {
        resource: "test-resource",
        purpose: LLMPurpose.COMPLETIONS,
      };

      const executionContext = toExecutionContext(requestContext, "test-model");

      expect(executionContext.resource).toBe("test-resource");
      expect(executionContext.purpose).toBe(LLMPurpose.COMPLETIONS);
      expect(executionContext.modelKey).toBe("test-model");
    });

    test("should preserve optional fields when converting", () => {
      const requestContext: LLMRequestContext = {
        resource: "test-resource",
        purpose: LLMPurpose.EMBEDDINGS,
        outputFormat: LLMOutputFormat.JSON,
      };

      const executionContext = toExecutionContext(requestContext, "embedding-model");

      expect(executionContext.resource).toBe("test-resource");
      expect(executionContext.purpose).toBe(LLMPurpose.EMBEDDINGS);
      expect(executionContext.modelKey).toBe("embedding-model");
      expect(executionContext.outputFormat).toBe(LLMOutputFormat.JSON);
    });

    test("should create independent copy (not mutate original)", () => {
      const requestContext: LLMRequestContext = {
        resource: "test-resource",
        purpose: LLMPurpose.COMPLETIONS,
      };

      const executionContext = toExecutionContext(requestContext, "test-model");

      // Verify original doesn't have modelKey
      expect("modelKey" in requestContext).toBe(false);
      expect(executionContext.modelKey).toBe("test-model");
    });

    test("should produce valid execution context with modelKey", () => {
      const requestContext: LLMRequestContext = {
        resource: "test-resource",
        purpose: LLMPurpose.COMPLETIONS,
      };

      const executionContext = toExecutionContext(requestContext, "test-model");

      expect("modelKey" in executionContext).toBe(true);
      expect(executionContext.modelKey).toBe("test-model");
    });
  });

  describe("Type compatibility", () => {
    test("LLMExecutionContext should be assignable to LLMRequestContext | LLMExecutionContext", () => {
      const executionContext: LLMExecutionContext = {
        resource: "test-resource",
        purpose: LLMPurpose.COMPLETIONS,
        modelKey: "test-model",
      };

      // This assignment should compile without errors
      const context: LLMRequestContext | LLMExecutionContext = executionContext;

      expect("modelKey" in context).toBe(true);
    });

    test("LLMRequestContext should be assignable to LLMRequestContext | LLMExecutionContext", () => {
      const requestContext: LLMRequestContext = {
        resource: "test-resource",
        purpose: LLMPurpose.COMPLETIONS,
      };

      // This assignment should compile without errors
      const context: LLMRequestContext | LLMExecutionContext = requestContext;

      expect("modelKey" in context).toBe(false);
    });
  });
});
