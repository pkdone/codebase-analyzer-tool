/**
 * Tests for output configuration including JSON filenames.
 */

import { outputConfig } from "../../../src/app/config/output.config";

describe("outputConfig", () => {
  describe("base output configuration", () => {
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

  describe("external assets configuration", () => {
    it("should have Mermaid CDN URL defined", () => {
      expect(outputConfig.externalAssets.MERMAID_CDN_UMD_URL).toContain("mermaid");
      expect(outputConfig.externalAssets.MERMAID_CDN_UMD_URL).toContain("cdn.jsdelivr.net");
    });

    it("should have Mermaid UMD filename defined", () => {
      expect(outputConfig.externalAssets.MERMAID_UMD_FILENAME).toBe("mermaid.min.js");
    });
  });

  describe("internal assets configuration", () => {
    it("should have CSS_FILENAME defined", () => {
      expect(outputConfig.assets.CSS_FILENAME).toBe("style.css");
    });

    it("should have JSON_ICON_FILENAME defined", () => {
      expect(outputConfig.assets.JSON_ICON_FILENAME).toBe("json-icon.svg");
    });

    it("should have ASSETS_SUBDIR defined", () => {
      expect(outputConfig.assets.ASSETS_SUBDIR).toBe("assets");
    });
  });

  describe("JSON files configuration", () => {
    it("should have COMPLETE_REPORT filename defined", () => {
      expect(outputConfig.jsonFiles.COMPLETE_REPORT).toBe("codebase-report.json");
    });

    it("should have APP_STATS filename defined", () => {
      expect(outputConfig.jsonFiles.APP_STATS).toBe("app-stats.json");
    });

    it("should have APP_DESCRIPTION filename defined", () => {
      expect(outputConfig.jsonFiles.APP_DESCRIPTION).toBe("app-description.json");
    });

    it("should have FILE_TYPES filename defined", () => {
      expect(outputConfig.jsonFiles.FILE_TYPES).toBe("file-types.json");
    });

    it("should have DB_INTERACTIONS filename defined", () => {
      expect(outputConfig.jsonFiles.DB_INTERACTIONS).toBe("db-interactions.json");
    });

    it("should have PROCS_AND_TRIGGERS filename defined", () => {
      expect(outputConfig.jsonFiles.PROCS_AND_TRIGGERS).toBe("procs-and-triggers.json");
    });

    it("should have INTEGRATION_POINTS filename defined", () => {
      expect(outputConfig.jsonFiles.INTEGRATION_POINTS).toBe("integration-points.json");
    });

    it("should have UI_TECHNOLOGY_ANALYSIS filename defined", () => {
      expect(outputConfig.jsonFiles.UI_TECHNOLOGY_ANALYSIS).toBe("ui-technology-analysis.json");
    });

    it("should have all JSON filenames end with .json extension", () => {
      const jsonFiles = Object.values(outputConfig.jsonFiles);
      jsonFiles.forEach((filename) => {
        expect(filename).toMatch(/\.json$/);
      });
    });

    it("should have unique JSON filenames", () => {
      const jsonFiles = Object.values(outputConfig.jsonFiles);
      const uniqueFiles = new Set(jsonFiles);
      expect(uniqueFiles.size).toBe(jsonFiles.length);
    });
  });

  describe("immutability", () => {
    it("should be a readonly object", () => {
      const config = outputConfig;
      expect(config).toHaveProperty("OUTPUT_DIR");
      expect(config).toHaveProperty("jsonFiles");
      expect(config).toHaveProperty("assets");
      expect(config).toHaveProperty("externalAssets");
    });
  });
});
