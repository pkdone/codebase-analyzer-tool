import {
  formatDateForDisplay,
  formatDateForLogging,
  formatDateForFilename,
} from "../../../src/common/utils/date-utils";

describe("date-utils", () => {
  describe("formatDateForDisplay", () => {
    describe("without locale (default behavior)", () => {
      it("should return an ISO date string when no locale is specified", () => {
        const result = formatDateForDisplay();
        expect(typeof result).toBe("string");
        // ISO format: YYYY-MM-DDTHH:mm:ss.sssZ
        expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      });

      it("should be parseable by Date constructor", () => {
        const result = formatDateForDisplay();
        const parsed = new Date(result);
        expect(parsed.getTime()).not.toBeNaN();
      });
    });

    describe("with locale", () => {
      it("should format date using en-GB locale (DD/MM/YYYY, HH:mm:ss)", () => {
        const testDate = new Date("2024-01-25T12:30:45.000Z");
        const result = formatDateForDisplay(testDate, "en-GB");
        // Pattern: DD/MM/YYYY, HH:mm:ss
        expect(result).toMatch(/^\d{2}\/\d{2}\/\d{4}, \d{2}:\d{2}:\d{2}$/);
      });

      it("should format date using en-US locale", () => {
        const testDate = new Date("2024-01-25T12:30:45.000Z");
        const result = formatDateForDisplay(testDate, "en-US");
        // US format: MM/DD/YYYY, HH:mm:ss
        expect(result).toMatch(/^\d{1,2}\/\d{1,2}\/\d{4}, \d{2}:\d{2}:\d{2}$/);
      });

      it("should use custom format options when provided", () => {
        const testDate = new Date("2024-01-25T12:30:45.000Z");
        const result = formatDateForDisplay(testDate, "en-GB", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });
        // Should contain the month name
        expect(result).toContain("January");
      });
    });

    describe("with custom date", () => {
      it("should format the provided date instead of current date", () => {
        const specificDate = new Date("2020-06-15T10:20:30.000Z");
        const result = formatDateForDisplay(specificDate);
        expect(result).toBe("2020-06-15T10:20:30.000Z");
      });

      it("should format provided date with locale", () => {
        const specificDate = new Date("2020-06-15T10:20:30.000Z");
        const result = formatDateForDisplay(specificDate, "en-GB");
        // The exact format depends on timezone, but should contain the date components
        expect(result).toMatch(/\d{2}\/\d{2}\/2020/);
      });
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

    it("should format the provided date when given", () => {
      const specificDate = new Date("2020-06-15T10:20:30.000Z");
      const result = formatDateForLogging(specificDate);
      expect(result).toBe("2020-06-15T10:20:30.000Z");
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

    it("should format the provided date when given", () => {
      const specificDate = new Date("2020-06-15T10:20:30.123Z");
      const result = formatDateForFilename(specificDate);
      expect(result).toBe("2020-06-15T10-20-30-123Z");
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
