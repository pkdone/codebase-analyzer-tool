import { fixSyntaxErrors } from "../../../../src/llm/json-processing/sanitizers/fix-syntax-errors";

describe("fixSyntaxErrors", () => {
  describe("binary corruption patterns", () => {
    it("should remove <y_bin_XXX> markers", () => {
      const input = `      "cyclomaticComplexity": 1,
      <y_bin_305>OfCode": 1,
      "codeSmells": []`;

      const result = fixSyntaxErrors(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('OfCode": 1');
      expect(result.content).not.toContain("<y_bin_");
      expect(result.diagnostics).toBeDefined();
    });

    it("should not modify binary markers inside string values", () => {
      const input = `      "description": "This contains <y_bin_305>OfCode marker in text"`;

      const result = fixSyntaxErrors(input);

      // Should not change because it's inside a string
      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });
  });

  describe("truncation markers", () => {
    it("should remove truncation markers", () => {
      const input = '{"key": "value",\n...\n}';
      const result = fixSyntaxErrors(input);

      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("...");
      expect(result.diagnostics).toBeDefined();
    });

    it("should handle incomplete strings before closing delimiters", () => {
      const input = '"incomplete string...\n]';
      const result = fixSyntaxErrors(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('"incomplete string"');
    });

    it("should remove _TRUNCATED_ markers", () => {
      const input = '{"key": "value"}\n_TRUNCATED_\n}';
      const result = fixSyntaxErrors(input);

      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("_TRUNCATED_");
    });
  });

  describe("concatenation chains", () => {
    it("should replace identifier-only chains with empty string", () => {
      const input = '{"k": partA + partB + partC}';
      const result = fixSyntaxErrors(input);
      expect(result.changed).toBe(true);
      expect(result.content).toBe('{"k": ""}');
      expect(result.diagnostics).toBeDefined();
      expect(result.diagnostics?.some((d) => d.includes("identifier-only"))).toBe(true);
    });

    it("should keep only literal when identifiers precede it", () => {
      const input = '{"k": someIdent + "literal"}';
      const result = fixSyntaxErrors(input);
      expect(result.changed).toBe(true);
      expect(result.content).toBe('{"k": "literal"}');
      expect(result.diagnostics).toBeDefined();
    });

    it("should merge consecutive string literals", () => {
      const input = '{"message": "Hello" + " " + "World!"}';
      const result = fixSyntaxErrors(input);
      expect(result.changed).toBe(true);
      expect(result.content).toBe('{"message": "Hello World!"}');
      expect(result.diagnostics).toBeDefined();
    });
  });

  describe("property names", () => {
    it("should fix truncated property names with quotes", () => {
      const input = '{"eferences": []}';
      const result = fixSyntaxErrors(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('{"references": []}');
    });

    it("should fix truncated names with missing opening quote", () => {
      const input = '{eferences": []}';
      const result = fixSyntaxErrors(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('{"references": []}');
    });

    it("should merge concatenated string literals in property names", () => {
      const input = '"cyclomati" + "cComplexity": 10';
      const result = fixSyntaxErrors(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('"cyclomaticComplexity": 10');
      expect(result.diagnostics).toBeDefined();
    });
  });

  describe("undefined values", () => {
    it("should convert undefined to null", () => {
      const input = '{"key": undefined}';
      const result = fixSyntaxErrors(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('{"key": null}');
    });
  });

  describe("dangling properties", () => {
    it("should fix dangling properties", () => {
      const input = '{"propertyName "}';
      const result = fixSyntaxErrors(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('"propertyName": null');
      expect(() => JSON.parse(result.content)).not.toThrow();
    });
  });

  describe("missing quotes in arrays", () => {
    it("should fix missing opening quotes in array strings", () => {
      const input = '["item1", item2", "item3"]';
      const result = fixSyntaxErrors(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('"item2"');
      expect(() => JSON.parse(result.content)).not.toThrow();
    });
  });

  describe("stray characters before strings", () => {
    it("should remove stray character 't' before string in array", () => {
      const input = `[
    "org.apache.fineract.portfolio.savings.SavingsCompoundingInterestPeriodType",
t    "org.apache.fineract.portfolio.savings.SavingsInterestCalculationDaysInYearType"
  ]`;

      const result = fixSyntaxErrors(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain(
        '"org.apache.fineract.portfolio.savings.SavingsInterestCalculationDaysInYearType"',
      );
      expect(result.content).not.toContain('t    "org.apache');
      expect(result.diagnostics).toBeDefined();
    });

    it("should remove stray character 'e' before string in object", () => {
      const input = `{
    "internalReferences": [
      "org.apache.fineract.infrastructure.creditbureau.data.CreditBureauData"
    ],
e "externalReferences": []
  }`;

      const result = fixSyntaxErrors(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('"externalReferences"');
      expect(result.content).not.toContain('e "externalReferences"');
      expect(result.diagnostics).toBeDefined();
    });

    it("should not remove characters that are part of valid JSON", () => {
      const input = `{
    "name": "test",
    "value": 123
  }`;

      const result = fixSyntaxErrors(input);

      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });
  });

  describe("truncated property names with inserted quotes", () => {
    it("should fix property name with quote inserted in middle", () => {
      const input = `{
    "cyclomati"cComplexity": 1,
    "linesOfCode": 2
  }`;

      const result = fixSyntaxErrors(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('"cyclomaticComplexity"');
      expect(result.content).not.toContain('"cyclomati"cComplexity"');
      expect(result.diagnostics).toBeDefined();
    });

    it("should handle other truncated property names", () => {
      const input = `{
    "descript"ion": "test"
  }`;

      const result = fixSyntaxErrors(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('"description"');
      expect(result.diagnostics).toBeDefined();
    });
  });

  describe("truncated strings", () => {
    it("should fix truncated string starting with 'axperience'", () => {
      const input = `{
    "externalReferences": [
      "jakarta.persistence.Column",
      "axperience.Table",
      "jakarta.persistence.UniqueConstraint"
    ]
  }`;

      const result = fixSyntaxErrors(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('"jakarta.persistence.Table"');
      expect(result.content).not.toContain('"axperience.Table"');
      expect(result.diagnostics).toBeDefined();
    });

    it("should fix typo 'orgah.apache' to 'org.apache'", () => {
      const input = `{
    "internalReferences": [
      "orgah.apache.fineract.infrastructure.core.serialization.FromJsonHelper"
    ]
  }`;

      const result = fixSyntaxErrors(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain(
        '"org.apache.fineract.infrastructure.core.serialization.FromJsonHelper"',
      );
      expect(result.content).not.toContain('"orgah.apache');
      expect(result.diagnostics).toBeDefined();
    });

    it("should fix missing dot in 'org.apachefineract'", () => {
      const input = `{
    "internalReferences": [
      "org.apachefineract.portfolio.loanaccount.data.LoanChargePaidByData"
    ]
  }`;

      const result = fixSyntaxErrors(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain(
        '"org.apache.fineract.portfolio.loanaccount.data.LoanChargePaidByData"',
      );
      expect(result.content).not.toContain('"org.apachefineract');
      expect(result.diagnostics).toBeDefined();
    });
  });

  describe("stray characters", () => {
    it("should remove stray characters after property values", () => {
      const input = '{"key": "value"extra}';
      const result = fixSyntaxErrors(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('{"key": "value"}');
      expect(() => JSON.parse(result.content)).not.toThrow();
    });
  });

  describe("corrupted property/value pairs", () => {
    it("should fix corrupted property/value pairs", () => {
      const input = '{"name":ICCID": "value"}';
      const result = fixSyntaxErrors(input);

      expect(result.changed).toBe(true);
      expect(() => JSON.parse(result.content)).not.toThrow();
    });
  });

  describe("duplicate entries", () => {
    it("should remove duplicate/corrupted array entries", () => {
      const input = '["valid.entry",\n    extra.persistence.Version",\n    "next"]';
      const result = fixSyntaxErrors(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('"valid.entry"');
      expect(result.content).not.toContain("extra.persistence");
    });
  });

  describe("combined fixes", () => {
    it("should handle multiple syntax errors together", () => {
      const input = '{"eferences": undefined, "key": "value"extra}';
      const result = fixSyntaxErrors(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('"references"');
      expect(result.content).toContain("null");
      expect(result.content).not.toContain("extra");
      expect(() => JSON.parse(result.content)).not.toThrow();
    });
  });

  describe("should not modify content", () => {
    it("should return unchanged for valid JSON", () => {
      const input = '{"key": "value"}';
      const result = fixSyntaxErrors(input);

      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });

    it("should handle empty input", () => {
      const result = fixSyntaxErrors("");
      expect(result.changed).toBe(false);
    });
  });
});
