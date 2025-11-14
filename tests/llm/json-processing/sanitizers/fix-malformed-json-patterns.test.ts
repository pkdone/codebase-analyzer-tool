import { fixMalformedJsonPatterns } from "../../../../src/llm/json-processing/sanitizers/fix-malformed-json-patterns";

describe("fixMalformedJsonPatterns", () => {
  describe("Pattern 65: Missing opening quotes in array string values", () => {
    it("should fix missing opening quote for fineract.integrationtests string", () => {
      const input = `{
  "internalReferences": [
    "org.apache.fineract.integrationtests.common.RecurringDepositAccountStatusChecker",
fineract.integrationtests.common.recurringdeposit.RecurringDepositProductHelper",
    "org.apache.fineract.integrationtests.common.savings.SavingsAccountHelper"
  ]
}`;

      const result = fixMalformedJsonPatterns(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain(
        '"org.apache.fineract.integrationtests.common.recurringdeposit.RecurringDepositProductHelper"',
      );
      expect(() => JSON.parse(result.content)).not.toThrow();
    });

    it("should fix missing opening quote for to.loan.transaction string", () => {
      const input = `{
  "internalReferences": [
    "org.apache.fineract.infrastructure.event.business.domain.loan.transaction.LoanChargePaymentPostBusinessEvent",
to.loan.transaction.LoanForeClosurePostBusinessEvent",
    "org.apache.fineract.infrastructure.event.business.domain.loan.transaction.LoanForeClosurePreBusinessEvent"
  ]
}`;

      const result = fixMalformedJsonPatterns(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain(
        '"org.apache.fineract.infrastructure.event.business.domain.loan.transaction.LoanForeClosurePostBusinessEvent"',
      );
      expect(() => JSON.parse(result.content)).not.toThrow();
    });
  });

  describe("Pattern 66: Malformed property names with extra characters", () => {
    it("should fix name:sem: pattern", () => {
      const input = `{
  "publicMethods": [
    {
      "name":sem": "clientNonPersonConstitutionOptions",
      "type": "Collection<CodeValueData>"
    }
  ]
}`;

      const result = fixMalformedJsonPatterns(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('"name": "clientNonPersonConstitutionOptions"');
      expect(() => JSON.parse(result.content)).not.toThrow();
    });

    it("should fix name:sem: with value", () => {
      const input = `{
  "publicMethods": [
    {
      "name":sem": "firstname",
      "type": "String"
    }
  ]
}`;

      const result = fixMalformedJsonPatterns(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('"name": "firstname"');
      expect(() => JSON.parse(result.content)).not.toThrow();
    });
  });

  describe("Pattern 67: Stray text patterns", () => {
    it("should fix {.json pattern", () => {
      const input = `{
  "publicMethods": [
    {
      "name": "transferClientBetweenGroups"
    },
    {.json
      "name": "proposeAndAcceptClientTransfer"
    }
  ]
}`;

      const result = fixMalformedJsonPatterns(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('"name": "proposeAndAcceptClientTransfer"');
      expect(result.content).not.toContain("{.json");
      expect(() => JSON.parse(result.content)).not.toThrow();
    });

    it("should remove stray text 'trib'", () => {
      const input = `{
  "externalReferences": [
    "jakarta.persistence.Column"
  ],
trib
  "publicConstants": []
}`;

      const result = fixMalformedJsonPatterns(input);

      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("trib");
      expect(() => JSON.parse(result.content)).not.toThrow();
    });

    it("should remove stray text 'cmethod'", () => {
      const input = `{
  "publicMethods": [
    {
      "name": "isChargeRefund"
    }
  ],
cmethod
  "databaseIntegration": {}
}`;

      const result = fixMalformedJsonPatterns(input);

      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("cmethod");
      expect(() => JSON.parse(result.content)).not.toThrow();
    });

    it("should remove _ADDITIONAL_PROPERTIES", () => {
      const input = `{
  "publicMethods": [
    {
      "name": "testMethod"
    }
  ],
_ADDITIONAL_PROPERTIES
  "databaseIntegration": {}
}`;

      const result = fixMalformedJsonPatterns(input);

      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("_ADDITIONAL_PROPERTIES");
      expect(() => JSON.parse(result.content)).not.toThrow();
    });

    it("should fix trailing comma", () => {
      const input = `{
  "publicMethods": [
    {
      "returnType": "void",
    }
  ]
}`;

      const result = fixMalformedJsonPatterns(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('"returnType": "void"');
      expect(result.content).not.toContain('"returnType": "void",');
      expect(() => JSON.parse(result.content)).not.toThrow();
    });
  });

  describe("Pattern 68: Missing opening quote before property values", () => {
    it('should fix post": pattern', () => {
      const input = `{
  "externalReferences": [
    "jakarta.ws.rs.GET",
post": "jakarta.ws.rs.POST",
    "jakarta.ws.rs.PUT"
  ]
}`;

      const result = fixMalformedJsonPatterns(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('"jakarta.ws.rs.POST"');
      expect(result.content).not.toContain('post": "jakarta.ws.rs.POST"');
      expect(() => JSON.parse(result.content)).not.toThrow();
    });
  });

  describe("Pattern 69: Duplicate import statements", () => {
    it("should remove duplicate Java import statements", () => {
      const input = `{
  "externalReferences": [
    "org.mockito.Mock"
  ],
package org.apache.fineract.cob.loan;

import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDate;
  "publicConstants": []
}`;

      const result = fixMalformedJsonPatterns(input);

      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("package org.apache.fineract.cob.loan;");
      expect(result.content).not.toContain("import static org.mockito.ArgumentMatchers.anyLong;");
      expect(() => JSON.parse(result.content)).not.toThrow();
    });
  });

  describe("Pattern 70: Missing dots in package names", () => {
    it("should fix orgfineract to org.apache.fineract", () => {
      const input = `{
  "internalReferences": [
    "orgfineract.infrastructure.core.serialization.ToApiJsonSerializer"
  ]
}`;

      const result = fixMalformedJsonPatterns(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain(
        '"org.apache.fineract.infrastructure.core.serialization.ToApiJsonSerializer"',
      );
      expect(() => JSON.parse(result.content)).not.toThrow();
    });
  });

  describe("Pattern 71: Stray text at end", () => {
    it("should remove stray text 'trib' at end of array", () => {
      const input = `{
  "externalReferences": [
    "jakarta.persistence.Column"
  ],
tribal-council-leader-thought
  "publicConstants": []
}`;

      const result = fixMalformedJsonPatterns(input);

      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("tribal-council-leader-thought");
      expect(() => JSON.parse(result.content)).not.toThrow();
    });
  });

  describe("Pattern 72: Missing opening quote for to. strings", () => {
    it("should fix to.loan.transaction missing quote", () => {
      const input = `{
  "internalReferences": [
    "org.apache.fineract.infrastructure.event.business.domain.loan.transaction.LoanChargePaymentPostBusinessEvent",
to.loan.transaction.LoanForeClosurePostBusinessEvent",
    "org.apache.fineract.infrastructure.event.business.domain.loan.transaction.LoanForeClosurePreBusinessEvent"
  ]
}`;

      const result = fixMalformedJsonPatterns(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain(
        '"org.apache.fineract.infrastructure.event.business.domain.loan.transaction.LoanForeClosurePostBusinessEvent"',
      );
      expect(() => JSON.parse(result.content)).not.toThrow();
    });
  });

  describe("Pattern 73: Hyphens instead of dots in package names", () => {
    it("should fix jakarta.ws-rs.Path to jakarta.ws.rs.Path", () => {
      const input = `{
  "externalReferences": [
    "jakarta.ws.rs.GET",
    "jakarta.ws-rs.Path",
    "jakarta.ws.rs.PUT"
  ]
}`;

      const result = fixMalformedJsonPatterns(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('"jakarta.ws.rs.Path"');
      expect(result.content).not.toContain('"jakarta.ws-rs.Path"');
      expect(() => JSON.parse(result.content)).not.toThrow();
    });
  });

  describe("Pattern 74: Missing opening quote before property name", () => {
    it('should fix - "externalReferences" pattern', () => {
      const input = `{
  "internalReferences": [],
- "externalReferences": [
    "jakarta.persistence.Column"
  ]
}`;

      const result = fixMalformedJsonPatterns(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('"externalReferences"');
      expect(result.content).not.toContain('- "externalReferences"');
      expect(() => JSON.parse(result.content)).not.toThrow();
    });

    it('should fix name": pattern', () => {
      const input = `{
  "publicMethods": [
    {
name": "testMethod",
      "returnType": "void"
    }
  ]
}`;

      const result = fixMalformedJsonPatterns(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('"name": "testMethod"');
      expect(() => JSON.parse(result.content)).not.toThrow();
    });
  });

  describe("Combined real-world error cases", () => {
    it("should fix error case from RecurringDepositTest.java", () => {
      const input = `{
  "internalReferences": [
    "org.apache.fineract.integrationtests.common.RecurringDepositAccountStatusChecker",
fineract.integrationtests.common.recurringdeposit.RecurringDepositProductHelper",
    "org.apache.fineract.integrationtests.common.savings.SavingsAccountHelper"
  ]
}`;

      const result = fixMalformedJsonPatterns(input);

      expect(result.changed).toBe(true);
      expect(() => JSON.parse(result.content)).not.toThrow();
      const parsed = JSON.parse(result.content);
      expect(parsed.internalReferences).toContain(
        "org.apache.fineract.integrationtests.common.recurringdeposit.RecurringDepositProductHelper",
      );
    });

    it("should fix orgahce typo", () => {
      const input = `{
  "internalReferences": [
    "orgahce.fineract.infrastructure.event.business.domain.loan.transaction.LoanTransactionMerchantIssuedRefundPostBusinessEvent"
  ]
}`;

      const result = fixMalformedJsonPatterns(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain(
        '"org.apache.fineract.infrastructure.event.business.domain.loan.transaction.LoanTransactionMerchantIssuedRefundPostBusinessEvent"',
      );
      expect(() => JSON.parse(result.content)).not.toThrow();
    });

    it("should fix error case from LoanAccountDomainServiceJpa.java", () => {
      const input = `{
  "internalReferences": [
    "org.apache.fineract.infrastructure.event.business.domain.loan.transaction.LoanChargePaymentPostBusinessEvent",
to.loan.transaction.LoanForeClosurePostBusinessEvent",
    "org.apache.fineract.infrastructure.event.business.domain.loan.transaction.LoanForeClosurePreBusinessEvent"
  ]
}`;

      const result = fixMalformedJsonPatterns(input);

      expect(result.changed).toBe(true);
      expect(() => JSON.parse(result.content)).not.toThrow();
    });

    it("should fix error case from ClientData.java", () => {
      const input = `{
  "publicMethods": [
    {
      "name":sem": "clientNonPersonConstitutionOptions",
      "type": "Collection<CodeValueData>"
    },
    {
      "name":sem": "firstname",
      "type": "String"
    }
  ]
}`;

      const result = fixMalformedJsonPatterns(input);

      expect(result.changed).toBe(true);
      expect(() => JSON.parse(result.content)).not.toThrow();
    });

    it("should fix error case from TransferWritePlatformServiceJpaRepositoryImpl.java", () => {
      const input = `{
  "publicMethods": [
    {
      "name": "transferClientBetweenGroups"
    },
    {.json
      "name": "proposeAndAcceptClientTransfer"
    }
  ]
}`;

      const result = fixMalformedJsonPatterns(input);

      expect(result.changed).toBe(true);
      expect(() => JSON.parse(result.content)).not.toThrow();
    });

    it("should fix error case from CentersApiResource.java", () => {
      const input = `{
  "externalReferences": [
    "jakarta.ws.rs.GET",
post": "jakarta.ws.rs.POST",
    "jakarta.ws.rs.PUT"
  ]
}`;

      const result = fixMalformedJsonPatterns(input);

      expect(result.changed).toBe(true);
      expect(() => JSON.parse(result.content)).not.toThrow();
    });

    it("should fix error case from CalendarFrequencyType.java", () => {
      const input = `{
  "publicMethods": [
    {
name": "isInvalid",
      "purpose": "This is a convenience method"
    }
  ],
tribal-council-leader-thought
  "databaseIntegration": {}
}`;

      const result = fixMalformedJsonPatterns(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('"name": "isInvalid"');
      expect(result.content).not.toContain("tribal-council-leader-thought");
      expect(() => JSON.parse(result.content)).not.toThrow();
    });

    it("should fix error case from ApplicationCurrency.java", () => {
      const input = `{
  "internalReferences": [],
- "externalReferences": [
    "jakarta.persistence.Column"
  ]
}`;

      const result = fixMalformedJsonPatterns(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('"externalReferences"');
      expect(result.content).not.toContain('- "externalReferences"');
      expect(() => JSON.parse(result.content)).not.toThrow();
    });

    it("should fix error case from LoanStatusChecker.java", () => {
      const input = `{
  "publicMethods": [
    {
      "returnType": "void",
    }
  ]
}`;

      const result = fixMalformedJsonPatterns(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('"returnType": "void"');
      expect(result.content).not.toContain('"returnType": "void",');
      expect(() => JSON.parse(result.content)).not.toThrow();
    });

    it("should fix error case from ThitsaWorksCreditBureauIntegrationWritePlatformService.java", () => {
      const input = `{
  "publicMethods": [
    {
      "name": "extractUniqueId"
    },
    {
se": "This method acts as a generic",
      "parameters": []
    }
  ]
}`;

      const result = fixMalformedJsonPatterns(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('"purpose": "This method acts as a generic"');
      expect(() => JSON.parse(result.content)).not.toThrow();
    });

    it("should fix error case from AccountingProcessorForSharesFactory.java", () => {
      const input = `{
  "externalReferences": [],
e"publicConstants": [],
  "publicMethods": []
}`;

      const result = fixMalformedJsonPatterns(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('"publicConstants"');
      expect(result.content).not.toContain('e"publicConstants"');
      expect(() => JSON.parse(result.content)).not.toThrow();
    });
  });

  describe("Edge cases and safety", () => {
    it("should not modify valid JSON", () => {
      const input = '{"key": "value", "array": ["item1", "item2"]}';
      const result = fixMalformedJsonPatterns(input);

      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });

    it("should handle empty input", () => {
      const result = fixMalformedJsonPatterns("");

      expect(result.changed).toBe(false);
    });

    it("should not modify strings inside string values", () => {
      const input = '{"description": "This is a string with fineract.integrationtests in it"}';
      const result = fixMalformedJsonPatterns(input);

      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });
  });

  describe("Pattern 54: Malformed parameter objects with corrupted property names", () => {
    it("should fix malformed parameter object with corrupted property name", () => {
      const input = `{
  "publicMethods": [
    {
      "name": "testMethod",
      "parameters": [
        {
          "name":toBeContinued": "true"
        }
      ]
    }
  ]
}`;

      const result = fixMalformedJsonPatterns(input);

      expect(result.changed).toBe(true);
      // The pattern should fix "name":toBeContinued": "true" to "name": "toBeContinued"
      // The unquoted value (toBeContinued) becomes the value
      expect(result.content).not.toContain('"name":toBeContinued":');
      // The pattern should produce valid JSON
      expect(() => JSON.parse(result.content)).not.toThrow();
      // Verify the malformed pattern is gone
      const parsed = JSON.parse(result.content);
      expect(parsed.publicMethods[0].parameters[0]).toBeDefined();
    });

    it("should fix multiple malformed parameter objects", () => {
      const input = `{
  "publicMethods": [
    {
      "name": "testMethod",
      "parameters": [
        {
          "name":toBeContinued": "true"
        },
        {
          "name":anotherValue": "false"
        }
      ]
    }
  ]
}`;

      const result = fixMalformedJsonPatterns(input);

      expect(result.changed).toBe(true);
      // The pattern should fix both malformed parameter objects
      expect(result.content).not.toContain('"name":toBeContinued":');
      expect(result.content).not.toContain('"name":anotherValue":');
      // The pattern should produce valid JSON
      expect(() => JSON.parse(result.content)).not.toThrow();
      const parsed = JSON.parse(result.content);
      expect(parsed.publicMethods[0].parameters).toHaveLength(2);
    });
  });
});
