import "reflect-metadata";
import { describe, test, expect, jest } from "@jest/globals";
import { z } from "zod";
import {
  LLMOutputFormat,
  LLMPurpose,
  type LLMContext,
} from "../../../src/common/llm/types/llm.types";
import { processJson } from "../../../src/common/llm/json-processing/core/json-processing";

// Mock dependencies
jest.mock("../../../src/common/utils/logging", () => ({
  logWarn: jest.fn(),
  logError: jest.fn(),
  logErrorMsg: jest.fn(),
}));

/**
 * Integration tests for JSON validation with end-to-end type safety.
 * These tests verify that the entire validation pipeline maintains type safety
 * from schema definition through to validated results.
 */
describe("JSON Validation Integration Tests", () => {
  const mockContext: LLMContext = {
    resource: "integration-test",
    purpose: LLMPurpose.COMPLETIONS,
  };

  describe("End-to-End Validation Flow", () => {
    test("should validate and type a complete user profile schema", () => {
      const userProfileSchema = z.object({
        id: z.number(),
        username: z.string(),
        email: z.string().email(),
        profile: z.object({
          firstName: z.string(),
          lastName: z.string(),
          age: z.number().optional(),
          bio: z.string().optional(),
        }),
        settings: z.object({
          notifications: z.boolean(),
          theme: z.enum(["light", "dark", "auto"]),
          language: z.string(),
        }),
        roles: z.array(z.string()),
        metadata: z.object({
          createdAt: z.string(),
          updatedAt: z.string(),
          lastLogin: z.string().optional(),
        }),
      });

      const mockLLMResponse = JSON.stringify({
        id: 12345,
        username: "testuser",
        email: "test@example.com",
        profile: {
          firstName: "Test",
          lastName: "User",
          age: 25,
          bio: "A test user biography",
        },
        settings: {
          notifications: true,
          theme: "dark",
          language: "en",
        },
        roles: ["user", "admin"],
        metadata: {
          createdAt: "2024-01-01T00:00:00Z",
          updatedAt: "2024-01-15T10:30:00Z",
          lastLogin: "2024-01-15T09:00:00Z",
        },
      });

      const result = processJson(
        mockLLMResponse,
        mockContext,
        {
          outputFormat: LLMOutputFormat.JSON,
          jsonSchema: userProfileSchema,
        },
        false,
      );

      expect(result.success).toBe(true);
      if (result.success) {
        // Verify all type-safe access
        expect(result.data.id).toBe(12345);
        expect(result.data.username).toBe("testuser");
        expect(result.data.email).toBe("test@example.com");
        expect(result.data.profile.firstName).toBe("Test");
        expect(result.data.profile.age).toBe(25);
        expect(result.data.settings.theme).toBe("dark");
        expect(result.data.roles).toHaveLength(2);
        expect(result.data.metadata.lastLogin).toBe("2024-01-15T09:00:00Z");

        // Compile-time type checks
        const _id: number = result.data.id;
        const _username: string = result.data.username;
        const _notifications: boolean = result.data.settings.notifications;
        const _roles: string[] = result.data.roles;
        expect(_id).toBeDefined();
        expect(_username).toBeDefined();
        expect(_notifications).toBeDefined();
        expect(_roles).toBeDefined();
      }
    });

    test("should handle API response schema with nested arrays", () => {
      const apiResponseSchema = z.object({
        success: z.boolean(),
        data: z.object({
          items: z.array(
            z.object({
              id: z.string(),
              name: z.string(),
              price: z.number(),
              tags: z.array(z.string()),
              metadata: z.record(z.unknown()),
            }),
          ),
          pagination: z.object({
            total: z.number(),
            page: z.number(),
            pageSize: z.number(),
            hasMore: z.boolean(),
          }),
        }),
        errors: z.array(z.string()).optional(),
      });

      const mockResponse = JSON.stringify({
        success: true,
        data: {
          items: [
            {
              id: "item-1",
              name: "Product A",
              price: 29.99,
              tags: ["electronics", "sale"],
              metadata: { stock: 50, warehouse: "A1" },
            },
            {
              id: "item-2",
              name: "Product B",
              price: 49.99,
              tags: ["electronics"],
              metadata: { stock: 20, warehouse: "B2" },
            },
          ],
          pagination: {
            total: 100,
            page: 1,
            pageSize: 2,
            hasMore: true,
          },
        },
      });

      const result = processJson(
        mockResponse,
        mockContext,
        {
          outputFormat: LLMOutputFormat.JSON,
          jsonSchema: apiResponseSchema,
        },
        false,
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.success).toBe(true);
        expect(result.data.data.items).toHaveLength(2);
        expect(result.data.data.items[0].name).toBe("Product A");
        expect(result.data.data.items[0].tags).toContain("sale");
        expect(result.data.data.pagination.hasMore).toBe(true);
      }
    });

    test("should validate discriminated union types correctly", () => {
      const eventSchema = z.discriminatedUnion("type", [
        z.object({
          type: z.literal("click"),
          elementId: z.string(),
          timestamp: z.number(),
        }),
        z.object({
          type: z.literal("scroll"),
          position: z.number(),
          direction: z.enum(["up", "down"]),
          timestamp: z.number(),
        }),
        z.object({
          type: z.literal("submit"),
          formId: z.string(),
          values: z.record(z.unknown()),
          timestamp: z.number(),
        }),
      ]);

      const clickEvent = JSON.stringify({
        type: "click",
        elementId: "button-submit",
        timestamp: 1704067200000,
      });

      const clickResult = processJson(
        clickEvent,
        mockContext,
        {
          outputFormat: LLMOutputFormat.JSON,
          jsonSchema: eventSchema,
        },
        false,
      );

      expect(clickResult.success).toBe(true);
      if (clickResult.success) {
        expect(clickResult.data.type).toBe("click");
        if (clickResult.data.type === "click") {
          expect(clickResult.data.elementId).toBe("button-submit");
        }
      }

      const scrollEvent = JSON.stringify({
        type: "scroll",
        position: 500,
        direction: "down",
        timestamp: 1704067200000,
      });

      const scrollResult = processJson(
        scrollEvent,
        mockContext,
        {
          outputFormat: LLMOutputFormat.JSON,
          jsonSchema: eventSchema,
        },
        false,
      );

      expect(scrollResult.success).toBe(true);
      if (scrollResult.success) {
        expect(scrollResult.data.type).toBe("scroll");
        if (scrollResult.data.type === "scroll") {
          expect(scrollResult.data.direction).toBe("down");
        }
      }
    });
  });

  describe("Real-World Schema Validation", () => {
    test("should handle source code summary schema", () => {
      const sourceSummarySchema = z.object({
        purpose: z.string(),
        implementation: z.string(),
        namespace: z.string().optional(),
        imports: z.array(z.string()).optional(),
        exports: z.array(z.string()).optional(),
        dependencies: z.array(z.string()).optional(),
        complexity: z.number().optional(),
      });

      const mockSummary = JSON.stringify({
        purpose: "Provides utility functions for string manipulation",
        implementation: "Contains pure functions for text processing, trimming, and formatting",
        namespace: "utils.string",
        imports: ["lodash", "validator"],
        exports: ["trim", "capitalize", "slugify"],
        dependencies: [],
        complexity: 2,
      });

      const result = processJson(
        mockSummary,
        mockContext,
        {
          outputFormat: LLMOutputFormat.JSON,
          jsonSchema: sourceSummarySchema,
        },
        false,
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.purpose).toContain("utility functions");
        expect(result.data.imports).toContain("lodash");
        expect(result.data.exports).toHaveLength(3);
        expect(result.data.complexity).toBe(2);
      }
    });

    test("should handle insight generation schema", () => {
      const insightSchema = z.object({
        categories: z.array(z.string()),
        technologies: z.array(
          z.object({
            name: z.string(),
            type: z.string(),
            version: z.string().optional(),
            confidence: z.number(),
          }),
        ),
        patterns: z.array(
          z.object({
            name: z.string(),
            description: z.string(),
            instances: z.number(),
          }),
        ),
        metrics: z.object({
          totalFiles: z.number(),
          linesOfCode: z.number(),
          complexity: z.number(),
        }),
      });

      const mockInsight = JSON.stringify({
        categories: ["web", "api", "database"],
        technologies: [
          { name: "TypeScript", type: "language", version: "5.0", confidence: 0.95 },
          { name: "Express", type: "framework", confidence: 0.85 },
          { name: "PostgreSQL", type: "database", version: "14", confidence: 0.9 },
        ],
        patterns: [
          { name: "Repository Pattern", description: "Data access abstraction", instances: 12 },
          { name: "Dependency Injection", description: "IoC container usage", instances: 45 },
        ],
        metrics: {
          totalFiles: 150,
          linesOfCode: 12500,
          complexity: 3.2,
        },
      });

      const result = processJson(
        mockInsight,
        mockContext,
        {
          outputFormat: LLMOutputFormat.JSON,
          jsonSchema: insightSchema,
        },
        false,
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.technologies).toHaveLength(3);
        expect(result.data.technologies[0].name).toBe("TypeScript");
        expect(result.data.patterns[0].instances).toBe(12);
        expect(result.data.metrics.totalFiles).toBe(150);
      }
    });
  });

  describe("Error Handling and Recovery", () => {
    test("should fail validation for schema mismatch", () => {
      const strictSchema = z.object({
        name: z.string(),
        age: z.number(),
        active: z.boolean(),
      });

      const invalidData = JSON.stringify({
        name: "Test",
        age: "not a number",
        active: true,
      });

      const result = processJson(
        invalidData,
        mockContext,
        {
          outputFormat: LLMOutputFormat.JSON,
          jsonSchema: strictSchema,
        },
        false,
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeDefined();
      }
    });

    test("should handle malformed JSON gracefully", () => {
      const schema = z.object({ test: z.string() });

      // Fundamentally broken JSON that sanitizers can't fix
      const malformedJson = "this is not json at all, just plain text";

      const result = processJson(
        malformedJson,
        mockContext,
        {
          outputFormat: LLMOutputFormat.JSON,
          jsonSchema: schema,
        },
        false,
      );

      expect(result.success).toBe(false);
    });

    test("should validate with transforms applied", () => {
      const schema = z.object({
        count: z.number(),
        items: z.array(z.string()),
      });

      // This might need transforms to pass validation
      const dataWithIssues = JSON.stringify({
        count: 5,
        items: [],
      });

      const result = processJson(
        dataWithIssues,
        mockContext,
        {
          outputFormat: LLMOutputFormat.JSON,
          jsonSchema: schema,
        },
        false,
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.count).toBe(5);
        expect(result.data.items).toEqual([]);
      }
    });
  });

  describe("Performance and Edge Cases", () => {
    test("should handle large nested structures", () => {
      const largeSchema = z.object({
        level1: z.object({
          level2: z.object({
            level3: z.object({
              level4: z.object({
                level5: z.object({
                  data: z.string(),
                  count: z.number(),
                }),
              }),
            }),
          }),
        }),
      });

      const largeData = JSON.stringify({
        level1: {
          level2: {
            level3: {
              level4: {
                level5: {
                  data: "deep value",
                  count: 42,
                },
              },
            },
          },
        },
      });

      const result = processJson(
        largeData,
        mockContext,
        {
          outputFormat: LLMOutputFormat.JSON,
          jsonSchema: largeSchema,
        },
        false,
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.level1.level2.level3.level4.level5.data).toBe("deep value");
      }
    });

    test("should handle arrays with many items", () => {
      const arraySchema = z.array(
        z.object({
          id: z.number(),
          value: z.string(),
        }),
      );

      const items = Array.from({ length: 100 }, (_, i) => ({
        id: i,
        value: `item-${i}`,
      }));

      const largeArray = JSON.stringify(items);

      const result = processJson(
        largeArray,
        mockContext,
        {
          outputFormat: LLMOutputFormat.JSON,
          jsonSchema: arraySchema,
        },
        false,
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(100);
        expect(result.data[50].id).toBe(50);
      }
    });
  });
});
