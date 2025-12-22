import "reflect-metadata";
import { z } from "zod";
import { summarizeFile } from "../../../../src/app/components/capture/file-summarizer";
import LLMRouter from "../../../../src/common/llm/llm-router";
import { LLMOutputFormat } from "../../../../src/common/llm/types/llm.types";
import { LLMError, LLMErrorCode } from "../../../../src/common/llm/types/llm-errors.types";
import * as logging from "../../../../src/common/utils/logging";

// Mock dependencies
jest.mock("../../../../src/common/llm/llm-router");
jest.mock("../../../../src/common/utils/logging", () => ({
  logErrorMsg: jest.fn(),
  logError: jest.fn(),
  logOneLineWarning: jest.fn(),
  logOneLineError: jest.fn(),
}));

jest.mock("../../../../src/app/components/capture/config/file-types.config", () => {
  // Create rules that match the test expectations
  const createRules = () => [
    // Filename rules first
    {
      test: (filename: string) => filename === "readme" || filename.startsWith("readme."),
      type: "markdown" as const,
    },
    {
      test: (filename: string) => filename === "license" || filename.startsWith("license."),
      type: "markdown" as const,
    },
    {
      test: (filename: string) => filename === "changelog" || filename.startsWith("changelog."),
      type: "markdown" as const,
    },
    // Extension rules
    { test: (_filename: string, extension: string) => extension === "java", type: "java" as const },
    {
      test: (_filename: string, extension: string) =>
        ["js", "ts", "javascript", "typescript"].includes(extension),
      type: "javascript" as const,
    },
    {
      test: (_filename: string, extension: string) => extension === "ddl" || extension === "sql",
      type: "sql" as const,
    },
    { test: (_filename: string, extension: string) => extension === "xml", type: "xml" as const },
    { test: (_filename: string, extension: string) => extension === "jsp", type: "jsp" as const },
    {
      test: (_filename: string, extension: string) =>
        extension === "markdown" || extension === "md",
      type: "markdown" as const,
    },
    // Default rule
    { test: () => true, type: "default" as const },
  ];

  return {
    FILE_TYPE_MAPPING_RULES: createRules(),
    FILENAME_TO_TYPE_MAP: {
      "pom.xml": "maven",
      "build.gradle": "gradle",
      "build.gradle.kts": "gradle",
      "build.xml": "ant",
      "package.json": "npm",
      "package-lock.json": "npm",
      "yarn.lock": "npm",
      "packages.config": "nuget",
      "requirements.txt": "python-pip",
      "setup.py": "python-setup",
      "pyproject.toml": "python-poetry",
      crontab: "shell-script",
      gemfile: "ruby-bundler",
      "gemfile.lock": "ruby-bundler",
      pipfile: "python-pip",
      "pipfile.lock": "python-pip",
    },
    EXTENSION_TO_TYPE_MAP: {
      java: "java",
      kt: "java",
      kts: "java",
      js: "javascript",
      ts: "javascript",
      javascript: "javascript",
      typescript: "javascript",
      py: "python",
      rb: "ruby",
      ruby: "ruby",
      cs: "csharp",
      csx: "csharp",
      csharp: "csharp",
      ddl: "sql",
      sql: "sql",
      xml: "xml",
      jsp: "jsp",
      markdown: "markdown",
      md: "markdown",
      csproj: "dotnet-proj",
      vbproj: "dotnet-proj",
      fsproj: "dotnet-proj",
      sh: "shell-script",
      bash: "shell-script",
      bat: "batch-script",
      cmd: "batch-script",
      jcl: "jcl",
    },
  };
});

// Note: We no longer mock buildPrompt as FileSummarizer now uses the Prompt class directly
// The prompt registry is now imported directly from the centralized location

// LLMRouter is mocked, we'll create a mock instance directly
const mockLogOneLineError = logging.logOneLineError as jest.MockedFunction<
  typeof logging.logOneLineError
>;

import { promptRegistry } from "../../../../src/app/prompts/prompt-registry";
const fileTypePromptMetadata = promptRegistry.sources;

