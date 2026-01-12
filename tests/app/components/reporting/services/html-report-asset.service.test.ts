import "reflect-metadata";
import { HtmlReportAssetService } from "../../../../../src/app/components/reporting/services/html-report-asset.service";
import type { OutputConfigType } from "../../../../../src/app/config/output.config";

// Mock fs module
jest.mock("fs", () => ({
  promises: {
    readFile: jest.fn(),
  },
}));

import { promises as fs } from "fs";

const mockReadFile = fs.readFile as jest.MockedFunction<typeof fs.readFile>;

describe("HtmlReportAssetService", () => {
  const mockOutputConfig: OutputConfigType = {
    OUTPUT_DIR: "output",
    OUTPUT_SUMMARY_FILENAME: "codebase-report",
    OUTPUT_SUMMARY_HTML_FILE: "codebase-report.html",
    HTML_TEMPLATES_DIR: "templates",
    HTML_MAIN_TEMPLATE_FILE: "main.ejs",
    externalAssets: {
      MERMAID_CDN_UMD_URL: "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js",
      MERMAID_UMD_FILENAME: "mermaid.min.js",
    },
    assets: {
      CSS_FILENAME: "style.css",
      JSON_ICON_FILENAME: "json-icon.svg",
      ASSETS_SUBDIR: "assets",
    },
  };

  let service: HtmlReportAssetService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new HtmlReportAssetService(mockOutputConfig);
  });

  describe("loadAssets", () => {
    it("should load CSS and SVG assets from the file system", async () => {
      const mockCss = "body { color: red; }";
      const mockSvg = '<svg><path d="M0 0" /></svg>';

      mockReadFile.mockImplementation(async (filePath: unknown) => {
        const pathStr = String(filePath);
        if (pathStr.includes("style.css")) {
          return mockCss;
        }
        if (pathStr.includes("json-icon.svg")) {
          return mockSvg;
        }
        throw new Error(`Unexpected file: ${pathStr}`);
      });

      const result = await service.loadAssets();

      expect(result.inlineCss).toBe(mockCss);
      expect(result.jsonIconSvg).toBe(mockSvg);
      expect(mockReadFile).toHaveBeenCalledTimes(2);
    });

    it("should cache assets after first load", async () => {
      const mockCss = "body { color: blue; }";
      const mockSvg = "<svg></svg>";

      mockReadFile.mockImplementation(async (filePath: unknown) => {
        const pathStr = String(filePath);
        if (pathStr.includes("style.css")) {
          return mockCss;
        }
        if (pathStr.includes("json-icon.svg")) {
          return mockSvg;
        }
        throw new Error(`Unexpected file: ${pathStr}`);
      });

      // First call
      const result1 = await service.loadAssets();
      expect(result1.inlineCss).toBe(mockCss);

      // Second call - should use cache
      const result2 = await service.loadAssets();
      expect(result2.inlineCss).toBe(mockCss);

      // readFile should only be called twice (once for CSS, once for SVG) total
      expect(mockReadFile).toHaveBeenCalledTimes(2);
    });

    it("should propagate errors when file read fails", async () => {
      mockReadFile.mockRejectedValue(new Error("File not found"));

      await expect(service.loadAssets()).rejects.toThrow("File not found");
    });
  });

  describe("clearCache", () => {
    it("should clear cached assets and reload on next call", async () => {
      const mockCss1 = "body { color: red; }";
      const mockCss2 = "body { color: green; }";
      const mockSvg = "<svg></svg>";
      let callCount = 0;

      mockReadFile.mockImplementation(async (filePath: unknown) => {
        const pathStr = String(filePath);
        if (pathStr.includes("style.css")) {
          callCount++;
          return callCount === 1 ? mockCss1 : mockCss2;
        }
        if (pathStr.includes("json-icon.svg")) {
          return mockSvg;
        }
        throw new Error(`Unexpected file: ${pathStr}`);
      });

      // First load
      const result1 = await service.loadAssets();
      expect(result1.inlineCss).toBe(mockCss1);

      // Clear cache
      service.clearCache();

      // Second load should read from file again
      const result2 = await service.loadAssets();
      expect(result2.inlineCss).toBe(mockCss2);

      // readFile for CSS should have been called twice (two loads after cache clear)
      expect(mockReadFile).toHaveBeenCalledTimes(4); // 2 per load × 2 loads
    });
  });

  describe("asset properties", () => {
    it("should return readonly asset properties", async () => {
      const mockCss = "body {}";
      const mockSvg = "<svg />";

      mockReadFile.mockImplementation(async (filePath: unknown) => {
        const pathStr = String(filePath);
        if (pathStr.includes("style.css")) {
          return mockCss;
        }
        if (pathStr.includes("json-icon.svg")) {
          return mockSvg;
        }
        throw new Error(`Unexpected file: ${pathStr}`);
      });

      const assets = await service.loadAssets();

      // TypeScript should enforce readonly, but we verify the values are present
      expect(typeof assets.inlineCss).toBe("string");
      expect(typeof assets.jsonIconSvg).toBe("string");
    });
  });
});
