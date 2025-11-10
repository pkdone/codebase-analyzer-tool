import {
  CODE_FENCE_REGEXES,
  CONCATENATION_REGEXES,
  BINARY_CORRUPTION_REGEX,
} from "../../../../src/llm/json-processing/constants/regex.constants";
import { CODE_FENCE_MARKERS } from "../../../../src/llm/json-processing/constants/json-processing.config";

describe("regex.constants", () => {
  describe("CODE_FENCE_REGEXES", () => {
    it("should match JSON code fences", () => {
      const testString = "```json\n{ \"key\": \"value\" }\n```";
      const matches = CODE_FENCE_REGEXES[0].test(testString);
      expect(matches).toBe(true);
    });

    it("should match JavaScript code fences", () => {
      const testString = "```javascript\n{ \"key\": \"value\" }\n```";
      const matches = CODE_FENCE_REGEXES[1].test(testString);
      expect(matches).toBe(true);
    });

    it("should match TypeScript code fences", () => {
      const testString = "```ts\n{ \"key\": \"value\" }\n```";
      const matches = CODE_FENCE_REGEXES[2].test(testString);
      expect(matches).toBe(true);
    });

    it("should match generic code fences", () => {
      const testString = "```\n{ \"key\": \"value\" }\n```";
      const matches = CODE_FENCE_REGEXES[3].test(testString);
      expect(matches).toBe(true);
    });

    it("should remove all code fence types when applied in sequence", () => {
      let testString = "```json\n{ \"key\": \"value\" }\n```";
      for (const regex of CODE_FENCE_REGEXES) {
        testString = testString.replace(regex, "");
      }
      expect(testString).not.toContain(CODE_FENCE_MARKERS.GENERIC);
    });
  });

  describe("CONCATENATION_REGEXES", () => {
    it("IDENTIFIER_ONLY_CHAIN should match identifier-only concatenation", () => {
      const testString = '{"path": BASE_PATH + OTHER_PATH}';
      const matches = testString.match(CONCATENATION_REGEXES.IDENTIFIER_ONLY_CHAIN);
      expect(matches).not.toBeNull();
    });

    it("IDENTIFIER_THEN_LITERAL should match identifiers followed by literal", () => {
      const testString = '{"path": BASE_PATH + "/file"}';
      const matches = testString.match(CONCATENATION_REGEXES.IDENTIFIER_THEN_LITERAL);
      expect(matches).not.toBeNull();
    });

    it("LITERAL_THEN_IDENTIFIER should match literals followed by identifiers", () => {
      const testString = '{"path": "/base" + PATH_SUFFIX}';
      const matches = testString.match(CONCATENATION_REGEXES.LITERAL_THEN_IDENTIFIER);
      expect(matches).not.toBeNull();
    });

    it("CONSECUTIVE_LITERALS should match consecutive string literals", () => {
      const testString = '{"path": "/base" + "/file"}';
      const matches = testString.match(CONCATENATION_REGEXES.CONSECUTIVE_LITERALS);
      expect(matches).not.toBeNull();
    });
  });

  describe("BINARY_CORRUPTION_REGEX", () => {
    it("should match binary corruption markers", () => {
      const testString = '{"name": "value<y_bin_305>more"}';
      const matches = testString.match(BINARY_CORRUPTION_REGEX);
      expect(matches).not.toBeNull();
      expect(matches?.[0]).toBe("<y_bin_305>");
    });

    it("should match multiple binary corruption markers", () => {
      const testString = '{"name": "<y_bin_123>value<y_bin_456>"}';
      const matches = Array.from(testString.matchAll(BINARY_CORRUPTION_REGEX));
      expect(matches.length).toBe(2);
      expect(matches[0][0]).toBe("<y_bin_123>");
      expect(matches[1][0]).toBe("<y_bin_456>");
    });

    it("should not match non-binary patterns", () => {
      const testString = '{"name": "value"}';
      const matches = testString.match(BINARY_CORRUPTION_REGEX);
      expect(matches).toBeNull();
    });
  });
});

