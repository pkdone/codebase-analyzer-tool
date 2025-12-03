import {
  formatDateForDisplay,
  formatDateForLogging,
  formatDateForFilename,
} from "../../../src/common/utils/date-utils";

describe("date-utils", () => {
  describe("formatDateForDisplay", () => {
    it("should return a formatted date string", () => {
      const result = formatDateForDisplay();
      expect(typeof result).toBe("string");
      expect(result.length).toBeGreaterThan(0);
    });

    it("should follow DD/MM/YYYY, HH:mm:ss format pattern", () => {
      const result = formatDateForDisplay();
      // Pattern: DD/MM/YYYY, HH:mm:ss
      expect(result).toMatch(/^\d{2}\/\d{2}\/\d{4}, \d{2}:\d{2}:\d{2}$/);
    });
  });

  describe("formatDateForLogging", () => {
    it("should return an ISO 8601 date string", () => {
      const result = formatDateForLogging();
      expect(typeof result).toBe("string");
      // ISO format: YYYY-MM-DDTHH:mm:ss.sssZ
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it("should be parseable by Date constructor", () => {
      const result = formatDateForLogging();
      const parsed = new Date(result);
      expect(parsed.getTime()).not.toBeNaN();
    });
  });

  describe("formatDateForFilename", () => {
    it("should return a filesystem-safe date string", () => {
      const result = formatDateForFilename();
      expect(typeof result).toBe("string");
      expect(result.length).toBeGreaterThan(0);
    });

    it("should not contain colons (unsafe for Windows filenames)", () => {
      const result = formatDateForFilename();
      expect(result).not.toContain(":");
    });

    it("should not contain dots (replaced for consistency)", () => {
      const result = formatDateForFilename();
      expect(result).not.toContain(".");
    });

    it("should use hyphens as separators instead of colons and dots", () => {
      const result = formatDateForFilename();
      // Pattern: YYYY-MM-DDTHH-mm-ss-sssZ
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z$/);
    });

    it("should be based on ISO format with replaced characters", () => {
      // Get both formats around the same time
      const isoFormat = new Date().toISOString();
      const filenameFormat = formatDateForFilename();

      // Replace colons and dots in ISO format to match filename format
      const expected = isoFormat.replaceAll(/[:.]/g, "-");

      // Both should have the same structure (may differ by milliseconds)
      expect(filenameFormat.length).toBe(expected.length);
      expect(filenameFormat).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z$/);
    });

    it("should produce unique values for different calls", async () => {
      const result1 = formatDateForFilename();
      // Wait a small amount to ensure timestamp changes
      await new Promise((resolve) => setTimeout(resolve, 2));
      const result2 = formatDateForFilename();

      // Note: This test might occasionally fail if called at exact same millisecond,
      // but with the delay it should be reliable
      expect(result2).not.toBe(result1);
    });
  });
});
