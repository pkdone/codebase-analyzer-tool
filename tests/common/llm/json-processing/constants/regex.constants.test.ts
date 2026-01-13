import {
  CODE_FENCE_REGEXES,
  CONCATENATION_REGEXES,
  LLM_TOKEN_ARTIFACT_REGEX,
  STRUCTURAL_PATTERNS,
} from "../../../../../src/common/llm/json-processing/constants/regex.constants";
import { CODE_FENCE_MARKERS } from "../../../../../src/common/llm/json-processing/constants/json-processing.config";

describe("regex.constants", () => {
  describe("CODE_FENCE_REGEXES", () => {
    it("should match JSON code fences", () => {
      const testString = '```json\n{ "key": "value" }\n```';
      const matches = CODE_FENCE_REGEXES[0].test(testString);
      expect(matches).toBe(true);
    });

    it("should match JavaScript code fences", () => {
      const testString = '```javascript\n{ "key": "value" }\n```';
      const matches = CODE_FENCE_REGEXES[1].test(testString);
      expect(matches).toBe(true);
    });

    it("should match TypeScript code fences", () => {
      const testString = '```ts\n{ "key": "value" }\n```';
      const matches = CODE_FENCE_REGEXES[2].test(testString);
      expect(matches).toBe(true);
    });

    it("should match generic code fences", () => {
      const testString = '```\n{ "key": "value" }\n```';
      const matches = CODE_FENCE_REGEXES[3].test(testString);
      expect(matches).toBe(true);
    });

    it("should remove all code fence types when applied in sequence", () => {
      let testString = '```json\n{ "key": "value" }\n```';
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

  describe("LLM_TOKEN_ARTIFACT_REGEX", () => {
    it("should match LLM token artifacts", () => {
      const testString = '{"name": "value<y_bin_305>more"}';
      const matches = testString.match(LLM_TOKEN_ARTIFACT_REGEX);
      expect(matches).not.toBeNull();
      expect(matches?.[0]).toBe("<y_bin_305>");
    });

    it("should match multiple LLM token artifacts", () => {
      const testString = '{"name": "<y_bin_123>value<y_bin_456>"}';
      const matches = Array.from(testString.matchAll(LLM_TOKEN_ARTIFACT_REGEX));
      expect(matches.length).toBe(2);
      expect(matches[0][0]).toBe("<y_bin_123>");
      expect(matches[1][0]).toBe("<y_bin_456>");
    });

    it("should not match non-artifact patterns", () => {
      const testString = '{"name": "value"}';
      const matches = testString.match(LLM_TOKEN_ARTIFACT_REGEX);
      expect(matches).toBeNull();
    });
  });

  describe("STRUCTURAL_PATTERNS", () => {
    describe("SENTENCE_LIKE_TEXT", () => {
      it("should match sentence-like text with 3+ words", () => {
        expect(STRUCTURAL_PATTERNS.SENTENCE_LIKE_TEXT.test("this is a sentence")).toBe(true);
        expect(STRUCTURAL_PATTERNS.SENTENCE_LIKE_TEXT.test("here is another one")).toBe(true);
      });

      it("should match sentences ending with punctuation", () => {
        expect(STRUCTURAL_PATTERNS.SENTENCE_LIKE_TEXT.test("this is a test.")).toBe(true);
        expect(STRUCTURAL_PATTERNS.SENTENCE_LIKE_TEXT.test("is this correct?")).toBe(true);
      });

      it("should not match short text", () => {
        expect(STRUCTURAL_PATTERNS.SENTENCE_LIKE_TEXT.test("ab")).toBe(false);
        expect(STRUCTURAL_PATTERNS.SENTENCE_LIKE_TEXT.test("word")).toBe(false);
      });

      it("should not match JSON-like text", () => {
        expect(STRUCTURAL_PATTERNS.SENTENCE_LIKE_TEXT.test('{"key": "value"}')).toBe(false);
      });
    });

    describe("TRUNCATION_INDICATOR", () => {
      it("should match ellipsis", () => {
        expect(STRUCTURAL_PATTERNS.TRUNCATION_INDICATOR.test("some text...")).toBe(true);
        expect(STRUCTURAL_PATTERNS.TRUNCATION_INDICATOR.test("...")).toBe(true);
      });

      it("should match (truncated) marker", () => {
        expect(STRUCTURAL_PATTERNS.TRUNCATION_INDICATOR.test("(truncated)")).toBe(true);
        expect(STRUCTURAL_PATTERNS.TRUNCATION_INDICATOR.test("data (truncated)")).toBe(true);
      });

      it("should match [truncated] marker", () => {
        expect(STRUCTURAL_PATTERNS.TRUNCATION_INDICATOR.test("[truncated]")).toBe(true);
      });

      it("should match etc.", () => {
        expect(STRUCTURAL_PATTERNS.TRUNCATION_INDICATOR.test("etc.")).toBe(true);
        expect(STRUCTURAL_PATTERNS.TRUNCATION_INDICATOR.test("and more etc")).toBe(true);
      });

      it("should not match normal text", () => {
        expect(STRUCTURAL_PATTERNS.TRUNCATION_INDICATOR.test("normal text")).toBe(false);
      });
    });

    describe("FIRST_PERSON_STATEMENT", () => {
      it("should match 'I will' statements", () => {
        expect(STRUCTURAL_PATTERNS.FIRST_PERSON_STATEMENT.test("I will analyze")).toBe(true);
        expect(STRUCTURAL_PATTERNS.FIRST_PERSON_STATEMENT.test("I'll continue")).toBe(true);
      });

      it("should match 'Let me' statements", () => {
        expect(STRUCTURAL_PATTERNS.FIRST_PERSON_STATEMENT.test("Let me analyze")).toBe(true);
        expect(STRUCTURAL_PATTERNS.FIRST_PERSON_STATEMENT.test("Let us proceed")).toBe(true);
      });

      it("should match 'We' statements", () => {
        expect(STRUCTURAL_PATTERNS.FIRST_PERSON_STATEMENT.test("We will continue")).toBe(true);
        expect(STRUCTURAL_PATTERNS.FIRST_PERSON_STATEMENT.test("We can proceed")).toBe(true);
      });

      it("should match 'Now I' statements", () => {
        expect(STRUCTURAL_PATTERNS.FIRST_PERSON_STATEMENT.test("Now I will analyze")).toBe(true);
        expect(STRUCTURAL_PATTERNS.FIRST_PERSON_STATEMENT.test("Here I present")).toBe(true);
      });

      it("should not match non-first-person text", () => {
        expect(STRUCTURAL_PATTERNS.FIRST_PERSON_STATEMENT.test("The code is")).toBe(false);
        expect(STRUCTURAL_PATTERNS.FIRST_PERSON_STATEMENT.test("normal text")).toBe(false);
      });
    });

    describe("DOT_SEPARATED_IDENTIFIER", () => {
      it("should match Java package names", () => {
        expect(STRUCTURAL_PATTERNS.DOT_SEPARATED_IDENTIFIER.test("com.example.MyClass")).toBe(true);
        expect(STRUCTURAL_PATTERNS.DOT_SEPARATED_IDENTIFIER.test("org.apache.commons")).toBe(true);
      });

      it("should match C# namespaces", () => {
        expect(
          STRUCTURAL_PATTERNS.DOT_SEPARATED_IDENTIFIER.test("System.Collections.Generic"),
        ).toBe(true);
      });

      it("should not match single identifiers", () => {
        expect(STRUCTURAL_PATTERNS.DOT_SEPARATED_IDENTIFIER.test("MyClass")).toBe(false);
      });

      it("should not match identifiers starting with numbers", () => {
        expect(STRUCTURAL_PATTERNS.DOT_SEPARATED_IDENTIFIER.test("123.example")).toBe(false);
      });
    });

    describe("CODE_STATEMENT_LINE", () => {
      it("should match Java-style statements", () => {
        expect(STRUCTURAL_PATTERNS.CODE_STATEMENT_LINE.test("import java.util.List;")).toBe(true);
        expect(STRUCTURAL_PATTERNS.CODE_STATEMENT_LINE.test("package com.example;")).toBe(true);
      });

      it("should match C#-style using statements", () => {
        expect(STRUCTURAL_PATTERNS.CODE_STATEMENT_LINE.test("using System.Collections;")).toBe(
          true,
        );
      });

      it("should not match text without semicolon", () => {
        expect(STRUCTURAL_PATTERNS.CODE_STATEMENT_LINE.test("some text")).toBe(false);
      });
    });
  });
});
