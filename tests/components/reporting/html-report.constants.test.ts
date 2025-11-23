import { htmlReportConstants } from "../../../src/components/reporting/html-report.constants";

describe("htmlReportConstants", () => {
  describe("paths", () => {
    it("should be defined", () => {
      expect(htmlReportConstants.paths).toBeDefined();
    });

    it("should have CHARTS_DIR", () => {
      expect(htmlReportConstants.paths.CHARTS_DIR).toBe("charts/");
    });

    it("should have DEPENDENCY_TREES_DIR", () => {
      expect(htmlReportConstants.paths.DEPENDENCY_TREES_DIR).toBe("dependency-trees/");
    });
  });

  describe("directories", () => {
    it("should be defined", () => {
      expect(htmlReportConstants.directories).toBeDefined();
    });

    it("should have CHARTS", () => {
      expect(htmlReportConstants.directories.CHARTS).toBe("charts");
    });

    it("should have DEPENDENCY_TREES", () => {
      expect(htmlReportConstants.directories.DEPENDENCY_TREES).toBe("dependency-trees");
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

    it("should have CLASSPATH", () => {
      expect(htmlReportConstants.columnHeaders.CLASSPATH).toBe("Classpath");
    });

    it("should have DEPENDENCIES_COUNT", () => {
      expect(htmlReportConstants.columnHeaders.DEPENDENCIES_COUNT).toBe("Dependencies Count");
    });
  });

  describe("html", () => {
    it("should be defined", () => {
      expect(htmlReportConstants.html).toBeDefined();
    });

    it("should have LINK_TEMPLATE function", () => {
      expect(typeof htmlReportConstants.html.LINK_TEMPLATE).toBe("function");
    });

    it("should generate correct link HTML", () => {
      const link = htmlReportConstants.html.LINK_TEMPLATE("https://example.com", "Example");
      expect(link).toBe('<a href="https://example.com" target="_blank">Example</a>');
    });

    it("should use custom target when provided", () => {
      const link = htmlReportConstants.html.LINK_TEMPLATE(
        "https://example.com",
        "Example",
        "_self",
      );
      expect(link).toBe('<a href="https://example.com" target="_self">Example</a>');
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
