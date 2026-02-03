import { parseAndValidateLLMJson } from "../../../../../src/common/llm/json-processing/core/json-processing";
import { LLMOutputFormat, LLMPurpose } from "../../../../../src/common/llm/types/llm-request.types";

describe("JsonProcessor Integration Tests", () => {
  describe("Real-world error cases", () => {
    it("should handle the actual error case from the log file", () => {
      // This is the actual problematic JSON from the error log
      const problematicJson = `{
  "name": "CreditCardLocal",
  "kind": "INTERFACE",
  "namespace": "com.sun.j2ee.blueprints.creditcard.ejb.CreditCardLocal",
  "purpose": "This interface defines the local business contract for a Credit Card Enterprise JavaBean (EJB). Its purpose is to provide a strongly-typed, in-process access point for other components running within the same Java Virtual Machine (JVM) and EJB container. It specifies the methods available for interacting with a credit card entity, such as retrieving and updating its number, type, and expiration date. By extending javax.ejb.EJBLocalObject, it signals to the EJB container that it is part of the local client view for an EJB, allowing for more performant access compared to a remote interface by avoiding network serialization overhead.",
  "implementation": "As an interface, CreditCardLocal does not contain any implementation logic itself; it only declares method signatures. It is intended to be implemented by an EJB class, likely an Entity Bean (given the J2EE blueprint context), which would provide the concrete logic. The interface extends javax.ejb.EJBLocalObject, a standard EJB marker interface that provides local clients with methods to manage the bean's identity and lifecycle. The declared methods are primarily simple accessors (getters) and mutators (setters) for credit card attributes. The getData() method follows the Data Transfer Object (DTO) or Value Object pattern, enabling a client to retrieve all of the credit card's state in a single call, which is an optimization to reduce method invocation overhead.",
  "internalReferences": [
    "com.sun.j2ee.blueprints.creditcard.ejb.CreditCard"
  ],
  "externalReferences": [
    "javax.ejb.EJBLocalObject"
  ],
  "eferences": [],
  "publicConstants": [],
  "publicFunctions": [
    {
      "name": "getCardNumber",
      "purpose": "This method is an accessor designed to retrieve the credit card number associated with the EJB instance. It serves as a standard getter, providing read-only access to the cardNumber property of the credit card entity. Clients call this method to obtain the unique identifier of the credit card. The business logic decision is to expose this sensitive piece of data to local clients, assuming they are trusted components within the same application. It encapsulates the underlying data storage, returning a string representation of the number.",
      "parameters": [],
      "returnType": "String",
      "description": "This is an abstract interface method. The EJB container, in conjunction with the bean implementation, would provide the logic. For a Container-Managed Persistence (CMP) entity bean, the container would automatically generate code to fetch this value from the corresponding column in the database table and return it to the caller.",
      "cyclomaticComplexity": 1,
      "linesOfCode": 1,
      "codeSmells": []
    },
    {
      "name": "setCardNumber",
      "purpose": "This method is a mutator used to set or update the credit card number of the EJB instance. It allows a client to change the value of the cardNumber property. This is a critical operation, as it modifies a key piece of data. The business logic implies that under certain conditions, a credit card number can be assigned or changed post-creation. This method is essential for creating new credit card entities or correcting existing ones.",
      "parameters": [
        {
          "name": "cardNumber",
          "type": "String"
        }
      ],
      "returnType": "void",
      "description": "This is an abstract interface method. In a CMP entity bean implementation, the EJB container would intercept this call and generate the necessary logic to update the corresponding database column with the provided cardNumber value. This update would typically be part of a transaction managed by the container.",
      "cyclomaticComplexity": 1,
      "linesOfCode": 1,
      "codeSmells": []
    },
    {
      "name": "getCardType",
      "purpose": "This method is an accessor designed to retrieve the type of the credit card, such as Visa, MasterCard, or American Express. It provides read-only access to the cardType property. Clients use this method to identify the card network, which can be important for processing payments or applying specific business rules. It encapsulates the storage of the card type, returning it as a string.",
      "parameters": [],
      "returnType": "String",
      "description": "This is an abstract interface method. The EJB container, in a CMP scenario, would automatically generate the implementation to read the card type value from the corresponding database column and return it.",
      "cyclomaticComplexity": 1,
      "linesOfCode": 1,
      "codeSmells": []
    },
    {
      "name": "setCardType",
      "purpose": "This method is a mutator used to set or update the type of the credit card. It allows a client to assign a card type to a credit card entity. This is typically done during the creation of a new credit card record. The business logic decision is to allow the card type to be a mutable property, which could be used for initial setup or for correcting data entry errors.",
      "parameters": [
        {
          "name": "cardType",
          "type": "String"
        }
      ],
      "returnType": "void",
      "description": "This is an abstract interface method. The EJB container's implementation for a CMP bean would update the card_type column in the database with the value of the cardType parameter within the scope of a transaction.",
      "cyclomaticComplexity": 1,
      "linesOfCode": 1,
      "codeSmells": []
    },
    {
      "name": "getExpiryDate",
      "purpose": "This method is an accessor that retrieves the full expiration date of the credit card. It is expected to return the date as a single string, likely in a format like MM/YYYY. This method provides a complete, unparsed representation of the expiry date, which might be useful for display purposes or for systems that expect the date in this specific format. It encapsulates the storage of the expiration date.",
      "parameters": [],
      "returnType": "String",
      "description": "This is an abstract interface method. The corresponding EJB implementation would return the value of the expiryDate field. In a CMP bean, this would involve the container fetching the value from the database.",
      "cyclomaticComplexity": 1,
      "linesOfCode": 1,
      "codeSmells": []
    },
    {
      "name": "getExpiryMonth",
      "purpose": "This method is a specialized accessor that retrieves only the month portion of the credit card's expiration date. Its existence suggests that business logic within the application may need to validate or process the month and year separately. This is common in payment processing systems for checking if a card is expired. It provides a more granular access to the expiration date information than the getExpiryDate() method.",
      "parameters": [],
      "returnType": "String",
      "description": "This is an abstract interface method. The bean implementation would need to parse the full expiry date string (e.g., from the expiryDate field) to extract and return the two-digit month component.",
      "cyclomaticComplexity": 1,
      "linesOfCode": 1,
      "codeSmells": []
    },
    {
      "name": "getExpiryYear",
      "purpose": "This method is a specialized accessor that retrieves only the year portion of the credit card's expiration date. Similar to getExpiryMonth(), this method supports business logic that requires separate access to the year, such as checking if a card has expired. It allows for more precise date-based calculations and validations by isolating the year component from the full date string.",
      "parameters": [],
      "returnType": "String",
      "description": "This is an abstract interface method. The bean implementation would be responsible for parsing the full expiry date string to extract and return the four-digit year component.",
      "cyclomaticComplexity": 1,
      "linesOfCode": 1,
      "codeSmells": []
    },
    {
      "name": "setExpiryDate",
      "purpose": "This method is a mutator used to set or update the expiration date of the credit card. It takes a single string argument, which is expected to contain the full expiration date. This method is essential for creating or updating credit card records. The business logic implies that the expiration date is a mutable property of the credit card entity.",
      "parameters": [
        {
          "name": "expiryDate",
          "type": "String"
        }
      ],
      "returnType": "void",
      "description": "This is an abstract interface method. In a CMP entity bean, the EJB container would generate code to persist the provided expiryDate string to the corresponding column in the database.",
      "cyclomaticComplexity": 1,
      "linesOfCode": 1,
      "codeSmells": []
    },
    {
      "name": "getData",
      "purpose": "This method implements the Data Transfer Object (DTO) or Value Object design pattern. Its purpose is to retrieve all the state of the credit card entity in a single, serializable object, in this case, an instance of the CreditCard class. This is an optimization to reduce the number of method calls between the client and the EJB, especially in distributed scenarios. Instead of calling multiple getters (getCardNumber, getCardType, etc.), a client can make one call to getData() to get a snapshot of the entire entity.",
      "parameters": [],
      "returnType": "CreditCard",
      "description": "This is an abstract interface method. The bean implementation would create a new instance of the CreditCard class, populate it with the bean's current state (card number, type, expiry date), and return this new object to the client.",
      "cyclomaticComplexity": 1,
      "linesOfCode": 1,
      "codeSmells": []
    }
  ],
  "databaseIntegration": {
    "mechanism": "EJB",
    "name": "CreditCard EJB",
    "description": "This interface is the local contract for an Enterprise JavaBean (EJB), which, in the context of J2EE blueprints, is almost certainly a Container-Managed Persistence (CMP) Entity Bean. Entity Beans are used to model and persist business data. The EJB container transparently handles all database interactions. When a client calls a setter method (e.g., setCardNumber), the container intercepts the call and generates an SQL UPDATE statement. When a getter is called, it generates an SQL SELECT statement. All persistence logic is managed by the container, abstracting it away from the application code.",
    "databaseName": "not identifiable from code",
    "tablesAccessed": [
      "CreditCard"
    ],
    "operationType": [
      "READ_WRITE"
    ],
    "queryPatterns": "simple CRUD",
    "transactionHandling": "Container-Managed Transactions (CMT)",
    "protocol": "not identifiable from code",
    "connectionInfo": "not identifiable from code",
    "codeExample": "public interface CreditCardLocal extends javax.ejb.EJBLocalObject {\\n    public String getCardNumber();\\n    public void setCardNumber(String cardNumber);\\n    // ...\\n}"
  },
  "integrationPoints": [],
  "codeQualityMetrics": {
    "totalFunctions": 9,
    "averageComplexity": 1,
    "maxComplexity": 1,
    "averageFunctionLength": 1,
    "fileSmells": []
  }
}`;

      const result = parseAndValidateLLMJson(
        problematicJson,
        { resource: "test-resource", purpose: LLMPurpose.COMPLETIONS, modelKey: "test-model" },
        {
          outputFormat: LLMOutputFormat.JSON,
        },
      );

      if (!result.success) {
        console.log("Error details:", result.error);
        console.log("Error type:", result.error.type);
      }

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeDefined();
        // The JSON is now valid, so sanitizers aren't applied
        // This is the correct behavior - sanitizers only run when JSON parsing fails
        expect(result.repairs).toEqual([]);
      }
    });

    it("should handle unquoted property names in real-world scenarios", () => {
      const problematicJson = `{
  "name": "CreditCardLocal",
  kind: "INTERFACE",
  "namespace": "com.sun.j2ee.blueprints.creditcard.ejb.CreditCardLocal",
  purpose: "This interface defines the local business contract",
  "implementation": "As an interface",
  "internalReferences": ["com.sun.j2ee.blueprints.creditcard.ejb.CreditCard"],
  "externalReferences": ["javax.ejb.EJBLocalObject"],
  "publicConstants": [],
  "publicFunctions": []
}`;

      const result = parseAndValidateLLMJson(
        problematicJson,
        { resource: "test-resource", purpose: LLMPurpose.COMPLETIONS, modelKey: "test-model" },
        {
          outputFormat: LLMOutputFormat.JSON,
        },
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeDefined();
        // Check high-level sanitizer was applied
        expect(result.pipelineSteps).toContain("Fixed property and value syntax");
        // Check low-level mutation steps contain property name fixes
        expect(result.repairs.some((s) => s.includes("PropertyNameFixer"))).toBe(true);
      }
    });

    it("should handle both truncated and unquoted property names", () => {
      const problematicJson = `{
  "name": "CreditCardLocal",
  kind: "INTERFACE",
  "namespace": "com.sun.j2ee.blueprints.creditcard.ejb.CreditCardLocal",
  purpose: "This interface defines the local business contract",
  "implementation": "As an interface",
  "internalReferences": ["com.sun.j2ee.blueprints.creditcard.ejb.CreditCard"],
  "externalReferences": ["javax.ejb.EJBLocalObject"],
  "eferences": [],
  "publicConstants": [],
  "publicFunctions": []
}`;

      const result = parseAndValidateLLMJson(
        problematicJson,
        { resource: "test-resource", purpose: LLMPurpose.COMPLETIONS, modelKey: "test-model" },
        {
          outputFormat: LLMOutputFormat.JSON,
        },
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeDefined();
        // Check high-level sanitizer was applied
        expect(result.pipelineSteps).toContain("Fixed property and value syntax");
        // Check low-level mutation steps contain property name fixes
        expect(result.repairs.some((s) => s.includes("PropertyNameFixer"))).toBe(true);
      }
    });
  });
});
