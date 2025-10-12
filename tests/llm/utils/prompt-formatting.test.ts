import { formatSourcesForPrompt } from "../../../src/llm/utils/prompt-formatting";
import type { ProjectedSourceMetataContentAndSummary } from "../../../src/repositories/source/sources.model";

describe("prompt-formatting", () => {
  describe("formatSourcesForPrompt", () => {
    test("should format single source file into markdown code block", () => {
      const sources: ProjectedSourceMetataContentAndSummary[] = [
        {
          projectName: "test-project",
          filepath: "test.ts",
          type: "typescript",
          content: "const x = 1;",
          summary: undefined,
        },
      ];

      const result = formatSourcesForPrompt(sources);

      expect(result).toBe("```typescript\nconst x = 1;\n```\n\n");
    });

    test("should format multiple source files with proper separation", () => {
      const sources: ProjectedSourceMetataContentAndSummary[] = [
        {
          projectName: "test-project",
          filepath: "app.ts",
          type: "typescript",
          content: "const app = true;",
          summary: undefined,
        },
        {
          projectName: "test-project",
          filepath: "utils.py",
          type: "python",
          content: "def helper():\n    pass",
          summary: undefined,
        },
      ];

      const result = formatSourcesForPrompt(sources);

      expect(result).toBe(
        "```typescript\nconst app = true;\n```\n\n```python\ndef helper():\n    pass\n```\n\n",
      );
    });

    test("should handle empty source list", () => {
      const sources: ProjectedSourceMetataContentAndSummary[] = [];

      const result = formatSourcesForPrompt(sources);

      expect(result).toBe("");
    });

    test("should handle source with empty content", () => {
      const sources: ProjectedSourceMetataContentAndSummary[] = [
        {
          projectName: "test-project",
          filepath: "empty.ts",
          type: "typescript",
          content: "",
          summary: undefined,
        },
      ];

      const result = formatSourcesForPrompt(sources);

      expect(result).toBe("```typescript\n\n```\n\n");
    });

    test("should preserve whitespace and formatting in content", () => {
      const sources: ProjectedSourceMetataContentAndSummary[] = [
        {
          projectName: "test-project",
          filepath: "formatted.ts",
          type: "typescript",
          content: "function test() {\n  return {\n    key: 'value'\n  };\n}",
          summary: undefined,
        },
      ];

      const result = formatSourcesForPrompt(sources);

      expect(result).toContain("function test() {\n  return {\n    key: 'value'\n  };\n}");
    });

    test("should handle various file types", () => {
      const sources: ProjectedSourceMetataContentAndSummary[] = [
        {
          projectName: "test-project",
          filepath: "script.js",
          type: "javascript",
          content: "console.log(1);",
          summary: undefined,
        },
        {
          projectName: "test-project",
          filepath: "style.css",
          type: "css",
          content: "body { margin: 0; }",
          summary: undefined,
        },
        {
          projectName: "test-project",
          filepath: "doc.md",
          type: "markdown",
          content: "# Header",
          summary: undefined,
        },
      ];

      const result = formatSourcesForPrompt(sources);

      expect(result).toContain("```javascript\n");
      expect(result).toContain("```css\n");
      expect(result).toContain("```markdown\n");
    });

    test("should handle source with special characters", () => {
      const sources: ProjectedSourceMetataContentAndSummary[] = [
        {
          projectName: "test-project",
          filepath: "special.ts",
          type: "typescript",
          content: 'const regex = /[a-z]+/gi;\nconst str = "Hello `world`";',
          summary: undefined,
        },
      ];

      const result = formatSourcesForPrompt(sources);

      expect(result).toBe(
        '```typescript\nconst regex = /[a-z]+/gi;\nconst str = "Hello `world`";\n```\n\n',
      );
    });

    test("should handle sources with multiline content", () => {
      const sources: ProjectedSourceMetataContentAndSummary[] = [
        {
          projectName: "test-project",
          filepath: "multiline.ts",
          type: "typescript",
          content: "line1\nline2\nline3\nline4\nline5",
          summary: undefined,
        },
      ];

      const result = formatSourcesForPrompt(sources);

      const lines = result.split("\n");
      expect(lines).toContain("line1");
      expect(lines).toContain("line5");
    });

    test("should maintain order of sources", () => {
      const sources: ProjectedSourceMetataContentAndSummary[] = [
        {
          projectName: "test-project",
          filepath: "first.ts",
          type: "typescript",
          content: "// first",
          summary: undefined,
        },
        {
          projectName: "test-project",
          filepath: "second.ts",
          type: "typescript",
          content: "// second",
          summary: undefined,
        },
        {
          projectName: "test-project",
          filepath: "third.ts",
          type: "typescript",
          content: "// third",
          summary: undefined,
        },
      ];

      const result = formatSourcesForPrompt(sources);

      const firstIndex = result.indexOf("// first");
      const secondIndex = result.indexOf("// second");
      const thirdIndex = result.indexOf("// third");

      expect(firstIndex).toBeLessThan(secondIndex);
      expect(secondIndex).toBeLessThan(thirdIndex);
    });

    test("should handle sources with summary field (ignored in formatting)", () => {
      const sources: ProjectedSourceMetataContentAndSummary[] = [
        {
          projectName: "test-project",
          filepath: "with-summary.ts",
          type: "typescript",
          content: "const x = 1;",
          summary: { purpose: "test", implementation: "test" },
        },
      ];

      const result = formatSourcesForPrompt(sources);

      // Summary should not appear in output
      expect(result).toBe("```typescript\nconst x = 1;\n```\n\n");
      expect(result).not.toContain("purpose");
      expect(result).not.toContain("implementation");
    });
  });
});
