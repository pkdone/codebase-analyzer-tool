import { Prompt } from "../../../src/common/prompts/prompt";
import { appPromptManager } from "../../../src/app/prompts/app-prompt-registry";
import { PARTIAL_ANALYSIS_TEMPLATE } from "../../../src/app/prompts/app-templates";
const fileTypePromptMetadata = appPromptManager.sources;

describe("renderPrompt Snapshot Tests", () => {
  const testContent = "public class TestClass {\n  // Test code\n}";

  describe("rendered prompts should match snapshots", () => {
    test("Java prompt should match snapshot", () => {
      const definition = fileTypePromptMetadata.java;

      const rendered = definition.renderPrompt(testContent);
      expect(rendered).toMatchSnapshot();
    });

    test("JavaScript prompt should match snapshot", () => {
      const definition = fileTypePromptMetadata.javascript;

      const rendered = definition.renderPrompt(testContent);
      expect(rendered).toMatchSnapshot();
    });

    test("C# prompt should match snapshot", () => {
      const definition = fileTypePromptMetadata.csharp;

      const rendered = definition.renderPrompt(testContent);
      expect(rendered).toMatchSnapshot();
    });

    test("Python prompt should match snapshot", () => {
      const definition = fileTypePromptMetadata.python;

      const rendered = definition.renderPrompt(testContent);
      expect(rendered).toMatchSnapshot();
    });

    test("Ruby prompt should match snapshot", () => {
      const definition = fileTypePromptMetadata.ruby;

      const rendered = definition.renderPrompt(testContent);
      expect(rendered).toMatchSnapshot();
    });

    test("SQL prompt should match snapshot", () => {
      const definition = fileTypePromptMetadata.sql;

      const rendered = definition.renderPrompt("CREATE TABLE test (id INT);");
      expect(rendered).toMatchSnapshot();
    });

    test("Markdown prompt should match snapshot", () => {
      const definition = fileTypePromptMetadata.markdown;

      const rendered = definition.renderPrompt("# Test Document\n\nContent here");
      expect(rendered).toMatchSnapshot();
    });

    test("XML prompt should match snapshot", () => {
      const definition = fileTypePromptMetadata.xml;

      const rendered = definition.renderPrompt("<root><element>test</element></root>");
      expect(rendered).toMatchSnapshot();
    });

    test("JSP prompt should match snapshot", () => {
      const definition = fileTypePromptMetadata.jsp;

      const rendered = definition.renderPrompt('<%@ page language="java" %>\n<html>test</html>');
      expect(rendered).toMatchSnapshot();
    });

    test("Default prompt should match snapshot", () => {
      const definition = fileTypePromptMetadata.default;

      const rendered = definition.renderPrompt(testContent);
      expect(rendered).toMatchSnapshot();
    });
  });

  describe("extras parameter handling", () => {
    test("prompt with extras should handle gracefully (sources template doesn't use them)", () => {
      const definition = fileTypePromptMetadata.java;

      // Sources template doesn't use partialAnalysisNote, but renderer should handle it
      const rendered = definition.renderPrompt(testContent, {
        partialAnalysisNote: "Note: This is a partial analysis.",
      });
      expect(rendered).toBeTruthy();
      // The note won't appear in sources template, but renderer should not error
    });

    test("prompt without extras should work normally", () => {
      const definition = fileTypePromptMetadata.java;

      const rendered = definition.renderPrompt(testContent);
      expect(rendered).toBeTruthy();
      expect(rendered).toContain("CODE:");
    });

    test("prompt with undefined extras should handle gracefully", () => {
      const definition = fileTypePromptMetadata.java;

      const rendered = definition.renderPrompt(testContent, undefined);
      expect(rendered).toBeTruthy();
    });

    test("prompt with empty extras object should work", () => {
      const definition = fileTypePromptMetadata.java;

      const rendered = definition.renderPrompt(testContent, {});
      expect(rendered).toBeTruthy();
    });
  });

  describe("instruction block formatting", () => {
    test("instructions should be properly formatted with double underscores", () => {
      const definition = fileTypePromptMetadata.java;

      const rendered = definition.renderPrompt(testContent);

      // Should contain properly formatted instruction section titles
      expect(rendered).toContain("__Basic Information__");
      expect(rendered).toContain("__References and Dependencies__");
      expect(rendered).toContain("__Integration Points__");
      expect(rendered).toContain("__Database Integration Analysis__");
      expect(rendered).toContain("__Code Quality Metrics__");
    });

    test("instructions should be properly formatted", () => {
      const definition = fileTypePromptMetadata.java;

      const rendered = definition.renderPrompt(testContent);
      const instructionsSection = rendered.split("CODE:")[0];

      // Should have instruction section titles with double underscores
      expect(instructionsSection).toContain("__Basic Information__");
      expect(instructionsSection).toContain("__References and Dependencies__");
      // Instructions are joined with "\n\n" in renderPrompt
      expect(instructionsSection).toContain("\n\n");
    });
  });

  describe("all file types should render without errors", () => {
    const fileTypes = [
      "java",
      "javascript",
      "csharp",
      "python",
      "ruby",
      "sql",
      "markdown",
      "xml",
      "jsp",
      "maven",
      "gradle",
      "ant",
      "npm",
      "dotnet-proj",
      "nuget",
      "ruby-bundler",
      "python-pip",
      "python-setup",
      "python-poetry",
      "shell-script",
      "batch-script",
      "jcl",
      "default",
    ] as const;

    fileTypes.forEach((fileType) => {
      test(`${fileType} should render successfully`, () => {
        const definition = fileTypePromptMetadata[fileType];

        expect(() => {
          const rendered = definition.renderPrompt("test content");
          expect(rendered).toBeTruthy();
          expect(typeof rendered).toBe("string");
          expect(rendered.length).toBeGreaterThan(0);
        }).not.toThrow();
      });
    });
  });

  describe("TEXT mode prompts (codebaseQuery)", () => {
    test("codebaseQuery prompt should be TEXT mode (no responseSchema)", () => {
      const definition = appPromptManager.codebaseQuery;
      // TEXT mode = no responseSchema
      expect(definition.responseSchema).toBeUndefined();
    });

    test("codebaseQuery prompt should render without JSON schema", () => {
      const definition = appPromptManager.codebaseQuery;
      const content = "function main() { return 42; }";

      const rendered = definition.renderPrompt(content, {
        question: "What does the main function do?",
      });

      // TEXT mode prompts should NOT include JSON schema or force JSON text
      expect(rendered).not.toContain("The response MUST be valid JSON");
      expect(rendered).not.toContain('"type":');
      expect(rendered).not.toContain("```json");

      // Should include the question and content
      expect(rendered).toContain("What does the main function do?");
      expect(rendered).toContain("function main()");
    });

    test("codebaseQuery prompt should match snapshot", () => {
      const definition = appPromptManager.codebaseQuery;
      const content = "export function calculate(x: number) { return x * 2; }";

      const rendered = definition.renderPrompt(content, {
        question: "What is the purpose of this code?",
      });
      expect(rendered).toMatchSnapshot();
    });
  });

  describe("app summary prompts (JSON mode)", () => {
    const appSummaryTypes = Object.keys(
      appPromptManager.appSummaries,
    ) as (keyof typeof appPromptManager.appSummaries)[];

    test("all app summary prompts should be JSON mode (have responseSchema)", () => {
      appSummaryTypes.forEach((category) => {
        const definition = appPromptManager.appSummaries[category];
        // JSON mode = responseSchema is defined
        expect(definition.responseSchema).toBeDefined();
      });
    });

    test("app summary prompts should include JSON schema", () => {
      const definition = appPromptManager.appSummaries[appSummaryTypes[0]];

      const rendered = definition.renderPrompt("[{summary: 'test'}]");

      // JSON mode prompts should include JSON enforcement
      expect(rendered).toContain("The response MUST be valid JSON");
    });

    appSummaryTypes.forEach((category) => {
      test(`${category} app summary prompt should render successfully`, () => {
        const definition = appPromptManager.appSummaries[category];

        expect(() => {
          const rendered = definition.renderPrompt("[{summary: 'test file summary'}]");
          expect(rendered).toBeTruthy();
          expect(typeof rendered).toBe("string");
          expect(rendered.length).toBeGreaterThan(0);
        }).not.toThrow();
      });
    });
  });

  describe("app summary prompts should match snapshots", () => {
    const testSummaryContent = JSON.stringify([
      { file: "App.tsx", summary: "Main application component" },
      { file: "utils.ts", summary: "Utility functions for data processing" },
    ]);

    test("appDescription prompt should match snapshot", () => {
      const definition = appPromptManager.appSummaries.appDescription;

      const rendered = definition.renderPrompt(testSummaryContent);
      expect(rendered).toMatchSnapshot();
    });

    test("technologies prompt should match snapshot", () => {
      const definition = appPromptManager.appSummaries.technologies;

      const rendered = definition.renderPrompt(testSummaryContent);
      expect(rendered).toMatchSnapshot();
    });

    test("businessProcesses prompt should match snapshot", () => {
      const definition = appPromptManager.appSummaries.businessProcesses;

      const rendered = definition.renderPrompt(testSummaryContent);
      expect(rendered).toMatchSnapshot();
    });

    test("boundedContexts prompt should match snapshot", () => {
      const definition = appPromptManager.appSummaries.boundedContexts;

      const rendered = definition.renderPrompt(testSummaryContent);
      expect(rendered).toMatchSnapshot();
    });

    test("potentialMicroservices prompt should match snapshot", () => {
      const definition = appPromptManager.appSummaries.potentialMicroservices;

      const rendered = definition.renderPrompt(testSummaryContent);
      expect(rendered).toMatchSnapshot();
    });

    test("inferredArchitecture prompt should match snapshot", () => {
      const definition = appPromptManager.appSummaries.inferredArchitecture;

      const rendered = definition.renderPrompt(testSummaryContent);
      expect(rendered).toMatchSnapshot();
    });

    test("app summary prompt with PARTIAL_ANALYSIS_TEMPLATE should match snapshot", () => {
      const definition = appPromptManager.appSummaries.technologies;
      // Use PARTIAL_ANALYSIS_TEMPLATE for partial analysis
      const promptWithPartialTemplate = new Prompt(
        {
          contentDesc: definition.contentDesc,
          instructions: definition.instructions,
          responseSchema: definition.responseSchema,
          dataBlockHeader: definition.dataBlockHeader,
          wrapInCodeBlock: definition.wrapInCodeBlock,
        },
        PARTIAL_ANALYSIS_TEMPLATE,
      );

      const rendered = promptWithPartialTemplate.renderPrompt(testSummaryContent);
      expect(rendered).toMatchSnapshot();
    });
  });
});
