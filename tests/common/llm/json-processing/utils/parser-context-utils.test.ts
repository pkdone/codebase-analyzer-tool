import {
  isInStringAt,
  isInArrayContext,
  isDirectlyInArrayContext,
  isAfterJsonDelimiter,
  isInPropertyContext,
  isInArrayContextSimple,
  isDeepArrayContext,
} from "../../../../../src/common/llm/json-processing/utils/parser-context-utils";
import type { ContextInfo } from "../../../../../src/common/llm/json-processing/sanitizers/rules/replacement-rule.types";

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
});
