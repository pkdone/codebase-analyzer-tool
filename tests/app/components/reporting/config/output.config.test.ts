import { outputConfig } from "../../../../../src/app/config/output.config";

describe("outputConfig", () => {
  describe("basic configuration", () => {
    it("should have OUTPUT_DIR defined", () => {
      expect(outputConfig.OUTPUT_DIR).toBe("output");
    });

    it("should have OUTPUT_SUMMARY_FILENAME defined", () => {
      expect(outputConfig.OUTPUT_SUMMARY_FILENAME).toBe("codebase-report");
    });

    it("should have OUTPUT_SUMMARY_HTML_FILE defined", () => {
      expect(outputConfig.OUTPUT_SUMMARY_HTML_FILE).toBe("codebase-report.html");
    });

    it("should have HTML_TEMPLATES_DIR defined", () => {
      expect(outputConfig.HTML_TEMPLATES_DIR).toBe("templates");
    });

    it("should have HTML_MAIN_TEMPLATE_FILE defined", () => {
      expect(outputConfig.HTML_MAIN_TEMPLATE_FILE).toBe("main.ejs");
    });
  });

  describe("externalAssets", () => {
    it("should have externalAssets defined", () => {
      expect(outputConfig.externalAssets).toBeDefined();
    });

    it("should have MERMAID_CDN_UMD_URL", () => {
      expect(outputConfig.externalAssets.MERMAID_CDN_UMD_URL).toContain("mermaid");
      expect(outputConfig.externalAssets.MERMAID_CDN_UMD_URL).toContain("cdn.jsdelivr.net");
    });

    it("should have MERMAID_UMD_FILENAME", () => {
      expect(outputConfig.externalAssets.MERMAID_UMD_FILENAME).toBe("mermaid.min.js");
    });

    it("should have valid URL format for MERMAID_CDN_UMD_URL", () => {
      const url = outputConfig.externalAssets.MERMAID_CDN_UMD_URL;
      expect(url).toMatch(/^https:\/\//);
      expect(url).toMatch(/\.js$/);
    });
  });

  describe("assets", () => {
    it("should have assets defined", () => {
      expect(outputConfig.assets).toBeDefined();
    });

    it("should have CSS_FILENAME", () => {
      expect(outputConfig.assets.CSS_FILENAME).toBe("style.css");
    });

    it("should have JSON_ICON_FILENAME", () => {
      expect(outputConfig.assets.JSON_ICON_FILENAME).toBe("json-icon.svg");
    });

    it("should have ASSETS_SUBDIR", () => {
      expect(outputConfig.assets.ASSETS_SUBDIR).toBe("assets");
    });
  });

  describe("jsonFiles", () => {
    it("should have jsonFiles defined", () => {
      expect(outputConfig.jsonFiles).toBeDefined();
    });

    it("should have all expected JSON output filenames", () => {
      expect(outputConfig.jsonFiles.COMPLETE_REPORT).toBe("codebase-report.json");
      expect(outputConfig.jsonFiles.APP_STATS).toBe("app-stats.json");
      expect(outputConfig.jsonFiles.APP_DESCRIPTION).toBe("app-description.json");
      expect(outputConfig.jsonFiles.FILE_TYPES).toBe("file-types.json");
      expect(outputConfig.jsonFiles.DB_INTERACTIONS).toBe("db-interactions.json");
      expect(outputConfig.jsonFiles.PROCS_AND_TRIGGERS).toBe("procs-and-triggers.json");
      expect(outputConfig.jsonFiles.INTEGRATION_POINTS).toBe("integration-points.json");
      expect(outputConfig.jsonFiles.UI_TECHNOLOGY_ANALYSIS).toBe("ui-technology-analysis.json");
    });
  });

  describe("formatting", () => {
    it("should have formatting defined", () => {
      expect(outputConfig.formatting).toBeDefined();
    });

    it("should have DATE_LOCALE with a valid locale string", () => {
      expect(outputConfig.formatting.DATE_LOCALE).toBe("en-GB");
    });

    it("should have DATE_LOCALE as a string type", () => {
      expect(typeof outputConfig.formatting.DATE_LOCALE).toBe("string");
    });
  });

  describe("immutability", () => {
    it("should be a const object", () => {
      expect(outputConfig).toBeDefined();
    });
  });
});
