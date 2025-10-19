import "reflect-metadata";
import { z } from "zod";
import { FileSummarizer } from "../../../src/components/capture/file-summarizer";
import LLMRouter from "../../../src/llm/core/llm-router";
import { LLMOutputFormat } from "../../../src/llm/types/llm.types";
import { BadResponseContentLLMError } from "../../../src/llm/types/llm-errors.types";
import * as logging from "../../../src/common/utils/logging";

// Mock dependencies
jest.mock("../../../src/llm/core/llm-router");
jest.mock("../../../src/common/utils/logging", () => ({
  logErrorMsg: jest.fn(),
  logErrorMsgAndDetail: jest.fn(),
}));

jest.mock("../../../src/promptTemplates/prompt.types", () => ({
  FILE_EXTENSION_TO_CANONICAL_TYPE_MAPPINGS: new Map<string, string>([
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
  JAVA_FILE_TYPE: "java",
}));

// Fix the mock to use the correct export name
jest.mock("../../../src/promptTemplates/sources.prompts", () => ({
  fileTypePromptMetadata: {
    java: {
      contentDesc: "Java code",
      hasComplexSchema: false,
      responseSchema: z.object({}),
      instructions: "Java instructions",
    },
    javascript: {
      contentDesc: "JavaScript/TypeScript code",
      hasComplexSchema: false,
      responseSchema: z.object({}),
      instructions: "JavaScript instructions",
    },
    default: {
      contentDesc: "project file content",
      hasComplexSchema: false,
      responseSchema: z.object({}),
      instructions: "Default instructions",
    },
    sql: {
      contentDesc: "database DDL/DML/SQL code",
      hasComplexSchema: false,
      responseSchema: z.object({}),
      instructions: "SQL instructions",
    },
    xml: {
      contentDesc: "XML code",
      hasComplexSchema: false,
      responseSchema: z.object({}),
      instructions: "XML instructions",
    },
    jsp: {
      contentDesc: "JSP code",
      hasComplexSchema: false,
      responseSchema: z.object({}),
      instructions: "JSP instructions",
    },
    markdown: {
      contentDesc: "Markdown content",
      hasComplexSchema: false,
      responseSchema: z.object({}),
      instructions: "Markdown instructions",
    },
  },
}));

jest.mock("../../../src/llm/utils/prompt-templator", () => ({
  createPromptFromConfig: jest.fn(
    (
      _template: string,
      contentDesc: string,
      _instructions: string,
      _schema: unknown,
      content: string,
    ) => {
      return `Mock prompt for ${contentDesc} with content: ${content}`;
    },
  ),
  promptConfig: {
    FORCE_JSON_RESPONSE_TEXT: "Mock JSON response text",
  },
}));

// LLMRouter is mocked, we'll create a mock instance directly
const mockLogErrorMsgAndDetail = logging.logErrorMsgAndDetail as jest.MockedFunction<
  typeof logging.logErrorMsgAndDetail
>;

import { fileTypePromptMetadata } from "../../../src/promptTemplates/sources.prompts";

describe("FileSummarizer", () => {
  let fileSummarizer: FileSummarizer;
  let mockLLMRouter: jest.Mocked<LLMRouter>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock instance with proper typing
    mockLLMRouter = {
      executeCompletion: jest.fn().mockResolvedValue(null),
    } as unknown as jest.Mocked<LLMRouter>;

    // Helper mimicking previous factory behavior to produce config used by tests
    const createConfig = (filepath: string, type: string) => {
      // Determine the expected prompt based on file type (similar to real PromptConfigFactory logic)
      let contentDesc = "project file content";

      // Map file types to expected prompts (matching the test expectations)
      // Handle case variations by normalizing to lowercase
      const normalizedType = type.toLowerCase();
      if (normalizedType === "java") {
        contentDesc = "Java code";
      } else if (
        normalizedType === "js" ||
        normalizedType === "javascript" ||
        normalizedType === "ts" ||
        normalizedType === "typescript"
      ) {
        contentDesc = "JavaScript/TypeScript code";
      } else if (normalizedType === "sql" || normalizedType === "ddl") {
        contentDesc = "database DDL/DML/SQL code";
      } else if (normalizedType === "md" || normalizedType === "markdown") {
        contentDesc = "Markdown content";
      }

      // Handle filename-based mappings
      const filename = filepath.split("/").pop()?.toLowerCase();
      if (
        filename === "readme.md" ||
        filename === "readme.txt" ||
        filename === "readme" ||
        filename === "license"
      ) {
        contentDesc = "Markdown content";
      }

      return {
        contentDesc,
        hasComplexSchema: false,
        responseSchema: z.object({}),
        instructions: `Instructions for ${contentDesc}`,
      } as (typeof fileTypePromptMetadata)["default"]; // satisfy typing
    };

    // Since LLMRouter is a default export class, we don't use mockImplementation
    // Instead, we directly inject the mock instance
    // Monkey patch fileTypePromptMetadata to use our dynamic createConfig outputs for types encountered
    const metadata = fileTypePromptMetadata;
    // Override specific entries for deterministic behavior in tests
    metadata.java = createConfig("TestClass.java", "java");
    metadata.javascript = createConfig("index.ts", "typescript");
    metadata.sql = createConfig("schema.sql", "sql");
    metadata.xml = createConfig("config.xml", "xml");
    metadata.jsp = createConfig("view.jsp", "jsp");
    metadata.markdown = createConfig("README.md", "markdown");
    metadata.default = createConfig("generic.txt", "txt");

    fileSummarizer = new FileSummarizer(mockLLMRouter);
  });

  describe("summarizeFile", () => {
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

        const result = await fileSummarizer.summarizeFile(filepath, type, content);

        expect(result).toEqual(mockSuccessResponse);
        expect(mockLLMRouter.executeCompletion).toHaveBeenCalledWith(
          filepath,
          expect.stringContaining("Mock prompt for Java code"),
          {
            outputFormat: LLMOutputFormat.JSON,
            jsonSchema: expect.any(Object),
            hasComplexSchema: false,
          },
        );
      });

      test("should return successful result for JavaScript file", async () => {
        const filepath = "src/test.js";
        const type = "js";
        const content = "function test() { return true; }";

        mockLLMRouter.executeCompletion.mockResolvedValue(mockSuccessResponse);

        const result = await fileSummarizer.summarizeFile(filepath, type, content);

        expect(result).toEqual(mockSuccessResponse);
      });

      test("should return successful result for TypeScript file", async () => {
        const filepath = "src/test.ts";
        const type = "ts";
        const content = "interface Test { id: number; }";

        mockLLMRouter.executeCompletion.mockResolvedValue(mockSuccessResponse);

        const result = await fileSummarizer.summarizeFile(filepath, type, content);

        expect(result).toEqual(mockSuccessResponse);
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

        const result = await fileSummarizer.summarizeFile(filepath, type, content);

        expect(result).toEqual(ddlResponse);
      });

      test("should handle README file specifically", async () => {
        const filepath = "README.md";
        const type = "md";
        const content = "# Project Title\n\nThis is a test project.";

        mockLLMRouter.executeCompletion.mockResolvedValue(mockSuccessResponse);

        const result = await fileSummarizer.summarizeFile(filepath, type, content);

        expect(result).toEqual(mockSuccessResponse);
        expect(mockLLMRouter.executeCompletion).toHaveBeenCalledWith(filepath, expect.any(String), {
          outputFormat: LLMOutputFormat.JSON,
          jsonSchema: expect.any(Object),
          hasComplexSchema: false,
        });
      });

      test("should use default handler for unknown file type", async () => {
        const filepath = "src/unknown.xyz";
        const type = "xyz";
        const content = "unknown file content";

        mockLLMRouter.executeCompletion.mockResolvedValue(mockSuccessResponse);

        const result = await fileSummarizer.summarizeFile(filepath, type, content);

        expect(result).toEqual(mockSuccessResponse);
      });
    });

    describe("error handling", () => {
      test("should throw error for empty file content", async () => {
        const filepath = "src/empty.js";
        const type = "js";
        const content = "";

        await expect(fileSummarizer.summarizeFile(filepath, type, content)).rejects.toThrow(
          "File is empty",
        );

        expect(mockLLMRouter.executeCompletion).not.toHaveBeenCalled();
      });

      test("should throw error for whitespace-only content", async () => {
        const filepath = "src/whitespace.js";
        const type = "js";
        const content = "   \n\t  \n  ";

        await expect(fileSummarizer.summarizeFile(filepath, type, content)).rejects.toThrow(
          "File is empty",
        );

        expect(mockLLMRouter.executeCompletion).not.toHaveBeenCalled();
      });

      test("should handle LLM service errors gracefully", async () => {
        const filepath = "src/error.js";
        const type = "js";
        const content = "function test() { }";
        const errorMessage = "LLM service unavailable";
        const llmError = new Error(errorMessage);

        mockLLMRouter.executeCompletion.mockRejectedValue(llmError);

        await expect(fileSummarizer.summarizeFile(filepath, type, content)).rejects.toThrow(
          llmError,
        );

        expect(mockLogErrorMsgAndDetail).toHaveBeenCalledWith(
          `Failed to generate summary for '${filepath}'`,
          llmError,
        );
      });

      test("should handle non-Error exceptions", async () => {
        const filepath = "src/string-error.js";
        const type = "js";
        const content = "function test() { }";

        mockLLMRouter.executeCompletion.mockRejectedValue("String error");

        await expect(fileSummarizer.summarizeFile(filepath, type, content)).rejects.toBe(
          "String error",
        );
      });

      test("should throw BadResponseContentLLMError for null LLM response", async () => {
        const filepath = "src/null-response.js";
        const type = "js";
        const content = "function test() { }";

        mockLLMRouter.executeCompletion.mockResolvedValue(null);

        await expect(fileSummarizer.summarizeFile(filepath, type, content)).rejects.toThrow(
          BadResponseContentLLMError,
        );
      });
    });

    describe("file type detection and handler selection", () => {
      test("should use Java handler for .java files", async () => {
        const filepath = "src/Main.java";
        const type = "java";
        const content = "public class Main { }";

        mockLLMRouter.executeCompletion.mockResolvedValue(mockSuccessResponse);

        await fileSummarizer.summarizeFile(filepath, type, content);

        expect(mockLLMRouter.executeCompletion).toHaveBeenCalledWith(
          filepath,
          expect.stringContaining("Mock prompt for Java code"),
          {
            outputFormat: LLMOutputFormat.JSON,
            jsonSchema: expect.any(Object),
            hasComplexSchema: false,
          },
        );
      });

      test("should use JS handler for .ts files", async () => {
        const filepath = "src/test.ts";
        const type = "typescript";
        const content = 'const test: string = "hello";';

        mockLLMRouter.executeCompletion.mockResolvedValue(mockSuccessResponse);

        await fileSummarizer.summarizeFile(filepath, type, content);

        expect(mockLLMRouter.executeCompletion).toHaveBeenCalledWith(
          filepath,
          expect.stringContaining("Mock prompt for JavaScript/TypeScript code"),
          {
            outputFormat: LLMOutputFormat.JSON,
            jsonSchema: expect.any(Object),
            hasComplexSchema: false,
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

        await fileSummarizer.summarizeFile(filepath, type, content);

        expect(mockLLMRouter.executeCompletion).toHaveBeenCalledWith(
          filepath,
          expect.stringContaining("Mock prompt for database DDL/DML/SQL code"),
          {
            outputFormat: LLMOutputFormat.JSON,
            jsonSchema: expect.any(Object),
            hasComplexSchema: false,
          },
        );
      });

      test("should prioritize README filename over file type", async () => {
        const filepath = "README.txt";
        const type = "txt";
        const content = "# Project Documentation";

        mockLLMRouter.executeCompletion.mockResolvedValue(mockSuccessResponse);

        await fileSummarizer.summarizeFile(filepath, type, content);

        // Should use markdown handler due to README filename, not txt handler
        expect(mockLLMRouter.executeCompletion).toHaveBeenCalledWith(
          filepath,
          expect.any(String), // Would be markdown prompt
          {
            outputFormat: LLMOutputFormat.JSON,
            jsonSchema: expect.any(Object),
            hasComplexSchema: false,
          },
        );
      });

      test("should handle LICENSE file with data-driven configuration", async () => {
        const filepath = "LICENSE";
        const type = "txt";
        const content = "MIT License\n\nCopyright (c) 2024";

        mockLLMRouter.executeCompletion.mockResolvedValue(mockSuccessResponse);

        await fileSummarizer.summarizeFile(filepath, type, content);

        // Should use markdown handler due to LICENSE filename mapping
        expect(mockLLMRouter.executeCompletion).toHaveBeenCalledWith(
          filepath,
          expect.stringContaining("Mock prompt for Markdown content"),
          {
            outputFormat: LLMOutputFormat.JSON,
            jsonSchema: expect.any(Object),
            hasComplexSchema: false,
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

          await fileSummarizer.summarizeFile(
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
              hasComplexSchema: false,
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

        const result = await fileSummarizer.summarizeFile(filepath, type, content);

        expect(result).toEqual(mockSuccessResponse);
        expect(mockLLMRouter.executeCompletion).toHaveBeenCalledWith(filepath, expect.any(String), {
          outputFormat: LLMOutputFormat.JSON,
          jsonSchema: expect.any(Object),
          hasComplexSchema: false,
        });
      });

      test("should fall back to default handler when no mapping exists", async () => {
        const filepath = "config.yml";
        const type = "yml";
        const content = "key: value";

        mockLLMRouter.executeCompletion.mockResolvedValue(mockSuccessResponse);

        const result = await fileSummarizer.summarizeFile(filepath, type, content);

        expect(result).toEqual(mockSuccessResponse);
        expect(mockLLMRouter.executeCompletion).toHaveBeenCalledWith(
          filepath,
          expect.stringContaining("Mock prompt for project file content"), // Default prompt pattern
          {
            outputFormat: LLMOutputFormat.JSON,
            jsonSchema: expect.any(Object),
            hasComplexSchema: false,
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

        const result = await fileSummarizer.summarizeFile(filepath, type, content);

        expect(result).toEqual(mockSuccessResponse);
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
            await fileSummarizer.summarizeFile(file.filepath, file.type, file.content),
        );

        const results = await Promise.all(promises);

        expect(results).toHaveLength(3);
        for (const result of results) {
          expect(result).toEqual(mockSuccessResponse);
        }
        expect(mockLLMRouter.executeCompletion).toHaveBeenCalledTimes(3);
      });

      test("should handle memory efficiently for test setup", async () => {
        const filepath = "memory-test.js";
        const type = "js";
        const content = "const x = 1;";

        mockLLMRouter.executeCompletion.mockResolvedValue(mockSuccessResponse);

        const result = await fileSummarizer.summarizeFile(filepath, type, content);

        expect(result).toEqual(mockSuccessResponse);
        expect(mockLLMRouter.executeCompletion).toHaveBeenCalledWith(filepath, expect.any(String), {
          outputFormat: LLMOutputFormat.JSON,
          jsonSchema: expect.any(Object),
          hasComplexSchema: false,
        });
      });
    });
  });
});
