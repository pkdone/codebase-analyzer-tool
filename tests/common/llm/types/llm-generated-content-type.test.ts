import { describe, test, expect } from "@jest/globals";
import { z } from "zod";
import { LLMGeneratedContent } from "../../../../src/common/llm/types/llm.types";

/**
 * Unit tests for LLMGeneratedContent type.
 *
 * These tests verify that the LLMGeneratedContent type correctly supports
 * all expected content types including generic arrays, ensuring type compatibility
 * with schema-inferred types through the LLM call chain.
 */
describe("LLMGeneratedContent Type", () => {
  describe("Type Assignability", () => {
    test("should accept string values", () => {
      const content: LLMGeneratedContent = "text response";
      expect(typeof content).toBe("string");
    });

    test("should accept null values", () => {
      const content: LLMGeneratedContent = null;
      expect(content).toBeNull();
    });

    test("should accept Record<string, unknown> (object) values", () => {
      const content: LLMGeneratedContent = { name: "test", count: 42 };
      expect(content).toEqual({ name: "test", count: 42 });
    });

    test("should accept number[] (embedding) arrays", () => {
      // Embeddings are arrays of numbers
      const embeddings: number[] = [0.1, 0.2, 0.3, 0.4, 0.5];
      const content: LLMGeneratedContent = embeddings;
      expect(Array.isArray(content)).toBe(true);
      expect(content).toEqual([0.1, 0.2, 0.3, 0.4, 0.5]);
    });

    test("should accept string[] arrays", () => {
      const content: LLMGeneratedContent = ["item1", "item2", "item3"];
      expect(Array.isArray(content)).toBe(true);
      expect(content).toEqual(["item1", "item2", "item3"]);
    });

    test("should accept object[] arrays (e.g., from z.array(z.object(...)))", () => {
      // This is the key improvement - supporting typed object arrays
      const objectArray: { id: number; name: string }[] = [
        { id: 1, name: "Alice" },
        { id: 2, name: "Bob" },
      ];
      const content: LLMGeneratedContent = objectArray;
      expect(Array.isArray(content)).toBe(true);
      expect(content).toEqual([
        { id: 1, name: "Alice" },
        { id: 2, name: "Bob" },
      ]);
    });

    test("should accept mixed arrays", () => {
      const mixedArray: unknown[] = [1, "two", { three: 3 }, null];
      const content: LLMGeneratedContent = mixedArray;
      expect(Array.isArray(content)).toBe(true);
      expect(content).toHaveLength(4);
    });

    test("should accept nested object arrays", () => {
      const nestedArray = [
        { user: { profile: { name: "John" } } },
        { user: { profile: { name: "Jane" } } },
      ];
      const content: LLMGeneratedContent = nestedArray;
      expect(Array.isArray(content)).toBe(true);
    });
  });

  describe("Generic Constraint Compatibility (T extends LLMGeneratedContent)", () => {
    /**
     * This test verifies that types inferred from Zod schemas are assignable
     * to LLMGeneratedContent, which is required for the generic constraint
     * `T extends LLMGeneratedContent` used in LLMExecutionPipeline.
     */

    test("should be compatible with z.infer<z.ZodObject>", () => {
      const _schema = z.object({ id: z.number(), name: z.string() });
      type InferredType = z.infer<typeof _schema>;

      // Simulating what would come from parseAndValidateLLMJson or validateJsonWithTransforms
      const data: InferredType = { id: 1, name: "test" };

      // The inferred type should be assignable to LLMGeneratedContent
      const content: LLMGeneratedContent = data;
      expect(content).toEqual({ id: 1, name: "test" });
    });

    test("should be compatible with z.infer<z.ZodArray<z.ZodObject>>", () => {
      // This was the problematic case before the fix
      const _schema = z.array(z.object({ id: z.number(), name: z.string() }));
      type InferredType = z.infer<typeof _schema>;

      const data: InferredType = [
        { id: 1, name: "Alice" },
        { id: 2, name: "Bob" },
      ];

      // After the fix, this should compile and work
      const content: LLMGeneratedContent = data;
      expect(content).toEqual([
        { id: 1, name: "Alice" },
        { id: 2, name: "Bob" },
      ]);
    });

    test("should be compatible with z.infer<z.ZodArray<z.ZodString>>", () => {
      const _schema = z.array(z.string());
      type InferredType = z.infer<typeof _schema>;

      const data: InferredType = ["one", "two", "three"];
      const content: LLMGeneratedContent = data;
      expect(content).toEqual(["one", "two", "three"]);
    });

    test("should be compatible with z.infer<z.ZodArray<z.ZodNumber>>", () => {
      // Similar to embeddings type
      const _schema = z.array(z.number());
      type InferredType = z.infer<typeof _schema>;

      const data: InferredType = [1, 2, 3, 4, 5];
      const content: LLMGeneratedContent = data;
      expect(content).toEqual([1, 2, 3, 4, 5]);
    });

    test("should be compatible with z.string()", () => {
      const _schema = z.string();
      type InferredType = z.infer<typeof _schema>;

      const data: InferredType = "text response";
      const content: LLMGeneratedContent = data;
      expect(content).toBe("text response");
    });
  });

  describe("Extends Constraint Simulation", () => {
    /**
     * These tests simulate the `T extends LLMGeneratedContent` generic constraint
     * used in LLMExecutionPipeline, LLMExecutionParams, and RetryStrategy.
     */

    function acceptsGeneratedContent<T extends LLMGeneratedContent>(value: T): T {
      return value;
    }

    test("should satisfy extends constraint with string", () => {
      const result = acceptsGeneratedContent("text");
      expect(result).toBe("text");
    });

    test("should satisfy extends constraint with null", () => {
      const result = acceptsGeneratedContent(null);
      expect(result).toBeNull();
    });

    test("should satisfy extends constraint with Record<string, unknown>", () => {
      const obj = { key: "value" };
      const result = acceptsGeneratedContent(obj);
      expect(result).toEqual({ key: "value" });
    });

    test("should satisfy extends constraint with number[]", () => {
      const nums: number[] = [1, 2, 3];
      const result = acceptsGeneratedContent(nums);
      expect(result).toEqual([1, 2, 3]);
    });

    test("should satisfy extends constraint with typed object array", () => {
      // This is the critical test - object arrays should satisfy the constraint
      const items = [{ id: 1 }, { id: 2 }];
      const result = acceptsGeneratedContent(items);
      expect(result).toEqual([{ id: 1 }, { id: 2 }]);
    });

    test("should satisfy extends constraint with complex nested array", () => {
      const complexArray = [
        { user: { name: "John", roles: ["admin", "user"] } },
        { user: { name: "Jane", roles: ["user"] } },
      ];
      const result = acceptsGeneratedContent(complexArray);
      expect(result).toHaveLength(2);
    });
  });

  describe("LLMExecutionParams Type Compatibility", () => {
    /**
     * These tests verify that the updated LLMGeneratedContent type works correctly
     * with the LLMExecutionParams interface which uses `T extends LLMGeneratedContent`.
     */

    interface MockExecutionParams<T extends LLMGeneratedContent> {
      content: string;
      result?: T;
    }

    test("should work with object schema result type", () => {
      const params: MockExecutionParams<{ id: number; name: string }> = {
        content: "test prompt",
        result: { id: 1, name: "test" },
      };
      expect(params.result?.id).toBe(1);
    });

    test("should work with array schema result type", () => {
      // This validates the fix for array schemas
      type ArrayResult = { id: number; name: string }[];
      const params: MockExecutionParams<ArrayResult> = {
        content: "test prompt",
        result: [
          { id: 1, name: "Alice" },
          { id: 2, name: "Bob" },
        ],
      };
      expect(params.result?.[0].name).toBe("Alice");
    });

    test("should work with number[] (embeddings) result type", () => {
      const params: MockExecutionParams<number[]> = {
        content: "test content",
        result: [0.1, 0.2, 0.3],
      };
      expect(params.result?.[0]).toBeCloseTo(0.1);
    });

    test("should work with string result type", () => {
      const params: MockExecutionParams<string> = {
        content: "test prompt",
        result: "text response",
      };
      expect(params.result).toBe("text response");
    });
  });

  describe("Type Narrowing", () => {
    /**
     * Helper function to demonstrate type narrowing with LLMGeneratedContent.
     * The function signature accepts LLMGeneratedContent, allowing TypeScript
     * to properly narrow the type within the function body.
     */
    function narrowContent(content: LLMGeneratedContent): string {
      if (typeof content === "string") {
        // TypeScript narrows to string
        return content.toUpperCase();
      } else if (content === null) {
        // TypeScript narrows to null
        return "null";
      } else if (Array.isArray(content)) {
        // TypeScript narrows to unknown[]
        return `array:${content.length}`;
      } else {
        // TypeScript narrows to Record<string, unknown>
        return `object:${Object.keys(content).length}`;
      }
    }

    test("should support type narrowing with string", () => {
      const result = narrowContent("hello");
      expect(result).toBe("HELLO");
    });

    test("should support type narrowing with null", () => {
      const result = narrowContent(null);
      expect(result).toBe("null");
    });

    test("should support type narrowing with array", () => {
      const result = narrowContent([1, 2, 3]);
      expect(result).toBe("array:3");
    });

    test("should support type narrowing with object", () => {
      const result = narrowContent({ a: 1, b: 2 });
      expect(result).toBe("object:2");
    });

    test("should support Array.isArray type guard", () => {
      function processArrayContent(content: LLMGeneratedContent): number {
        if (Array.isArray(content)) {
          // Should be narrowed to unknown[]
          return content.length;
        }
        return -1;
      }

      expect(processArrayContent([{ id: 1 }, { id: 2 }])).toBe(2);
      expect(processArrayContent({ not: "array" })).toBe(-1);
      expect(processArrayContent("string")).toBe(-1);
      expect(processArrayContent(null)).toBe(-1);
    });
  });
});
