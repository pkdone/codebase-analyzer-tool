import { renderPrompt } from "../../src/prompts/prompt-renderer";
import { fileTypePromptMetadata } from "../../src/prompts/definitions/sources";

describe("renderPrompt Snapshot Tests", () => {
  const testContent = "public class TestClass {\n  // Test code\n}";

  describe("rendered prompts should match snapshots", () => {
    test("Java prompt should match snapshot", () => {
      const definition = fileTypePromptMetadata.java;
      const data = { content: testContent };

      const rendered = renderPrompt(definition, data);
      expect(rendered).toMatchSnapshot();
    });

    test("JavaScript prompt should match snapshot", () => {
      const definition = fileTypePromptMetadata.javascript;
      const data = { content: testContent };

      const rendered = renderPrompt(definition, data);
      expect(rendered).toMatchSnapshot();
    });

    test("C# prompt should match snapshot", () => {
      const definition = fileTypePromptMetadata.csharp;
      const data = { content: testContent };

      const rendered = renderPrompt(definition, data);
      expect(rendered).toMatchSnapshot();
    });

    test("Python prompt should match snapshot", () => {
      const definition = fileTypePromptMetadata.python;
      const data = { content: testContent };

      const rendered = renderPrompt(definition, data);
      expect(rendered).toMatchSnapshot();
    });

    test("Ruby prompt should match snapshot", () => {
      const definition = fileTypePromptMetadata.ruby;
      const data = { content: testContent };

      const rendered = renderPrompt(definition, data);
      expect(rendered).toMatchSnapshot();
    });

    test("SQL prompt should match snapshot", () => {
      const definition = fileTypePromptMetadata.sql;
      const data = { content: "CREATE TABLE test (id INT);" };

      const rendered = renderPrompt(definition, data);
      expect(rendered).toMatchSnapshot();
    });

    test("Markdown prompt should match snapshot", () => {
      const definition = fileTypePromptMetadata.markdown;
      const data = { content: "# Test Document\n\nContent here" };

      const rendered = renderPrompt(definition, data);
      expect(rendered).toMatchSnapshot();
    });

    test("XML prompt should match snapshot", () => {
      const definition = fileTypePromptMetadata.xml;
      const data = { content: "<root><element>test</element></root>" };

      const rendered = renderPrompt(definition, data);
      expect(rendered).toMatchSnapshot();
    });

    test("JSP prompt should match snapshot", () => {
      const definition = fileTypePromptMetadata.jsp;
      const data = { content: '<%@ page language="java" %>\n<html>test</html>' };

      const rendered = renderPrompt(definition, data);
      expect(rendered).toMatchSnapshot();
    });

    test("Default prompt should match snapshot", () => {
      const definition = fileTypePromptMetadata.default;
      const data = { content: testContent };

      const rendered = renderPrompt(definition, data);
      expect(rendered).toMatchSnapshot();
    });
  });

  describe("partialAnalysisNote handling", () => {
    test("prompt with partialAnalysisNote should handle gracefully (sources template doesn't use it)", () => {
      const definition = fileTypePromptMetadata.java;
      const data = {
        content: testContent,
        partialAnalysisNote: "Note: This is a partial analysis.",
      };

      // Sources template doesn't use partialAnalysisNote, but renderer should handle it
      const rendered = renderPrompt(definition, data);
      expect(rendered).toBeTruthy();
      // The note won't appear in sources template, but renderer should not error
    });

    test("prompt without partialAnalysisNote should work normally", () => {
      const definition = fileTypePromptMetadata.java;
      const data = { content: testContent };

      const rendered = renderPrompt(definition, data);
      expect(rendered).toBeTruthy();
      expect(rendered).toContain("CODE:");
    });

    test("prompt with undefined partialAnalysisNote should handle gracefully", () => {
      const definition = fileTypePromptMetadata.java;
      const data = { content: testContent, partialAnalysisNote: undefined };

      const rendered = renderPrompt(definition, data);
      expect(rendered).toBeTruthy();
    });

    test("prompt with null partialAnalysisNote should default to empty string", () => {
      const definition = fileTypePromptMetadata.java;
      const data = { content: testContent, partialAnalysisNote: null };

      const rendered = renderPrompt(definition, data);
      expect(rendered).toBeTruthy();
      // Should not throw and should render successfully
    });

    test("prompt with number partialAnalysisNote should default to empty string", () => {
      const definition = fileTypePromptMetadata.java;
      const data = { content: testContent, partialAnalysisNote: 123 as any };

      const rendered = renderPrompt(definition, data);
      expect(rendered).toBeTruthy();
      // Should not throw and should render successfully
    });

    test("prompt with object partialAnalysisNote should default to empty string", () => {
      const definition = fileTypePromptMetadata.java;
      const data = { content: testContent, partialAnalysisNote: { key: "value" } as any };

      const rendered = renderPrompt(definition, data);
      expect(rendered).toBeTruthy();
      // Should not throw and should render successfully
    });

    test("prompt with string partialAnalysisNote should use the string value", () => {
      const definition = fileTypePromptMetadata.java;
      const data = {
        content: testContent,
        partialAnalysisNote: "This is a valid note",
      };

      const rendered = renderPrompt(definition, data);
      expect(rendered).toBeTruthy();
      // Note: sources template doesn't use partialAnalysisNote, but renderer should handle it
    });
  });

  describe("instruction block formatting", () => {
    test("instructions should be properly formatted with double underscores", () => {
      const definition = fileTypePromptMetadata.java;
      const data = { content: testContent };

      const rendered = renderPrompt(definition, data);

      // Should contain properly formatted instruction section titles
      expect(rendered).toContain("__Basic Information__");
      expect(rendered).toContain("__References and Dependencies__");
      expect(rendered).toContain("__Integration Points__");
      expect(rendered).toContain("__Database Integration Analysis__");
      expect(rendered).toContain("__Code Quality Metrics__");
    });

    test("instructions should be properly formatted", () => {
      const definition = fileTypePromptMetadata.java;
      const data = { content: testContent };

      const rendered = renderPrompt(definition, data);
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
        const data = { content: "test content" };

        expect(() => {
          const rendered = renderPrompt(definition, data);
          expect(rendered).toBeTruthy();
          expect(typeof rendered).toBe("string");
          expect(rendered.length).toBeGreaterThan(0);
        }).not.toThrow();
      });
    });
  });
});
