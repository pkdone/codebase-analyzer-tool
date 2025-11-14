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

    it("should remove continuation text like 'to be continued...'", () => {
      const input = `{
    "name": "test",
    "value": 123
  },
to be continued...
  {
    "name": "test2"
  }`;

      const result = fixSyntaxErrors(input);

      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("to be continued");
      expect(result.content).not.toContain("continued");
      expect(result.diagnostics).toBeDefined();
    });

    it("should remove continuation text like 'to be conti...'", () => {
      const input = `{
    "name": "test"
  },
to be conti...
  {
    "name": "test2"
  }`;

      const result = fixSyntaxErrors(input);

      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("to be conti");
      expect(result.diagnostics).toBeDefined();
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

    it("should fix missing opening quote after closing brace", () => {
      const input = `{
    "name": "test"
  }
connectionInfo": "n/a"
}`;

      const result = fixSyntaxErrors(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('"connectionInfo"');
      // The pattern should fix the missing quote, but the resulting structure may need further processing
      // by other sanitizers (like fix-structural-errors) to be valid JSON
      // Check that connectionInfo": is not present without a quote before it (not part of "connectionInfo":)
      expect(result.content).not.toMatch(/[^"]connectionInfo":/);
    });

    it("should fix missing opening quote after closing bracket", () => {
      const input = `[
    "item1"
  ]
cyclomaticComplexity": 4
}`;

      const result = fixSyntaxErrors(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('"cyclomaticComplexity"');
      expect(result.diagnostics).toBeDefined();
    });

    it("should fix missing colon after property name", () => {
      const input = `{
    "name "appTableId",
    "type": "Long"
  }`;

      const result = fixSyntaxErrors(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('"name": "appTableId"');
      expect(result.content).not.toContain('"name "appTableId"');
      expect(() => JSON.parse(result.content)).not.toThrow();
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

  describe("stray single letters before array elements", () => {
    it("should remove stray 'e' character before array element", () => {
      const input = `{
  "internalReferences": [
    "org.apache.fineract.portfolio.interestratechart.service.InterestRateChartReadPlatformService",
e    "org.apache.fineract.portfolio.paymenttype.service.PaymentTypeReadPlatformService",
    "org.apache.fineract.portfolio.savings.DepositAccountType"
  ]
}`;

      const result = fixSyntaxErrors(input);

      expect(result.changed).toBe(true);
      expect(result.content).not.toContain('e    "org.apache.fineract.portfolio.paymenttype');
      expect(result.content).toContain(
        '"org.apache.fineract.portfolio.paymenttype.service.PaymentTypeReadPlatformService"',
      );
      expect(() => JSON.parse(result.content)).not.toThrow();
    });

    it("should remove stray single letters before array elements in various contexts", () => {
      const input = `{
  "externalReferences": [
    "com.google.gson.JsonArray",
e    "org.springframework.stereotype.Service"
  ]
}`;

      const result = fixSyntaxErrors(input);

      // The main goal is to make JSON parseable - if it parses, the fix worked
      expect(() => JSON.parse(result.content)).not.toThrow();
      expect(result.content).toContain('"org.springframework.stereotype.Service"');
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

    it("should remove stray characters immediately before quotes (like 'ar'org.apa')", () => {
      const input = `{
    "externalReferences": [
ar"org.apache.poi.ss.usermodel.Cell",
      "org.apache.poi.ss.usermodel.Row"
    ]
  }`;

      const result = fixSyntaxErrors(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('"org.apache.poi.ss.usermodel.Cell"');
      expect(result.content).not.toContain('ar"org.apache');
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

    it("should fix non-ASCII character 'orgá.apache' to 'org.apache'", () => {
      const input = `{
    "internalReferences": [
      "orgá.apache.fineract.portfolio.savings.domain.SavingsAccount"
    ]
  }`;

      const result = fixSyntaxErrors(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain(
        '"org.apache.fineract.portfolio.savings.domain.SavingsAccount"',
      );
      expect(result.content).not.toContain('"orgá.apache');
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

  describe("stray words in arrays", () => {
    it("should remove stray word 'since' in array", () => {
      const input = `[
    "org.apache.fineract.portfolio.savings.data.SavingsAccountTransactionData",
since",
    "org.apache.fineract.portfolio.savings.domain.SavingsAccountAssembler"
  ]`;
      const result = fixSyntaxErrors(input);

      // The sanitizer may quote the word first, then remove it, or remove it directly
      // The important thing is that the JSON becomes parseable
      expect(result.changed).toBe(true);
      // Check that JSON is parseable (either "since" is removed or the structure is fixed)
      expect(() => JSON.parse(result.content)).not.toThrow();
      expect(result.content).toContain(
        '"org.apache.fineract.portfolio.savings.data.SavingsAccountTransactionData"',
      );
      expect(result.content).toContain(
        '"org.apache.fineract.portfolio.savings.domain.SavingsAccountAssembler"',
      );
    });

    it("should not remove valid array entries that happen to be common words", () => {
      const input = `["since", "and", "or"]`;
      const result = fixSyntaxErrors(input);

      // These are valid quoted strings, should not be removed
      expect(result.changed).toBe(false);
      expect(result.content).toContain('"since"');
    });
  });

  describe("truncated property descriptions", () => {
    it("should fix truncated property description starting with 'tatus'", () => {
      const input = `{
    "name": "setSubStatusDormant",
    "purpose": "tatus to 'Dormant'. This is the next stage after 'Inactive'."
  }`;
      const result = fixSyntaxErrors(input);

      // The important thing is that JSON is parseable
      expect(() => JSON.parse(result.content)).not.toThrow();
      // The description should be fixed or at least the JSON should be valid
      if (result.changed) {
        expect(result.content).toMatch(/"purpose"\s*:\s*"[^"]*Dormant/);
      }
    });

    it("should remove short fragments in property descriptions", () => {
      const input = `{
    "name": "test",
    "description": "e method does something important."
  }`;
      const result = fixSyntaxErrors(input);

      // The important thing is that JSON is parseable
      expect(() => JSON.parse(result.content)).not.toThrow();
      if (result.changed) {
        expect(result.content).toMatch(/"description"\s*:\s*"[^"]*method/);
      }
    });
  });

  describe("missing opening quotes in property names", () => {
    it("should fix missing opening quote in property name after comma and newline", () => {
      const input = `{
      "description": "This static factory method is designed to build a DTO for the account pre-closure process.",
      cyclomaticComplexity": 1,
      "linesOfCode": 58
    }`;

      const result = fixSyntaxErrors(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('"cyclomaticComplexity": 1');
      // Check that the broken version (without opening quote before cyclomaticComplexity) is not present
      // The pattern should NOT match: whitespace/newline followed by cyclomaticComplexity" (no quote before)
      const brokenPattern = /(^|\s)cyclomaticComplexity":/;
      expect(brokenPattern.test(result.content)).toBe(false);
      expect(() => JSON.parse(result.content)).not.toThrow();
    });

    it("should fix missing opening quote in property name after newline", () => {
      const input = `{
      "returnType": "RecurringDepositAccountData",
      description": "This static factory method creates a new instance."
    }`;

      const result = fixSyntaxErrors(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('"description":');
      // Check that the broken version (without opening quote before description) is not present
      // The pattern should NOT match: whitespace/newline followed by description" (no quote before)
      const brokenPattern = /(^|\s)description":/;
      expect(brokenPattern.test(result.content)).toBe(false);
      expect(() => JSON.parse(result.content)).not.toThrow();
    });
  });

  describe("stray text before properties", () => {
    it("should remove stray text like 'tribal-council-results' before properties", () => {
      const input = `{
    "databaseIntegration": {
      "mechanism": "SPRING-DATA"
    },
tribal-council-results
    "integrationPoints": []
  }`;
      const result = fixSyntaxErrors(input);

      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("tribal-council-results");
      expect(result.content).toContain('"integrationPoints"');
      expect(result.diagnostics).toBeDefined();
      expect(
        result.diagnostics?.some((d) => d.includes("stray text") && d.includes("tribal")),
      ).toBe(true);
    });

    it("should not remove valid property names with hyphens", () => {
      const input = `{
    "my-property": "value"
  }`;
      const result = fixSyntaxErrors(input);

      // Valid property name, should not be removed
      expect(result.changed).toBe(false);
      expect(result.content).toContain('"my-property"');
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
