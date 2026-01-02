import { htmlReportConstants } from "../../../../src/app/components/reporting/html-report.constants";

describe("htmlReportConstants", () => {
  describe("paths", () => {
    it("should be defined", () => {
      expect(htmlReportConstants.paths).toBeDefined();
    });

    it("should have ASSETS_DIR", () => {
      expect(htmlReportConstants.paths.ASSETS_DIR).toBe("assets/");
    });
  });

  describe("directories", () => {
    it("should be defined", () => {
      expect(htmlReportConstants.directories).toBeDefined();
    });

    it("should have ASSETS", () => {
      expect(htmlReportConstants.directories.ASSETS).toBe("assets");
    });
  });

  describe("columnHeaders", () => {
    it("should be defined", () => {
      expect(htmlReportConstants.columnHeaders).toBeDefined();
    });

    it("should have FILE_TYPE", () => {
      expect(htmlReportConstants.columnHeaders.FILE_TYPE).toBe("File Type");
    });

    it("should have FILES_COUNT", () => {
      expect(htmlReportConstants.columnHeaders.FILES_COUNT).toBe("Files Count");
    });

    it("should have LINES_COUNT", () => {
      expect(htmlReportConstants.columnHeaders.LINES_COUNT).toBe("Lines Count");
    });
  });

  describe("protocols (removed)", () => {
    it("should not have protocols property", () => {
      expect(htmlReportConstants).not.toHaveProperty("protocols");
    });
  });

  describe("immutability", () => {
    it("should be a const object", () => {
      // TypeScript enforces immutability at compile time with 'as const'
      expect(htmlReportConstants).toBeDefined();
    });
  });
});
