import {
  UNKNOWN_VALUE_PLACEHOLDER,
  NOT_AVAILABLE_PLACEHOLDER,
} from "../../../../../src/app/components/reporting/config/placeholders.config";

describe("Placeholders Config", () => {
  describe("UNKNOWN_VALUE_PLACEHOLDER", () => {
    it("should be defined", () => {
      expect(UNKNOWN_VALUE_PLACEHOLDER).toBeDefined();
    });

    it("should be the string 'unknown'", () => {
      expect(UNKNOWN_VALUE_PLACEHOLDER).toBe("unknown");
    });

    it("should be a string type", () => {
      expect(typeof UNKNOWN_VALUE_PLACEHOLDER).toBe("string");
    });

    it("should be usable as a fallback value", () => {
      const getValue = (): string | undefined => undefined;
      const result = getValue() ?? UNKNOWN_VALUE_PLACEHOLDER;
      expect(result).toBe("unknown");
    });

    it("should work with the || operator for falsy values", () => {
      const getEmptyString = (): string => "";
      const result = getEmptyString() || UNKNOWN_VALUE_PLACEHOLDER;
      expect(result).toBe("unknown");
    });
  });

  describe("NOT_AVAILABLE_PLACEHOLDER", () => {
    it("should be defined", () => {
      expect(NOT_AVAILABLE_PLACEHOLDER).toBeDefined();
    });

    it("should be the string 'N/A'", () => {
      expect(NOT_AVAILABLE_PLACEHOLDER).toBe("N/A");
    });

    it("should be a string type", () => {
      expect(typeof NOT_AVAILABLE_PLACEHOLDER).toBe("string");
    });

    it("should be usable as a fallback value", () => {
      const getValue = (): string | undefined => undefined;
      const result = getValue() ?? NOT_AVAILABLE_PLACEHOLDER;
      expect(result).toBe("N/A");
    });
  });
});
