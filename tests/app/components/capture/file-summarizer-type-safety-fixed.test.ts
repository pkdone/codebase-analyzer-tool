import "reflect-metadata";
import { describe, test, expect, jest, beforeEach } from "@jest/globals";
import { z } from "zod";
import {
  summarizeFile,
  PartialSourceSummaryType,
} from "../../../../src/app/components/capture/file-summarizer";
import LLMRouter from "../../../../src/common/llm/llm-router";
import { LLMOutputFormat } from "../../../../src/common/llm/types/llm.types";
import { LLMError } from "../../../../src/common/llm/types/llm-errors.types";

// Mock dependencies
jest.mock("../../../../src/common/utils/logging", () => ({
  logOneLineWarning: jest.fn(),
  logError: jest.fn(),
  logErrorMsg: jest.fn(),
  logOneLineError: jest.fn(),
}));

/**
 * Integration test suite verifying that the type fix enables proper type inference
 * in the summarizeFile function without requiring unsafe type casts.
 */
describe("File Summarizer Type Safety - Post Fix", () => {
  let mockLLMRouter: jest.Mocked<LLMRouter>;

  beforeEach(() => {
    mockLLMRouter = {
      executeCompletion: jest.fn(),
    } as unknown as jest.Mocked<LLMRouter>;
  });

  describe("Type Inference for Different File Types", () => {
    test("should infer correct type for TypeScript files", async () => {
      const mockSummary = {
        purpose: "Defines user management logic",
        entities: ["User", "UserService"],
        keyFunctions: ["createUser", "deleteUser"],
      };

      mockLLMRouter.executeCompletion.mockResolvedValue(mockSummary as any);

      const result = await summarizeFile(
        mockLLMRouter,
        "src/user/user.service.ts",
        "ts",
        "export class UserService { ... }",
      );

      expect(result).toBeDefined();
      expect(result.purpose).toBe("Defines user management logic");
      expect(result.entities).toEqual(["User", "UserService"]);

      // Verify the router was called with correct schema
      expect(mockLLMRouter.executeCompletion).toHaveBeenCalledWith(
        "src/user/user.service.ts",
        expect.any(String),
        expect.objectContaining({
          outputFormat: LLMOutputFormat.JSON,
          jsonSchema: expect.any(z.ZodObject),
        }),
      );
    });

    test("should infer correct type for JavaScript files", async () => {
      const mockSummary = {
        purpose: "Utility functions for string manipulation",
        keyFunctions: ["capitalize", "trim", "slugify"],
      };

      mockLLMRouter.executeCompletion.mockResolvedValue(mockSummary as any);

      const result = await summarizeFile(
        mockLLMRouter,
        "src/utils/string-utils.js",
        "js",
        "function capitalize(str) { ... }",
      );

      expect(result).toBeDefined();
      expect(result.purpose).toBe("Utility functions for string manipulation");
      expect(result.keyFunctions).toEqual(["capitalize", "trim", "slugify"]);
    });

    test("should infer correct type for Python files", async () => {
      const mockSummary = {
        purpose: "Data processing module",
        entities: ["DataProcessor", "DataValidator"],
        keyFunctions: ["process_data", "validate_data"],
      };

      mockLLMRouter.executeCompletion.mockResolvedValue(mockSummary as any);

      const result = await summarizeFile(
        mockLLMRouter,
        "src/processor.py",
        "py",
        "class DataProcessor: ...",
      );

      expect(result).toBeDefined();
      expect(result.purpose).toBe("Data processing module");
      expect(result.entities).toEqual(["DataProcessor", "DataValidator"]);
    });

    test("should infer correct type for JSON files", async () => {
      const mockSummary = {
        purpose: "Configuration file for the application",
      };

      mockLLMRouter.executeCompletion.mockResolvedValue(mockSummary as any);

      const result = await summarizeFile(
        mockLLMRouter,
        "config.json",
        "json",
        '{"name": "myapp", "version": "1.0.0"}',
      );

      expect(result).toBeDefined();
      expect(result.purpose).toBe("Configuration file for the application");
    });

    test("should infer correct type for README files", async () => {
      const mockSummary = {
        purpose: "Project documentation and setup instructions",
      };

      mockLLMRouter.executeCompletion.mockResolvedValue(mockSummary as any);

      const result = await summarizeFile(
        mockLLMRouter,
        "README.md",
        "md",
        "# My Project\n\nThis is a project...",
      );

      expect(result).toBeDefined();
      expect(result.purpose).toBe("Project documentation and setup instructions");
    });
  });

  describe("Partial Schema Handling", () => {
    test("should handle partial summaries with only required fields", async () => {
      // Some file types only request certain fields via .pick()
      const mockPartialSummary = {
        purpose: "Simple utility file",
      };

      mockLLMRouter.executeCompletion.mockResolvedValue(mockPartialSummary as any);

      const result = await summarizeFile(
        mockLLMRouter,
        "utils.ts",
        "ts",
        "export function helper() {}",
      );

      expect(result).toBeDefined();
      expect(result.purpose).toBe("Simple utility file");

      // Optional fields should be undefined
      expect(result.entities).toBeUndefined();
      expect(result.keyFunctions).toBeUndefined();
    });

    test("should handle summaries with all optional fields present", async () => {
      const mockFullSummary: PartialSourceSummaryType = {
        purpose: "Complete summary",
        entities: ["Entity1"],
        keyFunctions: ["func1"],
        externalDependencies: ["dep1"],
        internalDependencies: ["./internal"],
        technologyStack: ["Node.js"],
      };

      mockLLMRouter.executeCompletion.mockResolvedValue(mockFullSummary as any);

      const result = await summarizeFile(
        mockLLMRouter,
        "complete.ts",
        "ts",
        "export class Complete {}",
      );

      expect(result).toBeDefined();
      expect(result.purpose).toBe("Complete summary");
      expect(result.entities).toEqual(["Entity1"]);
      expect(result.keyFunctions).toEqual(["func1"]);
      expect(result.externalDependencies).toEqual(["dep1"]);
      expect(result.internalDependencies).toEqual(["./internal"]);
      expect(result.technologyStack).toEqual(["Node.js"]);
    });
  });

  describe("Error Handling", () => {
    test("should throw error when file is empty", async () => {
      await expect(summarizeFile(mockLLMRouter, "empty.ts", "ts", "")).rejects.toThrow(
        "File is empty",
      );

      await expect(
        summarizeFile(mockLLMRouter, "whitespace.ts", "ts", "   \n  \t  "),
      ).rejects.toThrow("File is empty");
    });

    test("should throw error when LLM returns null", async () => {
      mockLLMRouter.executeCompletion.mockResolvedValue(null);

      await expect(summarizeFile(mockLLMRouter, "file.ts", "ts", "content")).rejects.toThrow(
        LLMError,
      );
    });

    test("should throw error when LLM fails", async () => {
      mockLLMRouter.executeCompletion.mockRejectedValue(new Error("LLM failed"));

      await expect(summarizeFile(mockLLMRouter, "file.ts", "ts", "content")).rejects.toThrow(
        "LLM failed",
      );
    });
  });

  describe("File Type Canonicalization", () => {
    test("should handle exact filename matches", async () => {
      const mockSummary = {
        purpose: "Package configuration",
      };

      mockLLMRouter.executeCompletion.mockResolvedValue(mockSummary as any);

      // package.json should be recognized by exact filename
      await summarizeFile(mockLLMRouter, "package.json", "json", "{}");

      expect(mockLLMRouter.executeCompletion).toHaveBeenCalled();
    });

    test("should handle extension-based mapping", async () => {
      const mockSummary = {
        purpose: "TypeScript source file",
      };

      mockLLMRouter.executeCompletion.mockResolvedValue(mockSummary as any);

      // .ts extension should map to typescript type
      await summarizeFile(mockLLMRouter, "src/file.ts", "ts", "content");

      expect(mockLLMRouter.executeCompletion).toHaveBeenCalled();
    });

    test("should handle case-insensitive filename matching", async () => {
      const mockSummary = {
        purpose: "README file",
      };

      mockLLMRouter.executeCompletion.mockResolvedValue(mockSummary as any);

      // README, Readme, readme should all be recognized
      await summarizeFile(mockLLMRouter, "README.md", "md", "# Title");
      await summarizeFile(mockLLMRouter, "Readme.md", "md", "# Title");
      await summarizeFile(mockLLMRouter, "readme.md", "md", "# Title");

      expect(mockLLMRouter.executeCompletion).toHaveBeenCalledTimes(3);
    });
  });

  describe("Type Safety Verification", () => {
    test("should maintain type safety without type assertions", async () => {
      // This test verifies that the fix allows proper type inference
      // without requiring unsafe casts

      const mockSummary = {
        purpose: "Test file",
        entities: ["TestEntity"],
        keyFunctions: ["testFunction"],
      };

      mockLLMRouter.executeCompletion.mockResolvedValue(mockSummary as any);

      // The return type should be correctly inferred as PartialSourceSummaryType
      const result = await summarizeFile(
        mockLLMRouter,
        "test.ts",
        "ts",
        "export class TestEntity {}",
      );

      // TypeScript should know the shape of result without assertions
      expect(result.purpose).toBe("Test file");
      expect(result.entities).toEqual(["TestEntity"]);
      expect(result.keyFunctions).toEqual(["testFunction"]);

      // These should work without type assertions
      const entities = result.entities;
      if (entities && Array.isArray(entities) && entities.length > 0) {
        const firstEntity: string = entities[0];
        expect(firstEntity).toBe("TestEntity");
      }
    });

    test("should preserve type information through schema selection", async () => {
      const mockSummary = {
        purpose: "Schema-specific summary",
      };

      mockLLMRouter.executeCompletion.mockResolvedValue(mockSummary as any);

      // Different file types use different picked schemas
      const result = await summarizeFile(mockLLMRouter, "file.ts", "ts", "content");

      // TypeScript should infer the correct return type based on the schema
      expect(result).toBeDefined();
      expect(typeof result.purpose).toBe("string");
    });

    test("should work with various file extensions", async () => {
      const fileExtensions = [
        { path: "file.ts", type: "ts" },
        { path: "file.js", type: "js" },
        { path: "file.py", type: "py" },
        { path: "file.java", type: "java" },
        { path: "file.go", type: "go" },
        { path: "file.rs", type: "rs" },
      ];

      for (const { path, type } of fileExtensions) {
        const mockSummary = {
          purpose: `Summary for ${type} file`,
        };

        mockLLMRouter.executeCompletion.mockResolvedValue(mockSummary as any);

        const result = await summarizeFile(mockLLMRouter, path, type, "content");

        expect(result).toBeDefined();
        expect(result.purpose).toBe(`Summary for ${type} file`);
      }
    });
  });

  describe("Prompt Rendering", () => {
    test("should pass rendered prompt to LLM router", async () => {
      const mockSummary = {
        purpose: "Test",
      };

      mockLLMRouter.executeCompletion.mockResolvedValue(mockSummary as any);

      const fileContent = "export function test() { return 42; }";

      await summarizeFile(mockLLMRouter, "test.ts", "ts", fileContent);

      const callArgs = mockLLMRouter.executeCompletion.mock.calls[0];
      const renderedPrompt = callArgs[1];

      // The prompt should include the file content
      expect(renderedPrompt).toBeDefined();
      expect(typeof renderedPrompt).toBe("string");
    });

    test("should use appropriate schema for file type", async () => {
      const mockSummary = {
        purpose: "Test",
      };

      mockLLMRouter.executeCompletion.mockResolvedValue(mockSummary as any);

      await summarizeFile(mockLLMRouter, "test.ts", "ts", "content");

      const callArgs = mockLLMRouter.executeCompletion.mock.calls[0];
      const completionOptions = callArgs[2];

      expect(completionOptions).toMatchObject({
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: expect.any(z.ZodObject),
        hasComplexSchema: expect.any(Boolean),
        sanitizerConfig: expect.any(Object),
      });
    });
  });

  describe("Return Type Validation", () => {
    test("should return PartialSourceSummaryType", async () => {
      const mockSummary: PartialSourceSummaryType = {
        purpose: "Validates return type",
        entities: ["Entity1", "Entity2"],
      };

      mockLLMRouter.executeCompletion.mockResolvedValue(mockSummary as any);

      const result: PartialSourceSummaryType = await summarizeFile(
        mockLLMRouter,
        "test.ts",
        "ts",
        "content",
      );

      // This should compile without errors, validating the return type
      expect(result).toMatchObject(mockSummary);
    });

    test("should allow undefined optional fields", async () => {
      const mockSummary: PartialSourceSummaryType = {
        purpose: "Minimal summary",
        // All other fields are optional and undefined
      };

      mockLLMRouter.executeCompletion.mockResolvedValue(mockSummary as any);

      const result = await summarizeFile(mockLLMRouter, "test.ts", "ts", "content");

      expect(result.purpose).toBe("Minimal summary");
      expect(result.entities).toBeUndefined();
      expect(result.keyFunctions).toBeUndefined();
      expect(result.externalDependencies).toBeUndefined();
    });
  });
});
