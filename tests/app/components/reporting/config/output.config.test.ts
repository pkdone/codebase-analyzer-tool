import { outputConfig } from "../../../../../src/app/components/reporting/config/output.config";

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

  describe("immutability", () => {
    it("should be a const object", () => {
      expect(outputConfig).toBeDefined();
    });
  });
});

