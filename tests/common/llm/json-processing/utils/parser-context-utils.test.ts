import {
  isInStringAt,
  isInArrayContext,
  isDirectlyInArrayContext,
  isAfterJsonDelimiter,
  isInPropertyContext,
  isInArrayContextSimple,
  isDeepArrayContext,
  findJsonValueEnd,
  createStringBoundaryChecker,
} from "../../../../../src/common/llm/json-processing/utils/parser-context-utils";
import type { ContextInfo } from "../../../../../src/common/llm/types/sanitizer-config.types";

/**
 * Helper function to create a ContextInfo object for testing.
 */
function createContext(content: string, offset: number, lookbackLength = 500): ContextInfo {
  return {
    beforeMatch: content.substring(Math.max(0, offset - lookbackLength), offset),
    offset,
    fullContent: content,
    groups: [],
  };
}

describe("parser-context-utils", () => {
  describe("isInStringAt", () => {
    it("should return false for position before any string", () => {
      const content = '{"key": "value"}';
      expect(isInStringAt(0, content)).toBe(false);
      expect(isInStringAt(1, content)).toBe(false);
    });

    it("should return true when inside a string", () => {
      const content = '{"key": "value"}';
      // Position 9 is inside "value" (after the opening quote at position 8)
      expect(isInStringAt(9, content)).toBe(true);
    });

    it("should return false when outside a string", () => {
      const content = '{"key": "value"}';
      // Position 15 is after the closing quote
      expect(isInStringAt(15, content)).toBe(false);
    });

    it("should handle escaped quotes correctly", () => {
      const content = '{"key": "value with \\"quote\\""}';
      // Position inside the escaped quote should still be in string
      const quotePos = content.indexOf('\\"');
      expect(isInStringAt(quotePos + 1, content)).toBe(true);
    });

    it("should handle multiple strings", () => {
      const content = '{"key1": "value1", "key2": "value2"}';
      expect(isInStringAt(11, content)).toBe(true); // Inside "value1"
      expect(isInStringAt(31, content)).toBe(true); // Inside "value2"
      expect(isInStringAt(17, content)).toBe(false); // Between strings (at the comma after value1)
    });
  });

  describe("isInArrayContext", () => {
    it("should return true when inside an array", () => {
      const content = '[{"key": "value"}]';
      // Position after the opening brace should be in array context
      expect(isInArrayContext(2, content)).toBe(true);
    });

    it("should return false when outside an array", () => {
      const content = '{"key": "value"}';
      expect(isInArrayContext(5, content)).toBe(false);
    });

    it("should return true for nested arrays", () => {
      const content = '[[{"key": "value"}]]';
      expect(isInArrayContext(3, content)).toBe(true);
    });

    it("should return false when inside an object but not an array", () => {
      const content = '{"items": [{"key": "value"}]}';
      // Position at the start of the outer object
      expect(isInArrayContext(1, content)).toBe(false);
      // Position inside the array
      expect(isInArrayContext(12, content)).toBe(true);
    });

    it("should handle arrays with strings", () => {
      const content = '["item1", "item2"]';
      // Position 10 is after "item1", inside the array
      expect(isInArrayContext(10, content)).toBe(true);
    });

    it("should return false for empty content", () => {
      expect(isInArrayContext(0, "")).toBe(false);
    });
  });

  describe("isDirectlyInArrayContext", () => {
    it("should return true when directly inside an array", () => {
      const content = '["value1", "value2"]';
      // Position 1 is directly inside the array (after opening bracket)
      expect(isDirectlyInArrayContext(1, content)).toBe(true);
    });

    it("should return false when inside an object within an array", () => {
      const content = '[{"key": "value"}]';
      // Position 3 is inside the object, not directly in the array
      expect(isDirectlyInArrayContext(3, content)).toBe(false);
    });

    it("should return false when not inside any array", () => {
      const content = '{"key": "value"}';
      expect(isDirectlyInArrayContext(5, content)).toBe(false);
    });

    it("should return true for position between array elements", () => {
      const content = '["item1", "item2", "item3"]';
      // Position 8 is at the comma between "item1" and "item2", directly inside array
      expect(isDirectlyInArrayContext(8, content)).toBe(true);
      // Position 9 is at the space after comma, still directly inside array
      expect(isDirectlyInArrayContext(9, content)).toBe(true);
    });

    it("should return false for nested object in array", () => {
      const content = '[{"name": "test", "value": 123}]';
      // Position 12 is inside the object at the "t" of "test"
      expect(isDirectlyInArrayContext(12, content)).toBe(false);
    });

    it("should handle nested arrays correctly", () => {
      const content = '[["nested"]]';
      // Position 2 is inside the inner array directly
      expect(isDirectlyInArrayContext(2, content)).toBe(true);
    });

    it("should return false when inside a nested object within nested arrays", () => {
      const content = '[[{"key": "value"}]]';
      // Position 5 is inside the object
      expect(isDirectlyInArrayContext(5, content)).toBe(false);
    });

    it("should handle mixed array content", () => {
      const content = '["string", {"obj": true}, [1, 2]]';
      // Position after "string", still directly in array
      expect(isDirectlyInArrayContext(10, content)).toBe(true);
    });

    it("should return false for empty content", () => {
      expect(isDirectlyInArrayContext(0, "")).toBe(false);
    });

    it("should handle empty array", () => {
      const content = "[]";
      // Position 1 is directly inside the empty array
      expect(isDirectlyInArrayContext(1, content)).toBe(true);
    });
  });

  // ============================================================================
  // ContextInfo-based function tests
  // ============================================================================

  describe("isAfterJsonDelimiter", () => {
    it("should return true after closing brace", () => {
      const content = '{"key": "value"} ';
      const context = createContext(content, content.length);
      expect(isAfterJsonDelimiter(context)).toBe(true);
    });

    it("should return true after closing bracket", () => {
      const content = '["item1", "item2"] ';
      const context = createContext(content, content.length);
      expect(isAfterJsonDelimiter(context)).toBe(true);
    });

    it("should return true after comma", () => {
      const content = '{"key": "value", ';
      const context = createContext(content, content.length);
      expect(isAfterJsonDelimiter(context)).toBe(true);
    });

    it("should return true at start of file (small offset)", () => {
      const content = '{"key"';
      const context = createContext(content, 2); // Very small offset
      expect(isAfterJsonDelimiter(context)).toBe(true);
    });

    it("should return true for empty beforeMatch (whitespace only)", () => {
      const context: ContextInfo = {
        beforeMatch: "   ",
        offset: 100,
        fullContent: '   {"key": "value"}',
        groups: [],
      };
      expect(isAfterJsonDelimiter(context)).toBe(true);
    });

    it("should return false after a colon and text (in value context)", () => {
      // This tests a position after ': "value' where we're clearly in a value
      const content = '{"key": "value", "next": ';
      // Position right after the colon - beforeMatch ends with ': '
      const context: ContextInfo = {
        beforeMatch: '"key": ',
        offset: 100, // Not at start of file
        fullContent: content,
        groups: [],
      };
      expect(isAfterJsonDelimiter(context)).toBe(false);
    });
  });

  describe("isInPropertyContext", () => {
    it("should return true after opening brace", () => {
      const content = "{ ";
      const context = createContext(content, content.length);
      expect(isInPropertyContext(context)).toBe(true);
    });

    it("should return true after comma", () => {
      const content = '{"key": "value", ';
      const context = createContext(content, content.length);
      expect(isInPropertyContext(context)).toBe(true);
    });

    it("should return true after newline", () => {
      const content = "{\n  ";
      const context = createContext(content, content.length);
      expect(isInPropertyContext(context)).toBe(true);
    });

    it("should return true at start of file (small offset)", () => {
      const content = '{"ke';
      const context = createContext(content, 2);
      expect(isInPropertyContext(context)).toBe(true);
    });

    it("should return false when beforeMatch does not match property context patterns", () => {
      // This tests a position where beforeMatch doesn't match any property context pattern
      // (not after {, comma, }, ], newline, or near start of file)
      const context: ContextInfo = {
        beforeMatch: '"value"', // Just a value string, no structural delimiters
        offset: 500, // Far from start of file to avoid offset check
        fullContent: '{"key": "value"}',
        groups: [],
      };
      expect(isInPropertyContext(context)).toBe(false);
    });
  });

  describe("isInArrayContextSimple", () => {
    it("should return true after opening bracket", () => {
      const content = "[ ";
      const context = createContext(content, content.length);
      expect(isInArrayContextSimple(context)).toBe(true);
    });

    it("should return true after comma and newline", () => {
      const content = '[\n  "item1",\n  ';
      const context = createContext(content, content.length);
      expect(isInArrayContextSimple(context)).toBe(true);
    });

    it("should return true after string and comma with newline", () => {
      const content = '["item1",\n  ';
      const context = createContext(content, content.length);
      expect(isInArrayContextSimple(context)).toBe(true);
    });

    it("should return false inside an object", () => {
      const content = '{"key": ';
      const context = createContext(content, content.length);
      expect(isInArrayContextSimple(context)).toBe(false);
    });

    it("should return false for empty beforeMatch", () => {
      const context: ContextInfo = {
        beforeMatch: "",
        offset: 0,
        fullContent: '["item"]',
        groups: [],
      };
      expect(isInArrayContextSimple(context)).toBe(false);
    });
  });

  describe("isDeepArrayContext", () => {
    it("should return true when simple check passes", () => {
      const content = "[ ";
      const context = createContext(content, content.length);
      expect(isDeepArrayContext(context)).toBe(true);
    });

    it("should return true using deep scan when simple check fails", () => {
      // This tests the fallback to isDirectlyInArrayContext
      const content = '["item1", "item2"';
      // Position at the end, where simple check might fail but deep scan succeeds
      const context = createContext(content, content.length);
      expect(isDeepArrayContext(context)).toBe(true);
    });

    it("should return false when not in any array context", () => {
      const content = '{"key": "value"';
      const context = createContext(content, content.length);
      expect(isDeepArrayContext(context)).toBe(false);
    });

    it("should return false when inside an object within an array", () => {
      const content = '[{"key": ';
      const context = createContext(content, content.length);
      // The simple check should fail (no array delimiter right before)
      // The deep scan should also fail (we're inside an object)
      expect(isDeepArrayContext(context)).toBe(false);
    });

    it("should return true when directly in nested array", () => {
      const content = "[[ ";
      const context = createContext(content, content.length);
      expect(isDeepArrayContext(context)).toBe(true);
    });
  });

  // ============================================================================
  // JSON Value Parsing Utility Tests
  // ============================================================================

  describe("findJsonValueEnd", () => {
    describe("object values", () => {
      it("should find end of simple object", () => {
        const content = '{"key": "value"}';
        const result = findJsonValueEnd(content, 0);
        expect(result.success).toBe(true);
        expect(result.endPosition).toBe(content.length);
      });

      it("should find end of nested object", () => {
        const content = '{"outer": {"inner": "value"}}';
        const result = findJsonValueEnd(content, 0);
        expect(result.success).toBe(true);
        expect(result.endPosition).toBe(content.length);
      });

      it("should find end of object with strings containing braces", () => {
        const content = '{"key": "value with { and } braces"}';
        const result = findJsonValueEnd(content, 0);
        expect(result.success).toBe(true);
        expect(result.endPosition).toBe(content.length);
      });

      it("should find end of object with escaped quotes in strings", () => {
        const content = '{"key": "value with \\"escaped\\" quotes"}';
        const result = findJsonValueEnd(content, 0);
        expect(result.success).toBe(true);
        expect(result.endPosition).toBe(content.length);
      });

      it("should find end of deeply nested object", () => {
        const content = '{"a": {"b": {"c": {"d": "value"}}}}';
        const result = findJsonValueEnd(content, 0);
        expect(result.success).toBe(true);
        expect(result.endPosition).toBe(content.length);
      });

      it("should handle object with arrays inside", () => {
        const content = '{"items": [1, 2, 3], "name": "test"}';
        const result = findJsonValueEnd(content, 0);
        expect(result.success).toBe(true);
        expect(result.endPosition).toBe(content.length);
      });

      it("should return failure for unclosed object", () => {
        const content = '{"key": "value"';
        const result = findJsonValueEnd(content, 0);
        expect(result.success).toBe(false);
        expect(result.endPosition).toBe(content.length);
      });
    });

    describe("array values", () => {
      it("should find end of simple array", () => {
        const content = '["item1", "item2"]';
        const result = findJsonValueEnd(content, 0);
        expect(result.success).toBe(true);
        expect(result.endPosition).toBe(content.length);
      });

      it("should find end of nested array", () => {
        const content = "[[1, 2], [3, 4]]";
        const result = findJsonValueEnd(content, 0);
        expect(result.success).toBe(true);
        expect(result.endPosition).toBe(content.length);
      });

      it("should find end of array with strings containing brackets", () => {
        const content = '["value with [ and ] brackets"]';
        const result = findJsonValueEnd(content, 0);
        expect(result.success).toBe(true);
        expect(result.endPosition).toBe(content.length);
      });

      it("should find end of array with objects inside", () => {
        const content = '[{"a": 1}, {"b": 2}]';
        const result = findJsonValueEnd(content, 0);
        expect(result.success).toBe(true);
        expect(result.endPosition).toBe(content.length);
      });

      it("should return failure for unclosed array", () => {
        const content = '["item1", "item2"';
        const result = findJsonValueEnd(content, 0);
        expect(result.success).toBe(false);
        expect(result.endPosition).toBe(content.length);
      });
    });

    describe("string values", () => {
      it("should find end of simple string", () => {
        const content = '"hello world"';
        const result = findJsonValueEnd(content, 0);
        expect(result.success).toBe(true);
        expect(result.endPosition).toBe(content.length);
      });

      it("should find end of string with escaped quotes", () => {
        const content = '"hello \\"world\\""';
        const result = findJsonValueEnd(content, 0);
        expect(result.success).toBe(true);
        expect(result.endPosition).toBe(content.length);
      });

      it("should find end of string with escaped backslashes", () => {
        const content = '"path\\\\to\\\\file"';
        const result = findJsonValueEnd(content, 0);
        expect(result.success).toBe(true);
        expect(result.endPosition).toBe(content.length);
      });

      it("should find end of string with unicode escapes", () => {
        const content = '"hello \\u0041\\u0042"';
        const result = findJsonValueEnd(content, 0);
        expect(result.success).toBe(true);
        expect(result.endPosition).toBe(content.length);
      });

      it("should find end of empty string", () => {
        const content = '""';
        const result = findJsonValueEnd(content, 0);
        expect(result.success).toBe(true);
        expect(result.endPosition).toBe(2);
      });

      it("should return failure for unterminated string", () => {
        const content = '"hello world';
        const result = findJsonValueEnd(content, 0);
        expect(result.success).toBe(false);
        expect(result.endPosition).toBe(content.length);
      });
    });

    describe("primitive values", () => {
      it("should find end of number", () => {
        const content = "123, next";
        const result = findJsonValueEnd(content, 0);
        expect(result.success).toBe(true);
        expect(result.endPosition).toBe(3); // Stops at comma
      });

      it("should find end of negative number", () => {
        const content = "-456}";
        const result = findJsonValueEnd(content, 0);
        expect(result.success).toBe(true);
        expect(result.endPosition).toBe(4); // Stops at }
      });

      it("should find end of decimal number", () => {
        const content = "3.14159]";
        const result = findJsonValueEnd(content, 0);
        expect(result.success).toBe(true);
        expect(result.endPosition).toBe(7); // Stops at ]
      });

      it("should find end of boolean true", () => {
        const content = "true, next";
        const result = findJsonValueEnd(content, 0);
        expect(result.success).toBe(true);
        expect(result.endPosition).toBe(4);
      });

      it("should find end of boolean false", () => {
        const content = "false}";
        const result = findJsonValueEnd(content, 0);
        expect(result.success).toBe(true);
        expect(result.endPosition).toBe(5);
      });

      it("should find end of null", () => {
        const content = "null]";
        const result = findJsonValueEnd(content, 0);
        expect(result.success).toBe(true);
        expect(result.endPosition).toBe(4);
      });
    });

    describe("leading whitespace handling", () => {
      it("should skip leading whitespace for object", () => {
        const content = '  {"key": "value"}';
        const result = findJsonValueEnd(content, 0);
        expect(result.success).toBe(true);
        expect(result.endPosition).toBe(content.length);
      });

      it("should skip leading whitespace for array", () => {
        const content = "\n\t[1, 2, 3]";
        const result = findJsonValueEnd(content, 0);
        expect(result.success).toBe(true);
        expect(result.endPosition).toBe(content.length);
      });

      it("should skip leading whitespace for string", () => {
        const content = '   "hello"';
        const result = findJsonValueEnd(content, 0);
        expect(result.success).toBe(true);
        expect(result.endPosition).toBe(content.length);
      });

      it("should skip leading whitespace for primitive", () => {
        const content = "  123, next";
        const result = findJsonValueEnd(content, 0);
        expect(result.success).toBe(true);
        expect(result.endPosition).toBe(5); // Position after "123"
      });
    });

    describe("starting from non-zero position", () => {
      it("should find value starting from middle of content", () => {
        const content = '{"key": "value", "next": "data"}';
        // Start after "next":  (position 25)
        const startPos = content.indexOf('"data"');
        const result = findJsonValueEnd(content, startPos);
        expect(result.success).toBe(true);
        expect(result.endPosition).toBe(content.length - 1); // Ends at closing quote of "data"
      });

      it("should find nested object starting from middle", () => {
        const content = '{"outer": {"inner": "value"}, "other": 123}';
        // Start at the inner object
        const startPos = content.indexOf('{"inner"');
        const result = findJsonValueEnd(content, startPos);
        expect(result.success).toBe(true);
        expect(result.endPosition).toBe(content.indexOf("}") + 1);
      });
    });

    describe("edge cases", () => {
      it("should return failure for empty content", () => {
        const result = findJsonValueEnd("", 0);
        expect(result.success).toBe(false);
        expect(result.endPosition).toBe(0);
      });

      it("should return failure for whitespace-only content", () => {
        const result = findJsonValueEnd("   ", 0);
        expect(result.success).toBe(false);
        expect(result.endPosition).toBe(3);
      });

      it("should return failure when start position is beyond content", () => {
        const content = '{"key": "value"}';
        const result = findJsonValueEnd(content, 100);
        expect(result.success).toBe(false);
        expect(result.endPosition).toBe(100);
      });

      it("should handle complex nested structure", () => {
        const content = '{"data": [{"items": [1, 2, {"nested": true}]}, "string"], "end": null}';
        const result = findJsonValueEnd(content, 0);
        expect(result.success).toBe(true);
        expect(result.endPosition).toBe(content.length);
      });

      it("should handle string with backslash at end", () => {
        const content = '"test\\\\"';
        const result = findJsonValueEnd(content, 0);
        expect(result.success).toBe(true);
        expect(result.endPosition).toBe(content.length);
      });
    });
  });

  // ============================================================================
  // String Boundary Cache Tests
  // ============================================================================

  describe("createStringBoundaryChecker", () => {
    it("should create a working checker function", () => {
      const content = '{"key": "value"}';
      const isInString = createStringBoundaryChecker(content);

      expect(typeof isInString).toBe("function");
      expect(isInString(0)).toBe(false); // Before any string
      expect(isInString(2)).toBe(true); // Inside "key"
      expect(isInString(7)).toBe(false); // Colon and space
      expect(isInString(9)).toBe(true); // Inside "value"
      expect(isInString(15)).toBe(false); // After closing brace
    });

    it("should match isInStringAt behavior", () => {
      const content = '{"key1": "value1", "key2": "value2"}';
      const isInString = createStringBoundaryChecker(content);

      // Test multiple positions and compare with isInStringAt
      for (let i = 0; i < content.length; i++) {
        expect(isInString(i)).toBe(isInStringAt(i, content));
      }
    });

    it("should handle escaped quotes correctly", () => {
      const content = '{"key": "value with \\"quote\\""}';
      const isInString = createStringBoundaryChecker(content);

      // Position inside the escaped quote should still be in string
      const quotePos = content.indexOf('\\"');
      expect(isInString(quotePos + 1)).toBe(true);
    });

    it("should handle empty content", () => {
      const isInString = createStringBoundaryChecker("");
      expect(isInString(0)).toBe(false);
    });
  });
});
