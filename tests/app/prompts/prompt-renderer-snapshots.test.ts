import {
  renderJsonSchemaPrompt,
  type JSONSchemaPromptConfig,
} from "../../../src/common/prompts/json-schema-prompt";
import { DEFAULT_PERSONA_INTRODUCTION } from "../../../src/app/prompts/prompts.constants";
import {
  CODE_DATA_BLOCK_HEADER,
  FILE_SUMMARIES_DATA_BLOCK_HEADER,
} from "../../../src/app/prompts/prompts.constants";
import { appSummaryConfigMap } from "../../../src/app/prompts/app-summaries/app-summaries.definitions";
import { APP_SUMMARY_CONTENT_DESC } from "../../../src/app/prompts/app-summaries/app-summaries.constants";
import { fileTypePromptRegistry } from "../../../src/app/prompts/sources/sources.definitions";

/**
 * Helper to render a prompt from fileTypePromptRegistry config.
 * Adds dataBlockHeader and wrapInCodeBlock which are no longer in the registry entries.
 */
function renderSourcePrompt(
  fileType: keyof typeof fileTypePromptRegistry,
  content: string,
): string {
  const config = fileTypePromptRegistry[fileType];
  return renderJsonSchemaPrompt(
    {
      personaIntroduction: DEFAULT_PERSONA_INTRODUCTION,
      ...config,
      dataBlockHeader: CODE_DATA_BLOCK_HEADER,
      wrapInCodeBlock: true,
    } as JSONSchemaPromptConfig,
    content,
  );
}

/**
 * Builds a contextual note for partial/chunked analysis prompts.
 */
function buildPartialAnalysisNote(dataBlockHeader: string): string {
  const formattedHeader = dataBlockHeader.toLowerCase().replace(/_/g, " ");
  return `Note, this is a partial analysis of what is a much larger set of ${formattedHeader}; focus on extracting insights from this subset of ${formattedHeader} only.\n\n`;
}

/**
 * Helper to render a prompt from appSummaryConfigMap config.
 * Adds contentDesc, dataBlockHeader, and wrapInCodeBlock which are no longer in the config entries.
 */
function renderAppSummaryPrompt(
  category: keyof typeof appSummaryConfigMap,
  content: string,
  options?: { forPartialAnalysis?: boolean },
): string {
  const config = appSummaryConfigMap[category];
  const contextNote = options?.forPartialAnalysis
    ? buildPartialAnalysisNote(FILE_SUMMARIES_DATA_BLOCK_HEADER)
    : undefined;
  return renderJsonSchemaPrompt(
    {
      personaIntroduction: DEFAULT_PERSONA_INTRODUCTION,
      ...config,
      contentDesc: APP_SUMMARY_CONTENT_DESC,
      dataBlockHeader: FILE_SUMMARIES_DATA_BLOCK_HEADER,
      wrapInCodeBlock: false,
      contextNote,
    } as JSONSchemaPromptConfig,
    content,
  );
}