describe("summarizeFile", () => {
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
        contentDesc: contentDesc,
        hasComplexSchema: false,
        sanitizerConfig: expect.any(Object),
        responseSchema: z.object({}),
        instructions: [`Instructions for ${contentDesc}`],
        template: `Act as a senior developer analyzing the code in a legacy application. Based on the {{contentDesc}} shown below in the section marked '{{dataBlockHeader}}', return a JSON response that contains {{instructionsText}}.

{{partialAnalysisNote}}The JSON response must follow this JSON schema:
\`\`\`json
{
  "type": "object",
  "$schema": "http://json-schema.org/draft-07/schema#"
}
\`\`\`

In your response, only include JSON and do not include any additional text explanations outside the JSON object.
NEVER ever respond with XML. NEVER use Markdown code blocks to wrap the JSON in your response.
NEVER use " or ' quote symbols as part of the text you use for JSON description values, even if you want to quote a piece of existing text, existing message or show a path
ONLY provide an RFC8259 compliant JSON response that strictly follows the provided JSON schema.
CRITICAL JSON FORMAT REQUIREMENTS:
- ALL property names MUST be enclosed in double quotes (e.g., "name": "value", NOT name: "value")
- ALL string values MUST be enclosed in double quotes
- Use proper JSON syntax with commas separating properties
- Do not include any unquoted property names or values
- Ensure all brackets, braces, and quotes are properly matched
- COMPLETE ALL PROPERTY NAMES: Never truncate or abbreviate property names (e.g., use "references" not "eferences", "implementation" not "implemen")
- ENSURE COMPLETE RESPONSES: Always provide complete, valid JSON that can be parsed without errors
- AVOID TRUNCATION: If you reach token limits, prioritize completing the JSON structure over adding more detail
- EXAMPLE: ✅ CORRECT: {"name": "value", "items": [{"id": 1}]}  ❌ INCORRECT: {name: "value", items: [{id: 1}]}
- CRITICAL: All property names at every nesting level MUST have double quotes.

{{dataBlockHeader}}:
{{contentWrapper}}{{content}}{{contentWrapper}}`,
        dataBlockHeader: "CODE",
        wrapInCodeBlock: true,
      } as (typeof fileTypePromptMetadata)["default"]; // satisfy typing
    };

    // Since LLMRouter is a default export class, we don't use mockImplementation
    // Instead, we directly inject the mock instance
    // Monkey patch fileTypePromptMetadata to use our dynamic createConfig outputs for types encountered
    const metadata = fileTypePromptMetadata as any;
    // Override specific entries for deterministic behavior in tests
    metadata.java = createConfig("TestClass.java", "java");
    metadata.javascript = createConfig("index.ts", "typescript");
    metadata.sql = createConfig("schema.sql", "sql");
    metadata.xml = createConfig("config.xml", "xml");
    metadata.tsp = createConfig("view.ts", "jsp");
    metadata.markdown = createConfig("README.md", "markdown");
    metadata.default = createConfig("generic.txt", "txt");
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

        (mockLLMRouter.executeCompletion as jest.Mock).mockResolvedValue(mockSuccessResponse);

        const result = await summarizeFile(mockLLMRouter, filepath, type, content);

        expect(result).toEqual(mockSuccessResponse);
        expect(mockLLMRouter.executeCompletion).toHaveBeenCalledWith(
          filepath,
          expect.stringContaining("Java code"),
          {
            outputFormat: LLMOutputFormat.JSON,
            jsonSchema: expect.any(Object),
            hasComplexSchema: false,
            sanitizerConfig: expect.any(Object),
          },
        );
      });

      test("should return successful result for JavaScript file", async () => {
        const filepath = "src/test.ts";
        const type = "js";
        const content = "function test() { return true; }";

        (mockLLMRouter.executeCompletion as jest.Mock).mockResolvedValue(mockSuccessResponse);

        const result = await summarizeFile(mockLLMRouter, filepath, type, content);

        expect(result).toEqual(mockSuccessResponse);
      });

      test("should return successful result for TypeScript file", async () => {
        const filepath = "src/test.ts";
        const type = "ts";
        const content = "interface Test { id: number; }";

        (mockLLMRouter.executeCompletion as jest.Mock).mockResolvedValue(mockSuccessResponse);

        const result = await summarizeFile(mockLLMRouter, filepath, type, content);

        expect(result).toEqual(mockSuccessResponse);
      });

      test("should return successful result for DDL file", async () => {
        const filepath = "db/schema.sql";
        const type = "sql";
        const content = "CREATE TABLE users (id INT PRIMARY KEY);";

        const ddlResponse = {
          purpose: "Database schema definition",
          implementation: "Creates user table",
          tables: [{ name: "users", fields: "id, username, email" }],
          storedProcedures: [],
          triggers: [],
          databaseIntegration: {
            mechanism: "DDL",
            description: "Database schema definition",
            codeExample: "CREATE TABLE users (id INT PRIMARY KEY);",
          },
        };

        (mockLLMRouter.executeCompletion as jest.Mock).mockResolvedValue(ddlResponse);

        const result = await summarizeFile(mockLLMRouter, filepath, type, content);

        expect(result).toEqual(ddlResponse);
      });

      test("should handle README file specifically", async () => {
        const filepath = "README.md";
        const type = "md";
        const content = "# Project Title\n\nThis is a test project.";

        (mockLLMRouter.executeCompletion as jest.Mock).mockResolvedValue(mockSuccessResponse);

        const result = await summarizeFile(mockLLMRouter, filepath, type, content);

        expect(result).toEqual(mockSuccessResponse);
        expect(mockLLMRouter.executeCompletion).toHaveBeenCalledWith(filepath, expect.any(String), {
          outputFormat: LLMOutputFormat.JSON,
          jsonSchema: expect.any(Object),
          hasComplexSchema: false,
          sanitizerConfig: expect.any(Object),
        });
      });

      test("should use default handler for unknown file type", async () => {
        const filepath = "src/unknown.xyz";
        const type = "xyz";
        const content = "unknown file content";

        (mockLLMRouter.executeCompletion as jest.Mock).mockResolvedValue(mockSuccessResponse);

        const result = await summarizeFile(mockLLMRouter, filepath, type, content);

        expect(result).toEqual(mockSuccessResponse);
      });
    });

    describe("error handling", () => {
      test("should throw error for empty file content", async () => {
        const filepath = "src/empty.ts";
        const type = "js";
        const content = "";

        await expect(summarizeFile(mockLLMRouter, filepath, type, content)).rejects.toThrow(
          "File is empty",
        );

        expect(mockLLMRouter.executeCompletion).not.toHaveBeenCalled();
      });

      test("should throw error for whitespace-only content", async () => {
        const filepath = "src/whitespace.ts";
        const type = "js";
        const content = "   \n\t  \n  ";

        await expect(summarizeFile(mockLLMRouter, filepath, type, content)).rejects.toThrow(
          "File is empty",
        );

        expect(mockLLMRouter.executeCompletion).not.toHaveBeenCalled();
      });

      test("should handle LLM service errors gracefully", async () => {
        const filepath = "src/error.ts";
        const type = "js";
        const content = "function test() { }";
        const errorMessage = "LLM service unavailable";
        const llmError = new Error(errorMessage);

        (mockLLMRouter.executeCompletion as jest.Mock).mockRejectedValue(llmError);

        await expect(summarizeFile(mockLLMRouter, filepath, type, content)).rejects.toThrow(
          llmError,
        );

        expect(mockLogOneLineError).toHaveBeenCalledWith(
          `Failed to generate summary for '${filepath}'`,
          llmError,
        );
      });

      test("should handle non-Error exceptions", async () => {
        const filepath = "src/string-error.ts";
        const type = "js";
        const content = "function test() { }";

        (mockLLMRouter.executeCompletion as jest.Mock).mockRejectedValue("String error");

        await expect(summarizeFile(mockLLMRouter, filepath, type, content)).rejects.toBe(
          "String error",
        );
      });

      test("should throw LLMError for null LLM response", async () => {
        const filepath = "src/null-response.ts";
        const type = "js";
        const content = "function test() { }";

        (mockLLMRouter.executeCompletion as jest.Mock).mockResolvedValue(null);

        await expect(summarizeFile(mockLLMRouter, filepath, type, content)).rejects.toThrow(
          LLMError,
        );
        await expect(summarizeFile(mockLLMRouter, filepath, type, content)).rejects.toMatchObject({
          code: LLMErrorCode.BAD_RESPONSE_CONTENT,
        });
      });
    });

    describe("file type detection and handler selection", () => {
      test("should use Java handler for .java files", async () => {
        const filepath = "src/Main.java";
        const type = "java";
        const content = "public class Main { }";

        (mockLLMRouter.executeCompletion as jest.Mock).mockResolvedValue(mockSuccessResponse);

        await summarizeFile(mockLLMRouter, filepath, type, content);

        expect(mockLLMRouter.executeCompletion).toHaveBeenCalledWith(
          filepath,
          expect.stringContaining("Java code"),
          {
            outputFormat: LLMOutputFormat.JSON,
            jsonSchema: expect.any(Object),
            hasComplexSchema: false,
            sanitizerConfig: expect.any(Object),
          },
        );
      });

      test("should use JS handler for .ts files", async () => {
        const filepath = "src/test.ts";
        const type = "typescript";
        const content = 'const test: string = "hello";';

        (mockLLMRouter.executeCompletion as jest.Mock).mockResolvedValue(mockSuccessResponse);

        await summarizeFile(mockLLMRouter, filepath, type, content);

        expect(mockLLMRouter.executeCompletion).toHaveBeenCalledWith(
          filepath,
          expect.stringContaining("JavaScript/TypeScript code"),
          {
            outputFormat: LLMOutputFormat.JSON,
            jsonSchema: expect.any(Object),
            hasComplexSchema: false,
            sanitizerConfig: expect.any(Object),
          },
        );
      });

      test("should use DDL handler for .sql files", async () => {
        const filepath = "db/schema.ddl";
        const type = "ddl";
        const content = "CREATE TABLE test (id INT);";

        (mockLLMRouter.executeCompletion as jest.Mock).mockResolvedValue({
          purpose: "Database schema",
          implementation: "Creates tables",
          databaseIntegration: {
            mechanism: "DDL",
            description: "Schema definition",
            codeExample: "CREATE TABLE test (id INT);",
          },
        });

        await summarizeFile(mockLLMRouter, filepath, type, content);

        expect(mockLLMRouter.executeCompletion).toHaveBeenCalledWith(
          filepath,
          expect.stringContaining("database DDL/DML/SQL code"),
          {
            outputFormat: LLMOutputFormat.JSON,
            jsonSchema: expect.any(Object),
            hasComplexSchema: false,
            sanitizerConfig: expect.any(Object),
          },
        );
      });

      test("should prioritize README filename over file type", async () => {
        const filepath = "README.txt";
        const type = "txt";
        const content = "# Project Documentation";

        (mockLLMRouter.executeCompletion as jest.Mock).mockResolvedValue(mockSuccessResponse);

        await summarizeFile(mockLLMRouter, filepath, type, content);

        // Should use markdown handler due to README filename, not txt handler
        expect(mockLLMRouter.executeCompletion).toHaveBeenCalledWith(
          filepath,
          expect.any(String), // Would be markdown prompt
          {
            outputFormat: LLMOutputFormat.JSON,
            jsonSchema: expect.any(Object),
            hasComplexSchema: false,
            sanitizerConfig: expect.any(Object),
          },
        );
      });

      test("should handle LICENSE file with data-driven configuration", async () => {
        const filepath = "LICENSE";
        const type = "txt";
        const content = "MIT License\n\nCopyright (c) 2024";

        (mockLLMRouter.executeCompletion as jest.Mock).mockResolvedValue(mockSuccessResponse);

        await summarizeFile(mockLLMRouter, filepath, type, content);

        // Should use markdown handler due to LICENSE filename mapping
        expect(mockLLMRouter.executeCompletion).toHaveBeenCalledWith(
          filepath,
          expect.stringContaining("Markdown content"),
          {
            outputFormat: LLMOutputFormat.JSON,
            jsonSchema: expect.any(Object),
            hasComplexSchema: false,
            sanitizerConfig: expect.any(Object),
          },
        );
      });

      test("should handle case variations in file types", async () => {
        const testCases = [
          { type: "JAVA", expectedPrompt: "Java code" },
          { type: "JavaScript", expectedPrompt: "JavaScript/TypeScript code" },
          { type: "SQL", expectedPrompt: "database DDL/DML/SQL code" },
        ];

        for (const testCase of testCases) {
          (mockLLMRouter.executeCompletion as jest.Mock).mockResolvedValue(mockSuccessResponse);

          await summarizeFile(
            mockLLMRouter,
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
              sanitizerConfig: expect.any(Object),
            },
          );

          jest.clearAllMocks();
        }
      });
    });

    describe("integration with file handler mappings", () => {
      test("should correctly integrate with file handler mappings", async () => {
        const filepath = "src/component.tsx";
        const type = "js"; // JSX would map to JS handler
        const content = "const Component = () => <div>Hello</div>;";

        (mockLLMRouter.executeCompletion as jest.Mock).mockResolvedValue(mockSuccessResponse);

        const result = await summarizeFile(mockLLMRouter, filepath, type, content);

        expect(result).toEqual(mockSuccessResponse);
        expect(mockLLMRouter.executeCompletion).toHaveBeenCalledWith(filepath, expect.any(String), {
          outputFormat: LLMOutputFormat.JSON,
          jsonSchema: expect.any(Object),
          hasComplexSchema: false,
          sanitizerConfig: expect.any(Object),
        });
      });

      test("should fall back to default handler when no mapping exists", async () => {
        const filepath = "config.yml";
        const type = "yml";
        const content = "key: value";

        (mockLLMRouter.executeCompletion as jest.Mock).mockResolvedValue(mockSuccessResponse);

        const result = await summarizeFile(mockLLMRouter, filepath, type, content);

        expect(result).toEqual(mockSuccessResponse);
        expect(mockLLMRouter.executeCompletion).toHaveBeenCalledWith(
          filepath,
          expect.stringContaining("project file content"), // Default prompt pattern
          {
            outputFormat: LLMOutputFormat.JSON,
            jsonSchema: expect.any(Object),
            hasComplexSchema: false,
            sanitizerConfig: expect.any(Object),
          },
        );
      });
    });

    describe("performance and resource usage", () => {
      test("should handle large content efficiently", async () => {
        const filepath = "src/large-file.ts";
        const type = "js";
        const content = "function test() { }".repeat(1000);

        (mockLLMRouter.executeCompletion as jest.Mock).mockResolvedValue(mockSuccessResponse);

        const result = await summarizeFile(mockLLMRouter, filepath, type, content);

        expect(result).toEqual(mockSuccessResponse);
        expect(mockLLMRouter.executeCompletion).toHaveBeenCalledTimes(1);
      });

      test("should handle concurrent summarization requests", async () => {
        const files = [
          { filepath: "src/file1.ts", type: "js", content: "function test1() { }" },
          { filepath: "src/file2.ts", type: "js", content: "function test2() { }" },
          { filepath: "src/file3.ts", type: "js", content: "function test3() { }" },
        ];

        (mockLLMRouter.executeCompletion as jest.Mock).mockResolvedValue(mockSuccessResponse);

        const promises = files.map(
          async (file) =>
            await summarizeFile(mockLLMRouter, file.filepath, file.type, file.content),
        );

        const results = await Promise.all(promises);

        expect(results).toHaveLength(3);
        for (const result of results) {
          expect(result).toEqual(mockSuccessResponse);
        }
        expect(mockLLMRouter.executeCompletion).toHaveBeenCalledTimes(3);
      });

      test("should handle memory efficiently for test setup", async () => {
        const filepath = "memory-test.ts";
        const type = "js";
        const content = "const x = 1;";

        (mockLLMRouter.executeCompletion as jest.Mock).mockResolvedValue(mockSuccessResponse);

        const result = await summarizeFile(mockLLMRouter, filepath, type, content);

        expect(result).toEqual(mockSuccessResponse);
        expect(mockLLMRouter.executeCompletion).toHaveBeenCalledWith(filepath, expect.any(String), {
          outputFormat: LLMOutputFormat.JSON,
          jsonSchema: expect.any(Object),
          hasComplexSchema: false,
          sanitizerConfig: expect.any(Object),
        });
      });
    });
  });
});
