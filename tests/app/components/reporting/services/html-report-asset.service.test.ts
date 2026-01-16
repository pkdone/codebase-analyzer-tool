import "reflect-metadata";
import { HtmlReportAssetService } from "../../../../../src/app/components/reporting/services/html-report-asset.service";
import type { OutputConfigType } from "../../../../../src/app/config/output.config";

// Mock fs module
jest.mock("fs", () => ({
  promises: {
    readFile: jest.fn(),
    mkdir: jest.fn(),
    access: jest.fn(),
    writeFile: jest.fn(),
  },
}));

import { promises as fs } from "fs";

const mockReadFile = fs.readFile as jest.MockedFunction<typeof fs.readFile>;
const mockMkdir = fs.mkdir as jest.MockedFunction<typeof fs.mkdir>;
const mockAccess = fs.access as jest.MockedFunction<typeof fs.access>;
const mockWriteFile = fs.writeFile as jest.MockedFunction<typeof fs.writeFile>;

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

  describe("ensureMermaidAsset", () => {
    const outputDir = "/test/output";
    const consoleSpy = jest.spyOn(console, "log").mockImplementation();
    const consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation();

    beforeEach(() => {
      consoleSpy.mockClear();
      consoleWarnSpy.mockClear();
    });

    afterAll(() => {
      consoleSpy.mockRestore();
      consoleWarnSpy.mockRestore();
    });

    it("should skip download if Mermaid.js already exists", async () => {
      mockMkdir.mockResolvedValue(undefined);
      mockAccess.mockResolvedValue(undefined); // File exists

      await service.ensureMermaidAsset(outputDir);

      expect(mockMkdir).toHaveBeenCalledWith(expect.stringContaining("assets"), {
        recursive: true,
      });
      expect(mockAccess).toHaveBeenCalled();
      expect(mockWriteFile).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(
        "Mermaid.js already exists in assets directory, skipping download",
      );
    });

    it("should copy from node_modules when file does not exist", async () => {
      const mockMermaidContent = Buffer.from("// mermaid.js content");

      mockMkdir.mockResolvedValue(undefined);
      mockAccess.mockRejectedValue(new Error("ENOENT")); // File doesn't exist
      mockReadFile.mockImplementation(async (filePath: unknown) => {
        const pathStr = String(filePath);
        if (pathStr.includes("mermaid")) {
          return mockMermaidContent;
        }
        throw new Error(`Unexpected file: ${pathStr}`);
      });
      mockWriteFile.mockResolvedValue(undefined);

      await service.ensureMermaidAsset(outputDir);

      expect(mockMkdir).toHaveBeenCalledWith(expect.stringContaining("assets"), {
        recursive: true,
      });
      expect(mockWriteFile).toHaveBeenCalledWith(
        expect.stringContaining("mermaid.min.js"),
        mockMermaidContent,
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Mermaid.js copied from node_modules"),
      );
    });

    it("should fall back to CDN when node_modules copy fails", async () => {
      const mockCdnContent = new ArrayBuffer(8);
      const mockResponse = {
        ok: true,
        arrayBuffer: jest.fn().mockResolvedValue(mockCdnContent),
      };

      mockMkdir.mockResolvedValue(undefined);
      mockAccess.mockRejectedValue(new Error("ENOENT")); // File doesn't exist
      mockReadFile.mockRejectedValue(new Error("Cannot find module")); // node_modules not found
      mockWriteFile.mockResolvedValue(undefined);

      // Mock global fetch
      const originalFetch = global.fetch;
      global.fetch = jest.fn().mockResolvedValue(mockResponse);

      try {
        await service.ensureMermaidAsset(outputDir);

        expect(global.fetch).toHaveBeenCalledWith(
          mockOutputConfig.externalAssets.MERMAID_CDN_UMD_URL,
        );
        expect(mockWriteFile).toHaveBeenCalled();
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining("Mermaid.js downloaded and copied"),
        );
      } finally {
        global.fetch = originalFetch;
      }
    });

    it("should warn but not throw when all download methods fail", async () => {
      mockMkdir.mockResolvedValue(undefined);
      mockAccess.mockRejectedValue(new Error("ENOENT")); // File doesn't exist
      mockReadFile.mockRejectedValue(new Error("Cannot find module")); // node_modules not found

      // Mock global fetch to fail
      const originalFetch = global.fetch;
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      });

      try {
        // Should not throw
        await service.ensureMermaidAsset(outputDir);

        expect(consoleWarnSpy).toHaveBeenCalledWith(
          expect.stringContaining("Warning: Failed to download Mermaid.js"),
        );
      } finally {
        global.fetch = originalFetch;
      }
    });

    it("should handle mkdir failure gracefully", async () => {
      mockMkdir.mockRejectedValue(new Error("Permission denied"));

      // Should not throw
      await service.ensureMermaidAsset(outputDir);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining("Warning: Failed to download Mermaid.js"),
      );
    });
  });
});
