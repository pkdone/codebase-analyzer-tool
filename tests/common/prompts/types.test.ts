/**
 * Tests for common prompt types.
 *
 * These tests verify the TypeScript compile-time behavior and runtime structure
 * of the GeneratedPrompt and PromptMetadata types.
 */

import { describe, test, expect } from "@jest/globals";
import { z } from "zod";
import type { GeneratedPrompt, PromptMetadata } from "../../../src/common/prompts";

describe("GeneratedPrompt type", () => {
  const testSchema = z.object({
    name: z.string(),
    value: z.number(),
  });

  describe("structure validation", () => {
    test("should allow creating a GeneratedPrompt with required fields only", () => {
      const prompt: GeneratedPrompt<typeof testSchema> = {
        prompt: "Analyze this code...",
        schema: testSchema,
      };

      expect(prompt.prompt).toBe("Analyze this code...");
      expect(prompt.schema).toBe(testSchema);
      expect(prompt.metadata).toBeUndefined();
    });

    test("should allow creating a GeneratedPrompt with optional metadata", () => {
      const prompt: GeneratedPrompt<typeof testSchema> = {
        prompt: "Analyze this code...",
        schema: testSchema,
        metadata: {
          hasComplexSchema: true,
        },
      };

      expect(prompt.prompt).toBe("Analyze this code...");
      expect(prompt.schema).toBe(testSchema);
      expect(prompt.metadata).toEqual({ hasComplexSchema: true });
    });

    test("should allow custom metadata fields", () => {
      const prompt: GeneratedPrompt<typeof testSchema> = {
        prompt: "Analyze this code...",
        schema: testSchema,
        metadata: {
          hasComplexSchema: false,
          estimatedTokens: 5000,
          customField: "custom value",
        },
      };

      expect(prompt.metadata?.hasComplexSchema).toBe(false);
      expect(prompt.metadata?.estimatedTokens).toBe(5000);
      expect(prompt.metadata?.customField).toBe("custom value");
    });
  });

  describe("schema type preservation", () => {
    test("should preserve schema type for type inference", () => {
      const prompt: GeneratedPrompt<typeof testSchema> = {
        prompt: "Test prompt",
        schema: testSchema,
      };

      // Verify the schema is correctly typed
      type InferredType = z.infer<typeof prompt.schema>;
      const validData: InferredType = { name: "test", value: 42 };

      expect(prompt.schema.parse(validData)).toEqual(validData);
    });

    test("should work with different schema types", () => {
      const stringSchema = z.string();
      const arraySchema = z.array(z.number());

      const stringPrompt: GeneratedPrompt<typeof stringSchema> = {
        prompt: "String prompt",
        schema: stringSchema,
      };

      const arrayPrompt: GeneratedPrompt<typeof arraySchema> = {
        prompt: "Array prompt",
        schema: arraySchema,
      };

      expect(stringPrompt.schema.parse("hello")).toBe("hello");
      expect(arrayPrompt.schema.parse([1, 2, 3])).toEqual([1, 2, 3]);
    });

    test("should work with default generic parameter (z.ZodType)", () => {
      // This tests that GeneratedPrompt works without explicit type parameter
      const genericPrompt: GeneratedPrompt = {
        prompt: "Generic prompt",
        schema: testSchema,
      };

      expect(genericPrompt.prompt).toBe("Generic prompt");
      expect(genericPrompt.schema).toBe(testSchema);
    });
  });
});

describe("PromptMetadata type", () => {
  test("should allow hasComplexSchema field", () => {
    const metadata: PromptMetadata = {
      hasComplexSchema: true,
    };

    expect(metadata.hasComplexSchema).toBe(true);
  });

  test("should allow custom fields", () => {
    const metadata: PromptMetadata = {
      hasComplexSchema: false,
      customNumber: 42,
      customString: "test",
      customObject: { nested: true },
    };

    expect(metadata.customNumber).toBe(42);
    expect(metadata.customString).toBe("test");
    expect(metadata.customObject).toEqual({ nested: true });
  });

  test("should allow empty metadata", () => {
    const metadata: PromptMetadata = {};

    expect(metadata.hasComplexSchema).toBeUndefined();
    expect(Object.keys(metadata)).toHaveLength(0);
  });
});
