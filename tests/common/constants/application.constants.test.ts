import {
  UNKNOWN_VALUE_PLACEHOLDER,
  NOT_APPLICABLE_PLACEHOLDER,
} from "../../../src/common/constants/application.constants";

describe("Application Constants", () => {
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

  describe("NOT_APPLICABLE_PLACEHOLDER", () => {
    it("should be defined", () => {
      expect(NOT_APPLICABLE_PLACEHOLDER).toBeDefined();
    });

    it("should be the string 'N/A'", () => {
      expect(NOT_APPLICABLE_PLACEHOLDER).toBe("N/A");
    });

    it("should be a string type", () => {
      expect(typeof NOT_APPLICABLE_PLACEHOLDER).toBe("string");
    });
  });

  describe("constants consistency", () => {
    it("should have distinct values for different purposes", () => {
      expect(UNKNOWN_VALUE_PLACEHOLDER).not.toBe(NOT_APPLICABLE_PLACEHOLDER);
    });
  });
});