describe("renderPrompt Snapshot Tests", () => {
  const testContent = "public class TestClass {\n  // Test code\n}";

  describe("rendered prompts should match snapshots", () => {
    test("Java prompt should match snapshot", () => {
      const rendered = renderSourcePrompt("java", testContent);
      expect(rendered).toMatchSnapshot();
    });

    test("JavaScript prompt should match snapshot", () => {
      const rendered = renderSourcePrompt("javascript", testContent);
      expect(rendered).toMatchSnapshot();
    });

    test("C# prompt should match snapshot", () => {
      const rendered = renderSourcePrompt("csharp", testContent);
      expect(rendered).toMatchSnapshot();
    });

    test("Python prompt should match snapshot", () => {
      const rendered = renderSourcePrompt("python", testContent);
      expect(rendered).toMatchSnapshot();
    });

    test("Ruby prompt should match snapshot", () => {
      const rendered = renderSourcePrompt("ruby", testContent);
      expect(rendered).toMatchSnapshot();
    });

    test("SQL prompt should match snapshot", () => {
      const rendered = renderSourcePrompt("sql", "CREATE TABLE test (id INT);");
      expect(rendered).toMatchSnapshot();
    });

    test("Markdown prompt should match snapshot", () => {
      const rendered = renderSourcePrompt("markdown", "# Test Document\n\nContent here");
      expect(rendered).toMatchSnapshot();
    });

    test("XML prompt should match snapshot", () => {
      const rendered = renderSourcePrompt("xml", "<root><element>test</element></root>");
      expect(rendered).toMatchSnapshot();
    });

    test("JSP prompt should match snapshot", () => {
      const rendered = renderSourcePrompt(
        "jsp",
        '<%@ page language="java" %>\n<html>test</html>',
      );
      expect(rendered).toMatchSnapshot();
    });

    test("Default prompt should match snapshot", () => {
      const rendered = renderSourcePrompt("default", testContent);
      expect(rendered).toMatchSnapshot();
    });
  });

  describe("renderPrompt basic handling", () => {
    test("prompt should render correctly", () => {
      const rendered = renderSourcePrompt("java", testContent);
      expect(rendered).toBeTruthy();
      expect(rendered).toContain("CODE:");
    });
  });

  describe("instruction block formatting", () => {
    test("instructions should be properly formatted with double underscores", () => {
      const rendered = renderSourcePrompt("java", testContent);

      // Should contain properly formatted instruction section titles
      expect(rendered).toContain("__Basic Information__");
      expect(rendered).toContain("__References and Dependencies__");
      expect(rendered).toContain("__Integration Points__");
      expect(rendered).toContain("__Database Integration Analysis__");
      expect(rendered).toContain("__Code Quality Metrics__");
    });

    test("instructions should be properly formatted", () => {
      const rendered = renderSourcePrompt("java", testContent);
      const instructionsSection = rendered.split("CODE:")[0];

      // Should have instruction section titles with double underscores
      expect(instructionsSection).toContain("__Basic Information__");
      expect(instructionsSection).toContain("__References and Dependencies__");
      // Instructions are joined with "\n\n" in renderJsonSchemaPrompt
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
        expect(() => {
          const rendered = renderSourcePrompt(fileType, "test content");
          expect(rendered).toBeTruthy();
          expect(typeof rendered).toBe("string");
          expect(rendered.length).toBeGreaterThan(0);
        }).not.toThrow();
      });
    });
  });

  describe("app summary configs (JSON mode)", () => {
    const appSummaryTypes = Object.keys(
      appSummaryConfigMap,
    ) as (keyof typeof appSummaryConfigMap)[];

    test("all app summary configs should be JSON mode (have responseSchema)", () => {
      appSummaryTypes.forEach((category) => {
        const config = appSummaryConfigMap[category];
        // JSON mode = responseSchema is defined
        expect(config.responseSchema).toBeDefined();
      });
    });

    test("app summary prompts should include JSON schema", () => {
      const rendered = renderAppSummaryPrompt(appSummaryTypes[0], "[{summary: 'test'}]");

      // JSON mode prompts should include JSON enforcement
      expect(rendered).toContain("The response MUST be valid JSON");
    });

    appSummaryTypes.forEach((category) => {
      test(`${category} app summary prompt should render successfully`, () => {
        expect(() => {
          const rendered = renderAppSummaryPrompt(
            category,
            "[{summary: 'test file summary'}]",
          );
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
      const rendered = renderAppSummaryPrompt("appDescription", testSummaryContent);
      expect(rendered).toMatchSnapshot();
    });

    test("technologies prompt should match snapshot", () => {
      const rendered = renderAppSummaryPrompt("technologies", testSummaryContent);
      expect(rendered).toMatchSnapshot();
    });

    test("businessProcesses prompt should match snapshot", () => {
      const rendered = renderAppSummaryPrompt("businessProcesses", testSummaryContent);
      expect(rendered).toMatchSnapshot();
    });

    test("boundedContexts prompt should match snapshot", () => {
      const rendered = renderAppSummaryPrompt("boundedContexts", testSummaryContent);
      expect(rendered).toMatchSnapshot();
    });

    test("potentialMicroservices prompt should match snapshot", () => {
      const rendered = renderAppSummaryPrompt("potentialMicroservices", testSummaryContent);
      expect(rendered).toMatchSnapshot();
    });

    test("inferredArchitecture prompt should match snapshot", () => {
      const rendered = renderAppSummaryPrompt("inferredArchitecture", testSummaryContent);
      expect(rendered).toMatchSnapshot();
    });

    test("app summary prompt with forPartialAnalysis should match snapshot", () => {
      const rendered = renderAppSummaryPrompt("technologies", testSummaryContent, {
        forPartialAnalysis: true,
      });
      expect(rendered).toMatchSnapshot();
    });
  });
});
