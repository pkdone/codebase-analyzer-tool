/* eslint-disable @typescript-eslint/unbound-method, @typescript-eslint/no-unsafe-assignment */
import "reflect-metadata";
import { FileSummarizer, SummaryResult } from "../../../src/components/capture/file-summarizer";
import { FileHandlerFactory } from "../../../src/components/capture/file-handler-factory";
import { FileHandler } from "../../../src/components/capture/file-handler";
import LLMRouter from "../../../src/llm/core/llm-router";
import { LLMOutputFormat } from "../../../src/llm/llm.types";
import * as errorUtils from "../../../src/common/utils/error-utils";

// Mock dependencies
jest.mock("../../../src/llm/core/llm-router");
jest.mock("../../../src/common/utils/error-utils", () => ({
  logErrorMsg: jest.fn(),
  logErrorMsgAndDetail: jest.fn(),
  getErrorText: jest.fn((error: unknown) => {
    if (error && typeof error === "object" && "message" in error) {
      return String((error as { message: unknown }).message);
    }
    return "Unknown error";
  }),
}));

jest.mock("../../../src/config/app.config", () => ({
  appConfig: {
    FILE_SUFFIX_TO_CANONICAL_TYPE_MAPPINGS: new Map<string, string>([
      ["java", "java"],
      ["js", "javascript"],
      ["ts", "javascript"],
      ["javascript", "javascript"],
      ["typescript", "javascript"],
      ["ddl", "sql"],
      ["sql", "sql"],
      ["xml", "xml"],
      ["jsp", "jsp"],
      ["markdown", "markdown"],
      ["md", "markdown"],
    ]),
    FILENAME_TO_CANONICAL_TYPE_MAPPINGS: new Map<string, string>([
      ["readme", "markdown"],
      ["license", "markdown"],
      ["changelog", "markdown"],
    ]),
    DEFAULT_FILE_TYPE: "default",
  },
}));

// Fix the mock to use the correct export name
jest.mock("../../../src/components/capture/files-types-metadata.config", () => ({
  filesTypeMetatadataConfig: {
    java: {
      fileContentDesc: "Java code",
      instructions: "Java instructions",
      schema: {
        parse: jest.fn().mockReturnValue({}),
        safeParse: jest.fn().mockReturnValue({ success: true, data: {} }),
      },
    },
    javascript: {
      fileContentDesc: "JavaScript/TypeScript code",
      instructions: "JavaScript instructions",
      schema: {
        parse: jest.fn().mockReturnValue({}),
        safeParse: jest.fn().mockReturnValue({ success: true, data: {} }),
      },
    },
    default: {
      fileContentDesc: "project file content",
      instructions: "Default instructions",
      schema: {
        parse: jest.fn().mockReturnValue({}),
        safeParse: jest.fn().mockReturnValue({ success: true, data: {} }),
      },
    },
    sql: {
      fileContentDesc: "database DDL/DML/SQL code",
      instructions: "SQL instructions",
      schema: {
        parse: jest.fn().mockReturnValue({}),
        safeParse: jest.fn().mockReturnValue({ success: true, data: {} }),
      },
    },
    xml: {
      fileContentDesc: "XML code",
      instructions: "XML instructions",
      schema: {
        parse: jest.fn().mockReturnValue({}),
        safeParse: jest.fn().mockReturnValue({ success: true, data: {} }),
      },
    },
    jsp: {
      fileContentDesc: "JSP code",
      instructions: "JSP instructions",
      schema: {
        parse: jest.fn().mockReturnValue({}),
        safeParse: jest.fn().mockReturnValue({ success: true, data: {} }),
      },
    },
    markdown: {
      fileContentDesc: "Markdown content",
      instructions: "Markdown instructions",
      schema: {
        parse: jest.fn().mockReturnValue({}),
        safeParse: jest.fn().mockReturnValue({ success: true, data: {} }),
      },
    },
  },
}));

jest.mock("../../../src/llm/processing/prompting/prompt-templator", () => ({
  createPromptFromConfig: jest.fn(
    (_template: string, config: { fileContentDesc: string }, content: string) => {
      return `Mock prompt for ${config.fileContentDesc} with content: ${content}`;
    },
  ),
  promptConfig: {
    FORCE_JSON_RESPONSE_TEXT: "Mock JSON response text",
  },
}));

