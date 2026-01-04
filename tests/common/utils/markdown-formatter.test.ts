import {
  formatFilesAsMarkdownCodeBlocks,
  formatFilesAsMarkdownCodeBlocksWithPath,
  type SourceFileContent,
} from "../../../src/common/utils/markdown-formatter";

describe("markdown-formatter", () => {
  describe("formatFilesAsMarkdownCodeBlocks", () => {
    it("should format a single file as markdown code block", () => {
      const files: SourceFileContent[] = [
        {
          filepath: "src/app.ts",
          type: "ts",
          content: "export const app = {};",
        },
      ];

      const result = formatFilesAsMarkdownCodeBlocks(files);
      expect(result).toBe("```ts\nexport const app = {};\n```\n\n");
    });

    it("should format multiple files as markdown code blocks", () => {
      const files: SourceFileContent[] = [
        {
          filepath: "src/app.ts",
          type: "ts",
          content: "export const app = {};",
        },
        {
          filepath: "src/utils.ts",
          type: "ts",
          content: "export function util() {}",
        },
      ];

      const result = formatFilesAsMarkdownCodeBlocks(files);
      expect(result).toContain("```ts\nexport const app = {};\n```\n\n");
      expect(result).toContain("```ts\nexport function util() {}\n```\n\n");
    });

    it("should handle empty array", () => {
      const result = formatFilesAsMarkdownCodeBlocks([]);
      expect(result).toBe("");
    });

    it("should handle different file types", () => {
      const files: SourceFileContent[] = [
        {
          filepath: "src/app.ts",
          type: "ts",
          content: "export const app = {};",
        },
        {
          filepath: "src/app.ts",
          type: "js",
          content: "export const app = {};",
        },
      ];

      const result = formatFilesAsMarkdownCodeBlocks(files);
      expect(result).toContain("```ts\n");
      expect(result).toContain("```js\n");
    });
  });

  describe("formatFilesAsMarkdownCodeBlocksWithPath", () => {
    it("should format files with filepath as header", () => {
      const files: SourceFileContent[] = [
        {
          filepath: "/project/src/app.ts",
          type: "ts",
          content: "export const app = {};",
        },
      ];

      const result = formatFilesAsMarkdownCodeBlocksWithPath(files, "/project");
      expect(result).toBe("\n``` src/app.ts\nexport const app = {};\n```\n");
    });

    it("should calculate relative paths correctly", () => {
      const files: SourceFileContent[] = [
        {
          filepath: "/project/src/components/Button.tsx",
          type: "tsx",
          content: "export const Button = () => null;",
        },
      ];

      const result = formatFilesAsMarkdownCodeBlocksWithPath(files, "/project");
      expect(result).toContain("``` src/components/Button.tsx\n");
    });

    it("should handle files without baseDirPath", () => {
      const files: SourceFileContent[] = [
        {
          filepath: "src/app.ts",
          type: "ts",
          content: "export const app = {};",
        },
      ];

      const result = formatFilesAsMarkdownCodeBlocksWithPath(files);
      expect(result).toContain("``` src/app.ts\n");
    });

    it("should trim content", () => {
      const files: SourceFileContent[] = [
        {
          filepath: "src/app.ts",
          type: "ts",
          content: "  export const app = {};  ",
        },
      ];

      const result = formatFilesAsMarkdownCodeBlocksWithPath(files);
      expect(result).toContain("export const app = {};");
      expect(result).not.toContain("  export");
    });

    it("should handle multiple files", () => {
      const files: SourceFileContent[] = [
        {
          filepath: "/project/src/app.ts",
          type: "ts",
          content: "export const app = {};",
        },
        {
          filepath: "/project/src/utils.ts",
          type: "ts",
          content: "export function util() {}",
        },
      ];

      const result = formatFilesAsMarkdownCodeBlocksWithPath(files, "/project");
      expect(result).toContain("``` src/app.ts\n");
      expect(result).toContain("``` src/utils.ts\n");
    });
  });
});
