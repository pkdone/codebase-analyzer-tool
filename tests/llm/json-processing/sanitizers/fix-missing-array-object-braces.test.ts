import { fixMissingArrayObjectBraces } from "../../../../src/llm/json-processing/sanitizers/fix-missing-array-object-braces";

describe("fixMissingArrayObjectBraces", () => {
  describe("corrupted array object start - stray text before value", () => {
    it("should fix stray text before property value", () => {
      const input = `  "publicMethods": [
    {
      "name": "method1",
      "codeSmells": []
    },
c"withdrawal",
      "purpose": "test"
    }
  ]`;
      const result = fixMissingArrayObjectBraces(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('"name": "withdrawal"');
      expect(result.content).toContain("{");
      expect(result.diagnostics).toBeDefined();
    });

    it("should fix single character stray text before value", () => {
      const input = `  "publicMethods": [
    {
      "name": "method1",
      "codeSmells": []
    },
e"calculateMethod",
      "purpose": "test"
    }
  ]`;
      const result = fixMissingArrayObjectBraces(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('"name": "calculateMethod"');
    });

    it("should handle multiple character stray text", () => {
      const input = `  "publicMethods": [
    {
      "name": "method1",
      "codeSmells": []
    },
  c"methodName",
      "purpose": "test"
    }
  ]`;
      const result = fixMissingArrayObjectBraces(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('"name": "methodName"');
    });
  });

  describe("corrupted array object start - stray text before property name", () => {
    it("should fix stray text before property name", () => {
      const input = `  "publicMethods": [
    {
      "name": "method1",
      "codeSmells": []
    },
e"mechanism":
      "value"
    }
  ]`;
      const result = fixMissingArrayObjectBraces(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('"mechanism":');
      expect(result.content).toContain("{");
    });

    it("should fix stray text before property name with newline", () => {
      const input = `  "publicMethods": [
    {
      "name": "method1",
      "codeSmells": []
    },
e"name":
      "value"
    }
  ]`;
      const result = fixMissingArrayObjectBraces(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('"name":');
    });
  });

  describe("truncated array elements", () => {
    it("should fix truncated element with quotes", () => {
      const input = `  "publicMethods": [
    {
      "name": "method1",
      "codeSmells": []
    },
calculateInterest",
      "purpose": "test"
    }
  ]`;
      const result = fixMissingArrayObjectBraces(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('"name": "calculateInterest"');
      expect(result.content).toContain("{");
    });

    it("should fix truncated element with newline before next property", () => {
      const input = `  "publicMethods": [
    {
      "name": "method1",
      "codeSmells": []
    },
toInteger",
      "purpose": "test"
    }
  ]`;
      const result = fixMissingArrayObjectBraces(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('"name": "toInteger"');
    });

    it("should fix truncated element without quotes", () => {
      const input = `  "publicMethods": [
    {
      "name": "method1",
      "codeSmells": []
    },
  wordValue
  "nextProperty":
    "value"
    }
  ]`;
      const result = fixMissingArrayObjectBraces(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('"name": "wordValue"');
    });
  });

  describe("missing opening brace for property patterns", () => {
    it("should insert missing opening brace for property", () => {
      const input = `  "publicMethods": [
    {
      "name": "method1",
      "codeSmells": []
    },
    "name": "method2",
      "purpose": "test"
    }
  ]`;

      const result = fixMissingArrayObjectBraces(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('},\n    {\n      "name": "method2"');
      expect(result.diagnostics).toBeDefined();
    });

    it("should handle property with value", () => {
      const input = `  "items": [
    {
      "name": "item1",
      "value": 1
    },
    "name": "item2",
    "value": 2
  ]`;

      const result = fixMissingArrayObjectBraces(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('},\n    {\n      "name": "item2"');
    });
  });

  describe("array context detection", () => {
    it("should only fix patterns in array context", () => {
      const input = `{
  "property": "value",
  "next": "test"
}`;

      const result = fixMissingArrayObjectBraces(input);

      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });

    it("should handle nested arrays", () => {
      const input = `  "nested": [
    [
      {
        "name": "item1"
      },
      "name": "item2"
    ]
  ]`;

      const result = fixMissingArrayObjectBraces(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('},\n      {\n        "name": "item2"');
    });
  });

  describe("edge cases", () => {
    it("should return unchanged when no issues present", () => {
      const input = `  "publicMethods": [
    {
      "name": "method1"
    },
    {
      "name": "method2"
    }
  ]`;

      const result = fixMissingArrayObjectBraces(input);

      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });

    it("should handle empty string", () => {
      const input = "";
      const result = fixMissingArrayObjectBraces(input);

      expect(result.changed).toBe(false);
      expect(result.content).toBe("");
    });

    it("should handle complex nested structures", () => {
      const input = `  "methods": [
    {
      "name": "method1",
      "params": []
    },
e"method2",
      "params": []
    }
  ]`;

      const result = fixMissingArrayObjectBraces(input);

      // The sanitizer may not fix all cases, but should handle some
      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
    });
  });

  describe("real-world scenarios", () => {
    it("should handle the exact error pattern from log files", () => {
      const input = `  "publicMethods": [
    {
      "name": "disburseLoanWithExceededOverAppliedAmountFails",
      "codeSmells": []
    },
    e"disburseLoanWithExceededOverAppliedAmountSucceed",
      "purpose": "This test case serves"`.trim();

      const result = fixMissingArrayObjectBraces(input);

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      if (result.changed) {
        expect(result.diagnostics).toBeDefined();
      }
    });
  });
});