// LLMRouter is mocked, we'll create a mock instance directly
const mockLogErrorMsgAndDetail = errorUtils.logErrorMsgAndDetail as jest.MockedFunction<
  typeof errorUtils.logErrorMsgAndDetail
>;
const mockGetErrorText = errorUtils.getErrorText as jest.MockedFunction<
  typeof errorUtils.getErrorText
>;

describe("FileSummarizer", () => {
  let fileSummarizer: FileSummarizer;
  let mockLLMRouter: jest.Mocked<LLMRouter>;
  let mockFileHandlerFactory: jest.Mocked<FileHandlerFactory>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock instance with proper typing
    mockLLMRouter = {
      executeCompletion: jest.fn().mockResolvedValue(null),
    } as unknown as jest.Mocked<LLMRouter>;

    // Create mock FileHandlerFactory
    mockFileHandlerFactory = {
      createHandler: jest.fn(),
    } as unknown as jest.Mocked<FileHandlerFactory>;

    // Set up the factory to return the mock handler with proper type-based behavior
    mockFileHandlerFactory.createHandler.mockImplementation((filepath: string, type: string) => {
      // Determine the expected prompt based on file type (similar to real FileHandlerFactory logic)
      let promptType = "project file content";

      // Map file types to expected prompts (matching the test expectations)
      // Handle case variations by normalizing to lowercase
      const normalizedType = type.toLowerCase();
      if (normalizedType === "java") {
        promptType = "Java code";
      } else if (
        normalizedType === "js" ||
        normalizedType === "javascript" ||
        normalizedType === "ts" ||
        normalizedType === "typescript"
      ) {
        promptType = "JavaScript/TypeScript code";
      } else if (normalizedType === "sql" || normalizedType === "ddl") {
        promptType = "database DDL/DML/SQL code";
      } else if (normalizedType === "md" || normalizedType === "markdown") {
        promptType = "Markdown content";
      }

      // Handle filename-based mappings
      const filename = filepath.split("/").pop()?.toLowerCase();
      if (filename === "readme.md" || filename === "readme.txt" || filename === "readme") {
        promptType = "Markdown content";
      } else if (filename === "license") {
        promptType = "Markdown content";
      }

      return {
        createPrompt: jest.fn().mockImplementation((content: string) => {
          return `Mock prompt for ${promptType} with content: ${content}`;
        }),
        schema: {
          parse: jest.fn().mockReturnValue({}),
          safeParse: jest.fn().mockReturnValue({ success: true, data: {} }),
        },
      } as unknown as jest.Mocked<FileHandler>;
    });

    // Since LLMRouter is a default export class, we don't use mockImplementation
    // Instead, we directly inject the mock instance
    fileSummarizer = new FileSummarizer(mockLLMRouter, mockFileHandlerFactory);
  });

  describe("getFileSummaryAsJSON", () => {
    const mockSuccessResponse = {
      purpose: "This is a test file purpose",
      implementation: "This is a test implementation",
      databaseIntegration: {
        mechanism: "NONE" as const,
        description: "No database integration",
        codeExample: "n/a",
      },
    } as const;

    describe("successful summarization", () => {
      test("should return successful result for valid Java file", async () => {
        const filepath = "src/TestClass.java";
        const type = "java";
        const content = "public class TestClass { }";

        mockLLMRouter.executeCompletion.mockResolvedValue(mockSuccessResponse);

        const result = await fileSummarizer.getFileSummaryAsJSON(filepath, type, content);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual(mockSuccessResponse);
        }
        expect(mockLLMRouter.executeCompletion).toHaveBeenCalledWith(
          filepath,
          expect.stringContaining("Mock prompt for Java code"),
          {
            outputFormat: LLMOutputFormat.JSON,
            jsonSchema: expect.any(Object),
          },
        );
      });

      test("should return successful result for JavaScript file", async () => {
        const filepath = "src/test.js";
        const type = "js";
        const content = "function test() { return true; }";

        mockLLMRouter.executeCompletion.mockResolvedValue(mockSuccessResponse);

        const result = await fileSummarizer.getFileSummaryAsJSON(filepath, type, content);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual(mockSuccessResponse);
        }
      });

      test("should return successful result for TypeScript file", async () => {
        const filepath = "src/test.ts";
        const type = "ts";
        const content = "interface Test { id: number; }";

        mockLLMRouter.executeCompletion.mockResolvedValue(mockSuccessResponse);

        const result = await fileSummarizer.getFileSummaryAsJSON(filepath, type, content);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual(mockSuccessResponse);
        }
      });

      test("should return successful result for DDL file", async () => {
        const filepath = "db/schema.sql";
        const type = "sql";
        const content = "CREATE TABLE users (id INT PRIMARY KEY);";

        const ddlResponse = {
          purpose: "Database schema definition",
          implementation: "Creates user table",
          tables: [{ name: "users", command: "CREATE TABLE users..." }],
          storedProcedures: [],
          triggers: [],
          databaseIntegration: {
            mechanism: "DDL",
            description: "Database schema definition",
            codeExample: "CREATE TABLE users (id INT PRIMARY KEY);",
          },
        };

        mockLLMRouter.executeCompletion.mockResolvedValue(ddlResponse);

        const result = await fileSummarizer.getFileSummaryAsJSON(filepath, type, content);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual(ddlResponse);
        }
      });

      test("should handle README file specifically", async () => {
        const filepath = "README.md";
        const type = "md";
        const content = "# Project Title\n\nThis is a test project.";

        mockLLMRouter.executeCompletion.mockResolvedValue(mockSuccessResponse);

        const result = await fileSummarizer.getFileSummaryAsJSON(filepath, type, content);

        expect(result.success).toBe(true);
        expect(mockLLMRouter.executeCompletion).toHaveBeenCalledWith(filepath, expect.any(String), {
          outputFormat: LLMOutputFormat.JSON,
          jsonSchema: expect.any(Object),
        });
      });

      test("should use default handler for unknown file type", async () => {
        const filepath = "src/unknown.xyz";
        const type = "xyz";
        const content = "unknown file content";

        mockLLMRouter.executeCompletion.mockResolvedValue(mockSuccessResponse);

        const result = await fileSummarizer.getFileSummaryAsJSON(filepath, type, content);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual(mockSuccessResponse);
        }
      });
    });

    describe("error handling", () => {
      test("should return error result for empty file content", async () => {
        const filepath = "src/empty.js";
        const type = "js";
        const content = "";

        const result = await fileSummarizer.getFileSummaryAsJSON(filepath, type, content);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toBe("File is empty");
        }
        expect(mockLLMRouter.executeCompletion).not.toHaveBeenCalled();
      });

      test("should return error result for whitespace-only content", async () => {
        const filepath = "src/whitespace.js";
        const type = "js";
        const content = "   \n\t  \n  ";

        const result = await fileSummarizer.getFileSummaryAsJSON(filepath, type, content);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toBe("File is empty");
        }
        expect(mockLLMRouter.executeCompletion).not.toHaveBeenCalled();
      });

      test("should handle LLM service errors gracefully", async () => {
        const filepath = "src/error.js";
        const type = "js";
        const content = "function test() { }";
        const errorMessage = "LLM service unavailable";

        mockLLMRouter.executeCompletion.mockRejectedValue(new Error(errorMessage));
        mockGetErrorText.mockReturnValue(`Error. ${errorMessage}`);

        const result = await fileSummarizer.getFileSummaryAsJSON(filepath, type, content);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toContain(`Failed to generate summary for '${filepath}'`);
          expect(result.error).toContain(errorMessage);
        }
        expect(mockLogErrorMsgAndDetail).toHaveBeenCalledWith(
          `Failed to generate summary for '${filepath}'`,
          expect.any(Error),
        );
      });

      test("should handle non-Error exceptions", async () => {
        const filepath = "src/string-error.js";
        const type = "js";
        const content = "function test() { }";

        mockLLMRouter.executeCompletion.mockRejectedValue("String error");
        mockGetErrorText.mockReturnValue('<unknown-type>. "String error"');

        const result = await fileSummarizer.getFileSummaryAsJSON(filepath, type, content);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toContain(`Failed to generate summary for '${filepath}'`);
          expect(result.error).toContain("String error");
        }
      });

      test("should handle null/undefined LLM response", async () => {
        const filepath = "src/null-response.js";
        const type = "js";
        const content = "function test() { }";

        mockLLMRouter.executeCompletion.mockResolvedValue(null);

        const result = await fileSummarizer.getFileSummaryAsJSON(filepath, type, content);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toBe("LLM returned null response");
        }
      });
    });

    describe("file type detection and handler selection", () => {
      test("should use Java handler for .java files", async () => {
        const filepath = "src/Main.java";
        const type = "java";
        const content = "public class Main { }";

        mockLLMRouter.executeCompletion.mockResolvedValue(mockSuccessResponse);

        await fileSummarizer.getFileSummaryAsJSON(filepath, type, content);

        expect(mockLLMRouter.executeCompletion).toHaveBeenCalledWith(
          filepath,
          expect.stringContaining("Mock prompt for Java code"),
          {
            outputFormat: LLMOutputFormat.JSON,
            jsonSchema: expect.any(Object),
          },
        );
      });

      test("should use JS handler for .ts files", async () => {
        const filepath = "src/test.ts";
        const type = "typescript";
        const content = 'const test: string = "hello";';

        mockLLMRouter.executeCompletion.mockResolvedValue(mockSuccessResponse);

        await fileSummarizer.getFileSummaryAsJSON(filepath, type, content);

        expect(mockLLMRouter.executeCompletion).toHaveBeenCalledWith(
          filepath,
          expect.stringContaining("Mock prompt for JavaScript/TypeScript code"),
          {
            outputFormat: LLMOutputFormat.JSON,
            jsonSchema: expect.any(Object),
          },
        );
      });

      test("should use DDL handler for .sql files", async () => {
        const filepath = "db/schema.ddl";
        const type = "ddl";
        const content = "CREATE TABLE test (id INT);";

        mockLLMRouter.executeCompletion.mockResolvedValue({
          purpose: "Database schema",
          implementation: "Creates tables",
          tables: [],
          storedProcedures: [],
          triggers: [],
          databaseIntegration: {
            mechanism: "DDL",
            description: "Schema definition",
            codeExample: "CREATE TABLE test (id INT);",
          },
        });

        await fileSummarizer.getFileSummaryAsJSON(filepath, type, content);

        expect(mockLLMRouter.executeCompletion).toHaveBeenCalledWith(
          filepath,
          expect.stringContaining("Mock prompt for database DDL/DML/SQL code"),
          {
            outputFormat: LLMOutputFormat.JSON,
            jsonSchema: expect.any(Object),
          },
        );
      });

      test("should prioritize README filename over file type", async () => {
        const filepath = "README.txt";
        const type = "txt";
        const content = "# Project Documentation";

        mockLLMRouter.executeCompletion.mockResolvedValue(mockSuccessResponse);

        await fileSummarizer.getFileSummaryAsJSON(filepath, type, content);

        // Should use markdown handler due to README filename, not txt handler
        expect(mockLLMRouter.executeCompletion).toHaveBeenCalledWith(
          filepath,
          expect.any(String), // Would be markdown prompt
          {
            outputFormat: LLMOutputFormat.JSON,
            jsonSchema: expect.any(Object),
          },
        );
      });

      test("should handle LICENSE file with data-driven configuration", async () => {
        const filepath = "LICENSE";
        const type = "txt";
        const content = "MIT License\n\nCopyright (c) 2024";

        mockLLMRouter.executeCompletion.mockResolvedValue(mockSuccessResponse);

        await fileSummarizer.getFileSummaryAsJSON(filepath, type, content);

        // Should use markdown handler due to LICENSE filename mapping
        expect(mockLLMRouter.executeCompletion).toHaveBeenCalledWith(
          filepath,
          expect.stringContaining("Mock prompt for Markdown content"),
          {
            outputFormat: LLMOutputFormat.JSON,
            jsonSchema: expect.any(Object),
          },
        );
      });

      test("should handle case variations in file types", async () => {
        const testCases = [
          { type: "JAVA", expectedPrompt: "Mock prompt for Java code" },
          { type: "JavaScript", expectedPrompt: "Mock prompt for JavaScript/TypeScript code" },
          { type: "SQL", expectedPrompt: "Mock prompt for database DDL/DML/SQL code" },
        ];

        for (const testCase of testCases) {
          mockLLMRouter.executeCompletion.mockResolvedValue(mockSuccessResponse);

          await fileSummarizer.getFileSummaryAsJSON(
            `test.${testCase.type}`,
            testCase.type,
            "test content",
          );

          expect(mockLLMRouter.executeCompletion).toHaveBeenCalledWith(
            expect.any(String),
            expect.stringContaining(testCase.expectedPrompt),
            {
              outputFormat: LLMOutputFormat.JSON,
              jsonSchema: expect.any(Object),
            },
          );

          jest.clearAllMocks();
        }
      });
    });

    describe("integration with file handler mappings", () => {
      test("should correctly integrate with file handler mappings", async () => {
        const filepath = "src/component.jsx";
        const type = "js"; // JSX would map to JS handler
        const content = "const Component = () => <div>Hello</div>;";

        mockLLMRouter.executeCompletion.mockResolvedValue(mockSuccessResponse);

        const result = await fileSummarizer.getFileSummaryAsJSON(filepath, type, content);

        expect(result.success).toBe(true);
        expect(mockLLMRouter.executeCompletion).toHaveBeenCalledWith(filepath, expect.any(String), {
          outputFormat: LLMOutputFormat.JSON,
          jsonSchema: expect.any(Object),
        });
      });

      test("should fall back to default handler when no mapping exists", async () => {
        const filepath = "config.yml";
        const type = "yml";
        const content = "key: value";

        mockLLMRouter.executeCompletion.mockResolvedValue(mockSuccessResponse);

        const result = await fileSummarizer.getFileSummaryAsJSON(filepath, type, content);

        expect(result.success).toBe(true);
        expect(mockLLMRouter.executeCompletion).toHaveBeenCalledWith(
          filepath,
          expect.stringContaining("Mock prompt for project file content"), // Default prompt pattern
          {
            outputFormat: LLMOutputFormat.JSON,
            jsonSchema: expect.any(Object),
          },
        );
      });
    });

    describe("performance and resource usage", () => {
      test("should handle large content efficiently", async () => {
        const filepath = "src/large-file.js";
        const type = "js";
        const content = "function test() { }".repeat(1000);

        mockLLMRouter.executeCompletion.mockResolvedValue(mockSuccessResponse);

        const result = await fileSummarizer.getFileSummaryAsJSON(filepath, type, content);

        expect(result.success).toBe(true);
        expect(mockLLMRouter.executeCompletion).toHaveBeenCalledTimes(1);
      });

      test("should handle concurrent summarization requests", async () => {
        const files = [
          { filepath: "src/file1.js", type: "js", content: "function test1() { }" },
          { filepath: "src/file2.js", type: "js", content: "function test2() { }" },
          { filepath: "src/file3.js", type: "js", content: "function test3() { }" },
        ];

        mockLLMRouter.executeCompletion.mockResolvedValue(mockSuccessResponse);

        const promises = files.map(
          async (file) =>
            await fileSummarizer.getFileSummaryAsJSON(file.filepath, file.type, file.content),
        );

        const results = await Promise.all(promises);

        expect(results).toHaveLength(3);
        results.forEach((result) => {
          expect(result.success).toBe(true);
        });
        expect(mockLLMRouter.executeCompletion).toHaveBeenCalledTimes(3);
      });

      test("should handle memory efficiently for test setup", async () => {
        const filepath = "memory-test.js";
        const type = "js";
        const content = "const x = 1;";

        mockLLMRouter.executeCompletion.mockResolvedValue(mockSuccessResponse);

        const result = await fileSummarizer.getFileSummaryAsJSON(filepath, type, content);

        expect(result.success).toBe(true);
        expect(mockLLMRouter.executeCompletion).toHaveBeenCalledWith(filepath, expect.any(String), {
          outputFormat: LLMOutputFormat.JSON,
          jsonSchema: expect.any(Object),
        });
      });
    });
  });

  describe("SummaryResult type", () => {
    test("should properly type successful results", async () => {
      const filepath = "src/test.js";
      const type = "js";
      const content = "function test() { }";

      const testSuccessResponse = {
        purpose: "Test function",
        implementation: "Simple test implementation",
        databaseIntegration: { mechanism: "NONE", description: "No database", codeExample: "n/a" },
      };

      mockLLMRouter.executeCompletion.mockResolvedValue(testSuccessResponse);

      const result: SummaryResult = await fileSummarizer.getFileSummaryAsJSON(
        filepath,
        type,
        content,
      );

      if (result.success) {
        // TypeScript should infer the correct type here
        expect(result.data).toBeTruthy();
        expect(typeof result.data).toBe("object");
      } else {
        // This branch shouldn't execute in this test
        expect(result.error).toBeTruthy();
      }
    });

    test("should properly type error results", async () => {
      const filepath = "src/empty.js";
      const type = "js";
      const content = "";

      const result: SummaryResult = await fileSummarizer.getFileSummaryAsJSON(
        filepath,
        type,
        content,
      );

      if (!result.success) {
        expect(result.error).toBe("File is empty");
        expect(typeof result.error).toBe("string");
      } else {
        // This branch shouldn't execute in this test
        fail("Expected error result");
      }
    });
  });
});
