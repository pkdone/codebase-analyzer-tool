import { JsonProcessor } from "../../../src/llm/json-processing/core/json-processor";
import { LLMOutputFormat } from "../../../src/llm/types/llm.types";

describe("JsonProcessor.parseAndValidate - Mismatched Delimiters Integration Tests", () => {
  let jsonProcessor: JsonProcessor;

  beforeEach(() => {
    jsonProcessor = new JsonProcessor();
  });
  describe("exact error case from 2025-10-02 log", () => {
    it("should successfully parse JSON with mismatched delimiter in nested array", () => {
      // Simplified version that captures the essence of the error: object in array with wrong closing delimiter
      const malformedJson = `{
  "methods": [
    {
      "name": "testMethod",
      "parameters": [
        {
          "name": "param1",
          "type": "String"
        ],
      "returnType": "void"
    }
  ]
}`;

      const completionOptions = {
        outputFormat: LLMOutputFormat.JSON,
      };

      // This should NOT throw - fixMismatchedDelimiters will fix the ] to }, then removeTrailingCommas will clean up
      const result = jsonProcessor.parseAndValidate(
        malformedJson,
        "test-resource",
        completionOptions,
        false,
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect((result.data as any).methods).toHaveLength(1);
      }
    });

    it("should successfully parse the full AccountAssociations JSON with mismatched delimiter", () => {
      // This is the exact malformed JSON from the error log that failed
      // Note: The actual error log has this PLUS it's truncated mid-word, but testing the delimiter issue specifically
      const malformedJson = `{
  "name": "AccountAssociations",
  "kind": "class",
  "namespace": "org.apache.fineract.portfolio.account.domain.AccountAssociations",
  "purpose": "The AccountAssociations class serves as a JPA entity that represents the relationships between different types of financial accounts within the Apache Fineract portfolio management system. It acts as a bridge entity that establishes associations between loan accounts and savings accounts, allowing the system to track and manage complex relationships between various financial products. The class enables the creation of linked account structures where one account can be associated with another for business purposes such as automatic transfers, collateral arrangements, or integrated financial product offerings. This entity is crucial for maintaining referential integrity and business logic consistency across different account types in the financial portfolio management domain.",
  "implementation": "The implementation extends AbstractPersistableCustom to inherit common persistence functionality and uses JPA annotations to map to the m_portfolio_account_associations database table. The class maintains four main relationship fields using @ManyToOne annotations: loanAccount, savingsAccount, linkedLoanAccount, and linkedSavingsAccount, allowing flexible associations between different account types. It includes an associationType field to categorize the nature of the association and an active boolean flag to manage the lifecycle of associations without physical deletion. The class provides static factory methods associateSavingsAccount with different parameter combinations to create specific types of associations, following the factory pattern for controlled object creation. The implementation includes methods for accessing and updating linked savings accounts, ensuring encapsulation while providing necessary business operations for account association management.",
  "internalReferences": [
    "org.apache.fineract.infrastructure.core.domain.AbstractPersistableCustom",
    "org.apache.fineract.portfolio.loanaccount.domain.Loan",
    "org.apache.fineract.portfolio.savings.domain.SavingsAccount"
  ],
  "externalReferences": [
    "jakarta.persistence.Column",
    "jakarta.persistence.Entity",
    "jakarta.persistence.JoinColumn",
    "jakarta.persistence.ManyToOne",
    "jakarta.persistence.Table"
  ],
  "publicConstants": [],
  "publicMethods": [
    {
      "name": "associateSavingsAccount",
      "purpose": "This static factory method creates an AccountAssociations instance that establishes a relationship between a loan account and a linked savings account. It serves as a controlled way to create associations where a loan is the primary account and a savings account is the linked account. The method encapsulates the business logic for this specific type of association by setting the appropriate fields and leaving others as null. This approach ensures that only valid association combinations are created and maintains data integrity. The method supports the business requirement of linking savings accounts to loans for purposes such as automatic repayments or collateral arrangements.",
      "parameters": [
        {
          "name": "loan",
          "type": "Loan"
        },
        {
          "name": "savingsAccount",
          "type": "SavingsAccount"
        },
        {
          "name": "associationType",
          "type": "Integer"
        },
        {
          "name": "isActive",
          "type": "boolean"
        }
      ],
      "returnType": "AccountAssociations",
      "description": "The method creates a new AccountAssociations instance by calling the private constructor with specific parameter values. It passes the loan parameter as the loanAccount, null for the savingsAccount parameter, null for the linkedLoanAccount, the savingsAccount parameter as the linkedSavingsAccount, and the provided associationType and isActive values. This specific parameter combination creates an association where a loan is linked to a savings account."
    },
    {
      "name": "associateSavingsAccount",
      "purpose": "This overloaded static factory method creates an AccountAssociations instance that establishes a relationship between two savings accounts. It enables the creation of savings-to-savings account associations where one savings account is linked to another savings account. This method supports business scenarios such as creating joint accounts, family account relationships, or automatic transfer arrangements between savings accounts. The method ensures proper encapsulation of the association creation logic and maintains consistency in how different types of account associations are established. It provides flexibility in the financial product offerings by allowing complex savings account relationships to be modeled and managed within the system.",
      "parameters": [
        {
          "name": "savingsAccount",
          "type": "SavingsAccount"
        },
        {
          "name": "linkedSavingsAccount",
          "type": "SavingsAccount"
        },
        {
          "name": "associationType",
          "type": "Integer"
        },
        {
          "name": "isActive",
          "type": "boolean"
        }
      ],
      "returnType": "AccountAssociations",
      "description": "The method instantiates a new AccountAssociations object by invoking the private constructor with parameters arranged to create a savings-to-savings association. It passes null for the loanAccount parameter, the first savingsAccount parameter as the savingsAccount field, null for the linkedLoanAccount, the linkedSavingsAccount parameter as the linkedSavingsAccount field, and the provided associationType and isActive boolean values."
    },
    {
      "name": "linkedSavingsAccount",
      "purpose": "This getter method provides controlled access to the linkedSavingsAccount field of the AccountAssociations entity. It serves as the primary way for external classes to retrieve information about the savings account that is linked in the association relationship. The method supports the encapsulation principle by providing read access to the internal state without exposing the field directly. This is essential for business logic that needs to access the linked savings account information for operations such as balance inquiries, transaction processing, or relationship validation. The method enables other parts of the system to work with the linked account information while maintaining the integrity of the association entity.",
      "parameters": [],
      "returnType": "SavingsAccount",
      "description": "The method simply returns the value of the linkedSavingsAccount instance variable without any additional processing or validation. It provides direct access to the SavingsAccount object that represents the linked savings account in the association relationship."
    },
    {
      "name": "updateLinkedSavingsAccount",
      "purpose": "This setter method allows for the modification of the linkedSavingsAccount field after the AccountAssociations entity has been created. It provides a controlled way to update the linked savings account relationship, which is important for business scenarios where account associations need to be modified due to account changes, transfers, or restructuring. The method supports the business requirement of maintaining flexible account relationships that can evolve over time. It ensures that the association can be updated while maintaining the integrity of the entity and its persistence state. This functionality is crucial for account management operations where the linked account may need to be changed without creating entirely new association records.",
      "parameters": [
        {
          "name": "savingsAccount",
          "type": "SavingsAccount"
        ],
      "returnType": "void",
      "description": "The method assigns the provided savingsAccount parameter to the linkedSavingsAccount instance variable, effectively updating the linked savings account reference. The implementation is straightforward, directly setting the field value without additional validation or business logic processing."
    }
  ],
  "databaseIntegration": {
    "mechanism": "JPA",
    "description": "The class uses JPA (Java Persistence API) annotations for database integration, mapping to the m_portfolio_account_associations table. It employs @Entity and @Table annotations to define the database mapping, @ManyToOne relationships with @JoinColumn annotations to establish foreign key relationships with loan_account_id, savings_account_id, linked_loan_account_id, and linked_savings_account_id columns. The class also uses @Column annotations for association_type_enum and is_active fields to map simple properties to database columns.",
    "codeExample": "@Entity @Table(name = m_portfolio_account_associations) @ManyToOne @JoinColumn(name = loan_account_id, nullable = true)"
  }
}`;

      const completionOptions = {
        outputFormat: LLMOutputFormat.JSON,
      };

      // This should NOT throw - the fixMismatchedDelimiters sanitizer should fix it
      const result = jsonProcessor.parseAndValidate(
        malformedJson,
        "fineract-provider/src/main/java/org/apache/fineract/portfolio/account/domain/AccountAssociations.java",
        completionOptions,
        false,
      );

      // Verify the result is valid
      expect(result.success).toBe(true);
      if (result.success) {
        expect((result.data as any).name).toBe("AccountAssociations");
        expect((result.data as any).publicMethods).toHaveLength(4);
      }
    });
  });

  describe("similar real-world mismatched delimiter patterns", () => {
    it("should handle array of objects where last object is missing closing brace", () => {
      const malformedJson = `{
  "items": [
    {"id": 1, "name": "first"},
    {"id": 2, "name": "second"},
    {"id": 3, "name": "third"]
  ]
}`;

      const completionOptions = {
        outputFormat: LLMOutputFormat.JSON,
      };

      const result = jsonProcessor.parseAndValidate(
        malformedJson,
        "test-resource",
        completionOptions,
        false,
      );

      expect(result.success).toBe(true);
      if (result.success) {
        const resultObj = result.data as any;
        expect(resultObj.items).toHaveLength(3);
        expect(resultObj.items[2].name).toBe("third");
      }
    });

    it("should handle nested parameters array with mismatched delimiters", () => {
      const malformedJson = `{
  "methods": [
    {
      "name": "myMethod",
      "params": [
        {"name": "param1", "type": "String"],
        {"name": "param2", "type": "int"]
      ]
    }
  ]
}`;

      const completionOptions = {
        outputFormat: LLMOutputFormat.JSON,
      };

      const result = jsonProcessor.parseAndValidate(
        malformedJson,
        "test-resource",
        completionOptions,
        false,
      );

      expect(result.success).toBe(true);
      if (result.success) {
        const resultObj = result.data as any;
        expect(resultObj.methods).toHaveLength(1);
        expect(resultObj.methods[0].params).toHaveLength(2);
        expect(resultObj.methods[0].params[0].type).toBe("String");
      }
    });

    it("should handle multiple levels of nested mismatches", () => {
      const malformedJson = `{
  "outer": {
    "middle": {
      "inner": [
        {"key": "value"]
      ]
    ]
  ]
}`;

      const completionOptions = {
        outputFormat: LLMOutputFormat.JSON,
      };

      const result = jsonProcessor.parseAndValidate(
        malformedJson,
        "test-resource",
        completionOptions,
        false,
      );

      expect(result.success).toBe(true);
      if (result.success) {
        const resultObj = result.data as any;
        expect(resultObj.outer.middle.inner).toHaveLength(1);
        expect(resultObj.outer.middle.inner[0].key).toBe("value");
      }
    });

    it("should handle mixed correct and incorrect delimiters", () => {
      const malformedJson = `{
  "correct": [
    {"id": 1},
    {"id": 2}
  ],
  "incorrect": [
    {"id": 3],
    {"id": 4]
  ]
}`;

      const completionOptions = {
        outputFormat: LLMOutputFormat.JSON,
      };

      const result = jsonProcessor.parseAndValidate(
        malformedJson,
        "test-resource",
        completionOptions,
        false,
      );

      expect(result.success).toBe(true);
      if (result.success) {
        const resultObj = result.data as any;
        expect(resultObj.correct).toHaveLength(2);
        expect(resultObj.incorrect).toHaveLength(2);
      }
    });
  });

  describe("combined sanitization scenarios", () => {
    it("should handle mismatched delimiters with trailing commas", () => {
      const malformedJson = `{
  "items": [
    {"name": "item1",],
    {"name": "item2",],
  ]
}`;

      const completionOptions = {
        outputFormat: LLMOutputFormat.JSON,
      };

      const result = jsonProcessor.parseAndValidate(
        malformedJson,
        "test-resource",
        completionOptions,
        false,
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect((result.data as any).items).toHaveLength(2);
      }
    });

    it("should handle mismatched delimiters in truncated JSON", () => {
      const malformedJson = `{
  "data": {
    "nested": [
      {"id": 1, "value": "truncated`;

      const completionOptions = {
        outputFormat: LLMOutputFormat.JSON,
      };

      // Should complete the truncated structure after fixing mismatched delimiters
      const result = jsonProcessor.parseAndValidate(
        malformedJson,
        "test-resource",
        completionOptions,
        false,
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(typeof result.data).toBe("object");
      }
    });
  });
});
