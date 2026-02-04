import {
  isJsonKeyword,
  looksLikeStrayText,
  looksLikeStrayArrayPrefix,
  looksLikeStrayPropertyPrefix,
  looksLikeDescriptiveText,
  looksLikeFirstPersonStatement,
  looksLikeTruncationMarker,
  looksLikeSentenceStructure,
  looksLikeConversationalFiller,
} from "../../../../../src/common/llm/json-processing/utils/stray-text-detection";

describe("stray-text-detection", () => {
  describe("isJsonKeyword", () => {
    it("should return true for JSON keywords", () => {
      expect(isJsonKeyword("true")).toBe(true);
      expect(isJsonKeyword("false")).toBe(true);
      expect(isJsonKeyword("null")).toBe(true);
      expect(isJsonKeyword("undefined")).toBe(true);
    });

    it("should be case-insensitive", () => {
      expect(isJsonKeyword("TRUE")).toBe(true);
      expect(isJsonKeyword("False")).toBe(true);
      expect(isJsonKeyword("NULL")).toBe(true);
    });

    it("should return false for non-keywords", () => {
      expect(isJsonKeyword("hello")).toBe(false);
      expect(isJsonKeyword("value")).toBe(false);
      expect(isJsonKeyword("123")).toBe(false);
    });
  });

  describe("looksLikeStrayText", () => {
    it("should return false for empty text", () => {
      expect(looksLikeStrayText("")).toBe(false);
      expect(looksLikeStrayText("   ")).toBe(false);
    });

    it("should return false for JSON keywords", () => {
      expect(looksLikeStrayText("true")).toBe(false);
      expect(looksLikeStrayText("false")).toBe(false);
      expect(looksLikeStrayText("null")).toBe(false);
    });

    it("should return true for single characters", () => {
      expect(looksLikeStrayText("a")).toBe(true);
      expect(looksLikeStrayText("x")).toBe(true);
      expect(looksLikeStrayText("Z")).toBe(true);
    });

    it("should return true for short lowercase words", () => {
      expect(looksLikeStrayText("stray")).toBe(true);
      expect(looksLikeStrayText("hello")).toBe(true);
      expect(looksLikeStrayText("word")).toBe(true);
    });

    it("should detect sentence fragments when enabled", () => {
      const options = { detectSentences: true };
      expect(looksLikeStrayText("this is some text", options)).toBe(true);
      expect(looksLikeStrayText("running on machine", options)).toBe(true);
    });

    it("should detect YAML patterns when enabled", () => {
      const options = { detectYamlPatterns: true };
      expect(looksLikeStrayText("key: value", options)).toBe(true);
      expect(looksLikeStrayText("extra_text: something", options)).toBe(true);
    });

    it("should detect assignment patterns when enabled", () => {
      const options = { detectAssignmentPatterns: true };
      expect(looksLikeStrayText("var=value", options)).toBe(true);
      expect(looksLikeStrayText("config = 123", options)).toBe(true);
    });

    it("should respect maxLength option", () => {
      expect(looksLikeStrayText("verylongwordhere", { maxLength: 10 })).toBe(false);
      expect(looksLikeStrayText("shortword", { maxLength: 10 })).toBe(true);
    });

    it("should respect minLength option", () => {
      expect(looksLikeStrayText("ab", { minLength: 3 })).toBe(false);
      expect(looksLikeStrayText("abc", { minLength: 3 })).toBe(true);
    });

    describe("regex caching behavior", () => {
      it("should produce consistent results with same options across multiple calls", () => {
        const options = { minLength: 2, maxLength: 10 };
        // Multiple calls with same options should use cached pattern
        expect(looksLikeStrayText("hello", options)).toBe(true);
        expect(looksLikeStrayText("world", options)).toBe(true);
        expect(looksLikeStrayText("test", options)).toBe(true);
        expect(looksLikeStrayText("x", options)).toBe(true); // Single char detected by single char check
        expect(looksLikeStrayText("true", options)).toBe(false); // JSON keyword
      });

      it("should produce correct results with different option combinations", () => {
        // Different min/max combinations should create different cached patterns
        expect(looksLikeStrayText("ab", { minLength: 1, maxLength: 5 })).toBe(true);
        expect(looksLikeStrayText("ab", { minLength: 3, maxLength: 5 })).toBe(false);
        expect(looksLikeStrayText("abcdefghij", { minLength: 1, maxLength: 8 })).toBe(false);
        expect(looksLikeStrayText("abcdefghij", { minLength: 1, maxLength: 12 })).toBe(true);
      });

      it("should handle default options consistently", () => {
        // Default options (minLength: 1, maxLength: 15)
        // Calling repeatedly with defaults should use cached pattern
        for (let i = 0; i < 5; i++) {
          expect(looksLikeStrayText("stray")).toBe(true);
          expect(looksLikeStrayText("true")).toBe(false);
          expect(looksLikeStrayText("verylongwordthatexceedslimit")).toBe(false);
        }
      });

      it("should handle words at boundary lengths correctly", () => {
        // Test boundary conditions for the length pattern
        const options = { minLength: 3, maxLength: 6 };
        expect(looksLikeStrayText("ab", options)).toBe(false); // too short (2 chars)
        expect(looksLikeStrayText("abc", options)).toBe(true); // min length (3 chars)
        expect(looksLikeStrayText("abcdef", options)).toBe(true); // max length (6 chars)
        expect(looksLikeStrayText("abcdefg", options)).toBe(false); // too long (7 chars)
      });
    });
  });

  describe("looksLikeStrayArrayPrefix", () => {
    it("should return false for JSON keywords", () => {
      expect(looksLikeStrayArrayPrefix("true")).toBe(false);
      expect(looksLikeStrayArrayPrefix("false")).toBe(false);
      expect(looksLikeStrayArrayPrefix("null")).toBe(false);
    });

    it("should return true for short lowercase words", () => {
      expect(looksLikeStrayArrayPrefix("a")).toBe(true);
      expect(looksLikeStrayArrayPrefix("from")).toBe(true);
      expect(looksLikeStrayArrayPrefix("import")).toBe(true);
    });

    it("should return false for words longer than 7 chars", () => {
      expect(looksLikeStrayArrayPrefix("something")).toBe(false);
      expect(looksLikeStrayArrayPrefix("longword")).toBe(false);
    });

    it("should return false for mixed case words", () => {
      expect(looksLikeStrayArrayPrefix("Hello")).toBe(false);
      expect(looksLikeStrayArrayPrefix("UPPER")).toBe(false);
    });
  });

  describe("looksLikeStrayPropertyPrefix", () => {
    it("should return false for JSON keywords", () => {
      expect(looksLikeStrayPropertyPrefix("true")).toBe(false);
      expect(looksLikeStrayPropertyPrefix("false")).toBe(false);
    });

    it("should return true for short lowercase words (2-10 chars)", () => {
      expect(looksLikeStrayPropertyPrefix("ab")).toBe(true);
      expect(looksLikeStrayPropertyPrefix("stray")).toBe(true);
      expect(looksLikeStrayPropertyPrefix("commentary")).toBe(true);
    });

    it("should return false for single character", () => {
      expect(looksLikeStrayPropertyPrefix("a")).toBe(false);
    });

    it("should return false for words longer than 10 chars", () => {
      expect(looksLikeStrayPropertyPrefix("verylongword")).toBe(false);
    });
  });

  describe("looksLikeDescriptiveText", () => {
    it("should return false for text with JSON structural characters", () => {
      expect(looksLikeDescriptiveText('{"key": "value"}')).toBe(false);
      expect(looksLikeDescriptiveText("array: []")).toBe(false);
    });

    it("should return true for text with 3+ words", () => {
      expect(looksLikeDescriptiveText("this is commentary")).toBe(true);
      expect(looksLikeDescriptiveText("some longer sentence here")).toBe(true);
    });

    it("should return true for single words with punctuation", () => {
      expect(looksLikeDescriptiveText("tribulations.")).toBe(true);
      expect(looksLikeDescriptiveText("hello!")).toBe(true);
      expect(looksLikeDescriptiveText("what?")).toBe(true);
    });

    it("should return true for prose-like text", () => {
      expect(looksLikeDescriptiveText("this is a longer piece of text")).toBe(true);
    });

    it("should return false for short text without punctuation", () => {
      expect(looksLikeDescriptiveText("ab")).toBe(false);
    });
  });

  describe("looksLikeFirstPersonStatement", () => {
    it("should return false for empty text", () => {
      expect(looksLikeFirstPersonStatement("")).toBe(false);
      expect(looksLikeFirstPersonStatement("   ")).toBe(false);
    });

    it("should return false for text with JSON structural characters", () => {
      expect(looksLikeFirstPersonStatement('I will {"key": "value"}')).toBe(false);
    });

    it("should detect 'I will' statements", () => {
      expect(looksLikeFirstPersonStatement("I will analyze this")).toBe(true);
      expect(looksLikeFirstPersonStatement("I will continue")).toBe(true);
    });

    it("should detect 'I shall' statements", () => {
      expect(looksLikeFirstPersonStatement("I shall proceed")).toBe(true);
    });

    it("should detect 'Let me' statements", () => {
      expect(looksLikeFirstPersonStatement("Let me analyze")).toBe(true);
      expect(looksLikeFirstPersonStatement("Let me continue")).toBe(true);
    });

    it("should detect 'Let us' statements", () => {
      expect(looksLikeFirstPersonStatement("Let us proceed")).toBe(true);
    });

    it("should detect 'We' statements", () => {
      expect(looksLikeFirstPersonStatement("We will continue")).toBe(true);
      expect(looksLikeFirstPersonStatement("We can proceed")).toBe(true);
    });

    it("should detect 'Now I/we' statements", () => {
      expect(looksLikeFirstPersonStatement("Now I will analyze")).toBe(true);
      expect(looksLikeFirstPersonStatement("Now we proceed")).toBe(true);
    });

    it("should detect 'Here I/we' statements", () => {
      expect(looksLikeFirstPersonStatement("Here I present")).toBe(true);
      expect(looksLikeFirstPersonStatement("Here we go")).toBe(true);
    });

    it("should detect 'Moving on' statements", () => {
      expect(looksLikeFirstPersonStatement("Moving on to next")).toBe(true);
    });

    it("should detect 'Next, I' statements", () => {
      expect(looksLikeFirstPersonStatement("Next, I will analyze")).toBe(true);
      expect(looksLikeFirstPersonStatement("Next I continue")).toBe(true);
    });

    it("should not detect non-first-person text", () => {
      expect(looksLikeFirstPersonStatement("The code is")).toBe(false);
      expect(looksLikeFirstPersonStatement("normal text")).toBe(false);
      expect(looksLikeFirstPersonStatement("they will")).toBe(false);
    });
  });

  describe("looksLikeTruncationMarker", () => {
    it("should return false for empty text", () => {
      expect(looksLikeTruncationMarker("")).toBe(false);
      expect(looksLikeTruncationMarker("   ")).toBe(false);
    });

    it("should detect ellipsis", () => {
      expect(looksLikeTruncationMarker("some text...")).toBe(true);
      expect(looksLikeTruncationMarker("...")).toBe(true);
      expect(looksLikeTruncationMarker("text....")).toBe(true);
    });

    it("should detect (truncated) marker", () => {
      expect(looksLikeTruncationMarker("(truncated)")).toBe(true);
      expect(looksLikeTruncationMarker("data (truncated)")).toBe(true);
    });

    it("should detect [truncated] marker", () => {
      expect(looksLikeTruncationMarker("[truncated]")).toBe(true);
      expect(looksLikeTruncationMarker("data [truncated]")).toBe(true);
    });

    it("should detect (continued) and [continued] markers", () => {
      expect(looksLikeTruncationMarker("(continued)")).toBe(true);
      expect(looksLikeTruncationMarker("[continued]")).toBe(true);
    });

    it("should detect (more) and [more] markers", () => {
      expect(looksLikeTruncationMarker("(more)")).toBe(true);
      expect(looksLikeTruncationMarker("[more]")).toBe(true);
    });

    it("should detect etc. marker", () => {
      expect(looksLikeTruncationMarker("etc.")).toBe(true);
      expect(looksLikeTruncationMarker("and more etc")).toBe(true);
    });

    it("should detect 'for brevity' phrase", () => {
      expect(looksLikeTruncationMarker("for brevity")).toBe(true);
      expect(looksLikeTruncationMarker("omitted for brevity")).toBe(true);
    });

    it("should detect 'stop here' phrase", () => {
      expect(looksLikeTruncationMarker("I will stop here")).toBe(true);
      expect(looksLikeTruncationMarker("stopping here")).toBe(true);
    });

    it("should not detect normal text", () => {
      expect(looksLikeTruncationMarker("normal text")).toBe(false);
      expect(looksLikeTruncationMarker("some value")).toBe(false);
    });
  });

  describe("looksLikeSentenceStructure", () => {
    it("should return false for short text", () => {
      expect(looksLikeSentenceStructure("ab")).toBe(false);
      expect(looksLikeSentenceStructure("word")).toBe(false);
    });

    it("should return false for text with JSON structural characters", () => {
      expect(looksLikeSentenceStructure('{"key": "value"}')).toBe(false);
      expect(looksLikeSentenceStructure("array: []")).toBe(false);
    });

    it("should return true for text with 3+ words", () => {
      expect(looksLikeSentenceStructure("this is a sentence")).toBe(true);
      expect(looksLikeSentenceStructure("some longer sentence here")).toBe(true);
    });

    it("should return true for two words with punctuation", () => {
      expect(looksLikeSentenceStructure("hello world.")).toBe(true);
      expect(looksLikeSentenceStructure("something else!")).toBe(true);
      expect(looksLikeSentenceStructure("is this?")).toBe(true);
    });

    it("should check alphabetic content ratio", () => {
      // Mostly alphabetic content
      expect(looksLikeSentenceStructure("this is text")).toBe(true);
      // Pure numbers - should fail
      expect(looksLikeSentenceStructure("123 456 789")).toBe(false);
    });
  });

  describe("looksLikeConversationalFiller", () => {
    it("should return false for empty text", () => {
      expect(looksLikeConversationalFiller("")).toBe(false);
      expect(looksLikeConversationalFiller("   ")).toBe(false);
    });

    it("should return false for text with JSON structural characters", () => {
      expect(looksLikeConversationalFiller('Note that {"key": "value"}')).toBe(false);
      expect(looksLikeConversationalFiller("Also, the array []")).toBe(false);
    });

    it("should return false for text without spaces (identifiers)", () => {
      expect(looksLikeConversationalFiller("MyEnumValue")).toBe(false);
      expect(looksLikeConversationalFiller("SomeIdentifier")).toBe(false);
    });

    it("should return false for short text (<=10 chars)", () => {
      expect(looksLikeConversationalFiller("Note this")).toBe(false); // 9 chars
      expect(looksLikeConversationalFiller("Also this")).toBe(false); // 9 chars
      expect(looksLikeConversationalFiller("OK value")).toBe(false); // 8 chars
    });

    it("should return false for JSON keywords", () => {
      expect(looksLikeConversationalFiller("true")).toBe(false);
      expect(looksLikeConversationalFiller("false")).toBe(false);
      expect(looksLikeConversationalFiller("null")).toBe(false);
    });

    it("should detect 'Note that' patterns", () => {
      expect(looksLikeConversationalFiller("Note that this is important")).toBe(true);
      expect(looksLikeConversationalFiller("Note, this should be considered")).toBe(true);
    });

    it("should detect 'Also' patterns", () => {
      expect(looksLikeConversationalFiller("Also, we should consider this")).toBe(true);
      expect(looksLikeConversationalFiller("Also note that this applies")).toBe(true);
    });

    it("should detect 'However' patterns", () => {
      expect(looksLikeConversationalFiller("However the implementation differs")).toBe(true);
      expect(looksLikeConversationalFiller("However, this is not valid")).toBe(true);
    });

    it("should detect 'Additionally' patterns", () => {
      expect(looksLikeConversationalFiller("Additionally, this should work")).toBe(true);
      expect(looksLikeConversationalFiller("Additionally the code handles")).toBe(true);
    });

    it("should detect 'Furthermore' patterns", () => {
      expect(looksLikeConversationalFiller("Furthermore, we need to check")).toBe(true);
      expect(looksLikeConversationalFiller("Furthermore the tests pass")).toBe(true);
    });

    it("should detect 'Moreover' patterns", () => {
      expect(looksLikeConversationalFiller("Moreover, this is correct")).toBe(true);
      expect(looksLikeConversationalFiller("Moreover the system supports")).toBe(true);
    });

    it("should detect 'Therefore' patterns", () => {
      expect(looksLikeConversationalFiller("Therefore, we conclude that")).toBe(true);
      expect(looksLikeConversationalFiller("Therefore the result is valid")).toBe(true);
    });

    it("should detect transitional phrases with enough words", () => {
      expect(looksLikeConversationalFiller("Consequently, the output changes")).toBe(true);
      expect(looksLikeConversationalFiller("Finally, the process completes")).toBe(true);
    });

    it("should not detect valid data that happens to start with capital letter", () => {
      // Single identifier words should not match
      expect(looksLikeConversationalFiller("MyClassName")).toBe(false);
      // Two words without being filler-like
      expect(looksLikeConversationalFiller("Simple type")).toBe(false); // too short (11 chars but no 3+ words)
    });

    it("should handle mixed case appropriately", () => {
      // Lowercase starting words shouldn't match the capitalized pattern
      expect(looksLikeConversationalFiller("however this is text")).toBe(false);
      // But 3+ words would be caught by the word count check
      expect(looksLikeConversationalFiller("However, this is definitely filler text")).toBe(true);
    });

    it("should detect various conversational openers", () => {
      expect(looksLikeConversationalFiller("Basically, the function returns")).toBe(true);
      expect(looksLikeConversationalFiller("Essentially, this means that")).toBe(true);
      expect(looksLikeConversationalFiller("Obviously, the result is correct")).toBe(true);
    });
  });
});
