import "reflect-metadata";
import { summarizeFile } from "../../../src/components/capture/file-summarizer";
import LLMRouter from "../../../src/llm/llm-router";
import { BadResponseContentLLMError } from "../../../src/llm/types/llm-errors.types";
import { sourceSummarySchema } from "../../../src/schemas/sources.schema";

// Mock dependencies
jest.mock("../../../src/llm/llm-router");
jest.mock("../../../src/common/utils/logging", () => ({
  logErrorMsg: jest.fn(),
  logError: jest.fn(),
  logOneLineWarning: jest.fn(),
}));

/**
 * Test suite specifically for the runtime schema validation improvement
 * in file-summarizer.ts. This verifies that the function validates the
 * LLM response against the full schema, not just the subset used in prompts.
 */
describe("File Summarizer - Schema Validation Improvements", () => {
  let mockLLMRouter: jest.Mocked<LLMRouter>;

  beforeEach(() => {
    jest.clearAllMocks();
    // Create a mock with flexible typing for test purposes
    const mockExecuteCompletion = jest.fn() as any;
    mockLLMRouter = {
      executeCompletion: mockExecuteCompletion,
    } as any;
  });

  describe("Runtime Schema Validation", () => {
    test("should validate response against full sourceSummarySchema", async () => {
      // Valid response with all required fields
      const validResponse = {
        purpose: "This is a detailed file purpose that meets the minimum length requirement",
        implementation:
          "This is a detailed implementation description with business logic and sufficient detail",
        databaseIntegration: {
          mechanism: "NONE",
          description: "No database integration",
          codeExample: "n/a",
        },
      };

      (mockLLMRouter.executeCompletion as any).mockResolvedValue(validResponse);

      const result = await summarizeFile(
        mockLLMRouter,
        "TestFile.java",
        "java",
        "public class TestFile {}",
      );

      expect(result).toEqual(validResponse);
      expect(sourceSummarySchema.safeParse(result).success).toBe(true);
    });

    test("should reject response missing required purpose field", async () => {
      const invalidResponse = {
        // Missing 'purpose' field
        implementation: "Implementation details",
      };

      (mockLLMRouter.executeCompletion as any).mockResolvedValue(invalidResponse);

      await expect(
        summarizeFile(mockLLMRouter, "TestFile.java", "java", "public class TestFile {}"),
      ).rejects.toThrow(BadResponseContentLLMError);
    });

    test("should reject response missing required implementation field", async () => {
      const invalidResponse = {
        purpose: "File purpose",
        // Missing 'implementation' field
      };

      (mockLLMRouter.executeCompletion as any).mockResolvedValue(invalidResponse);

      await expect(
        summarizeFile(mockLLMRouter, "TestFile.java", "java", "public class TestFile {}"),
      ).rejects.toThrow(BadResponseContentLLMError);
    });

    test("should accept response with optional fields", async () => {
      const responseWithOptionals = {
        purpose: "Detailed file purpose with sufficient explanation of what the file does",
        implementation: "Detailed implementation with business logic and technical details",
        name: "TestClass",
        namespace: "com.example.test.TestClass",
        kind: "CLASS",
        internalReferences: ["com.example.util.Helper"],
        externalReferences: ["org.springframework.Component"],
      };

      (mockLLMRouter.executeCompletion as any).mockResolvedValue(responseWithOptionals);

      const result = await summarizeFile(
        mockLLMRouter,
        "TestFile.java",
        "java",
        "public class TestFile {}",
      );

      expect(result).toEqual(responseWithOptionals);
      expect(result.name).toBe("TestClass");
      expect(result.namespace).toBe("com.example.test.TestClass");
      expect(result.internalReferences).toEqual(["com.example.util.Helper"]);
    });

    test("should validate nested schema objects", async () => {
      const responseWithNestedObjects = {
        purpose: "File with database integration and public methods",
        implementation: "Implementation using JPA for database access and business logic",
        databaseIntegration: {
          mechanism: "JPA",
          name: "UserRepository",
          description: "JPA repository for user entity management",
          tablesAccessed: ["users", "user_roles"],
          operationType: ["READ", "WRITE", "DDL"],
          codeExample: "@Repository interface UserRepository extends JpaRepository<User, Long> {}",
        },
        publicMethods: [
          {
            name: "findUserById",
            purpose:
              "Finds a user by their unique identifier from the database with error handling",
            parameters: [{ name: "id", type: "Long" }],
            returnType: "Optional<User>",
            description: "Uses Spring Data JPA repository method to query the database",
          },
        ],
      };

      (mockLLMRouter.executeCompletion as any).mockResolvedValue(responseWithNestedObjects);

      const result = await summarizeFile(
        mockLLMRouter,
        "UserRepository.java",
        "java",
        "public interface UserRepository {}",
      );

      expect(result).toEqual(responseWithNestedObjects);
      expect(result.databaseIntegration?.mechanism).toBe("JPA");
      expect(result.publicMethods).toHaveLength(1);
      expect(result.publicMethods?.[0].name).toBe("findUserById");
    });

    test("should reject response with invalid nested object structure", async () => {
      const invalidNestedResponse = {
        purpose: "File with invalid database integration",
        implementation: "Implementation details",
        databaseIntegration: {
          // Missing required 'mechanism' field
          description: "Invalid database integration",
          // Missing required 'codeExample' field
        },
      };

      (mockLLMRouter.executeCompletion as any).mockResolvedValue(invalidNestedResponse);

      await expect(
        summarizeFile(mockLLMRouter, "TestFile.java", "java", "public class TestFile {}"),
      ).rejects.toThrow(BadResponseContentLLMError);
    });

    test("should handle array fields with proper validation", async () => {
      const responseWithArrays = {
        purpose: "File with multiple dependencies and constants",
        implementation: "Implementation managing application dependencies and configuration",
        dependencies: [
          {
            name: "spring-boot-starter-web",
            groupId: "org.springframework.boot",
            version: "3.0.0",
            scope: "compile",
          },
          {
            name: "lombok",
            groupId: "org.projectlombok",
            version: "1.18.24",
            scope: "provided",
          },
        ],
        publicConstants: [
          {
            name: "API_VERSION",
            value: "1.0",
            type: "String",
          },
        ],
      };

      (mockLLMRouter.executeCompletion as any).mockResolvedValue(responseWithArrays);

      const result = await summarizeFile(mockLLMRouter, "pom.xml", "xml", "<project></project>");

      expect(result).toEqual(responseWithArrays);
      expect(result.dependencies).toHaveLength(2);
      expect(result.publicConstants).toHaveLength(1);
    });

    test("should provide meaningful error message on validation failure", async () => {
      const invalidResponse = {
        purpose: "Test",
        implementation: "Test implementation",
        publicMethods: [
          {
            name: "testMethod",
            // Missing required 'purpose' field in method
            returnType: "void",
            description: "Test description",
          },
        ],
      };

      (mockLLMRouter.executeCompletion as any).mockResolvedValue(invalidResponse);

      try {
        await summarizeFile(mockLLMRouter, "TestFile.java", "java", "public class TestFile {}");
        fail("Should have thrown BadResponseContentLLMError");
      } catch (error) {
        expect(error).toBeInstanceOf(BadResponseContentLLMError);
        if (error instanceof BadResponseContentLLMError) {
          expect(error.message).toContain("did not conform to the full sourceSummarySchema");
        }
      }
    });
  });

  describe("Type Safety with Schema Subsets", () => {
    test("should ensure return type matches full schema, not subset", async () => {
      // This test verifies that even though prompts may use schema subsets,
      // the function returns data conforming to the full schema
      const fullSchemaResponse = {
        purpose: "Comprehensive file purpose with all required details",
        implementation: "Complete implementation description with business logic details",
        name: "CompleteClass",
        namespace: "com.example.CompleteClass",
        kind: "CLASS",
        internalReferences: ["com.example.internal.Dependency"],
        externalReferences: ["org.springframework.stereotype.Component"],
        publicMethods: [
          {
            name: "execute",
            purpose: "Executes the main business logic with proper error handling and validation",
            parameters: [],
            returnType: "void",
            description: "Main execution method implementing the core business logic",
          },
        ],
        databaseIntegration: {
          mechanism: "NONE",
          description: "No database integration in this component",
          codeExample: "n/a",
        },
      };

      (mockLLMRouter.executeCompletion as any).mockResolvedValue(fullSchemaResponse);

      const result = await summarizeFile(
        mockLLMRouter,
        "CompleteClass.java",
        "java",
        "public class CompleteClass {}",
      );

      // Verify the result conforms to the full schema
      const validation = sourceSummarySchema.safeParse(result);
      expect(validation.success).toBe(true);

      // Verify all fields are accessible with proper types
      expect(result.purpose).toBeDefined();
      expect(result.implementation).toBeDefined();
      expect(result.name).toBe("CompleteClass");
      expect(result.namespace).toBe("com.example.CompleteClass");
      expect(result.publicMethods).toHaveLength(1);
      expect(result.databaseIntegration?.mechanism).toBe("NONE");
    });

    test("should catch when subset schema allows but full schema rejects", async () => {
      // This scenario tests the critical improvement: catching cases where
      // a picked subset might be valid but the full schema would reject it
      const subsetValidFullInvalid = {
        purpose: "Purpose text",
        implementation: "Implementation text",
        // Some picked schemas might not require all fields,
        // but the full schema has additional constraints
        publicMethods: [
          {
            name: "invalidMethod",
            // Missing 'purpose' - might be optional in subset but required in full
            returnType: "void",
            description: "Description",
          },
        ],
      };

      (mockLLMRouter.executeCompletion as any).mockResolvedValue(subsetValidFullInvalid);

      await expect(
        summarizeFile(mockLLMRouter, "TestFile.java", "java", "public class TestFile {}"),
      ).rejects.toThrow(BadResponseContentLLMError);
    });
  });

  describe("Backward Compatibility", () => {
    test("should maintain same external API and behavior", async () => {
      // Verify that the function signature and basic behavior remain unchanged
      const standardResponse = {
        purpose: "Standard file purpose with required detail level",
        implementation: "Standard implementation with business logic description",
      };

      (mockLLMRouter.executeCompletion as any).mockResolvedValue(standardResponse);

      // Function should work exactly as before for valid responses
      const result = await summarizeFile(
        mockLLMRouter,
        "StandardFile.java",
        "java",
        "public class StandardFile {}",
      );

      expect(result).toEqual(standardResponse);
      expect(mockLLMRouter.executeCompletion).toHaveBeenCalledTimes(1);
    });

    test("should still handle empty file content error", async () => {
      await expect(
        summarizeFile(mockLLMRouter, "empty.java", "java", "   \n  \t  "),
      ).rejects.toThrow("File is empty");

      expect(mockLLMRouter.executeCompletion).not.toHaveBeenCalled();
    });

    test("should still handle null LLM response error", async () => {
      (mockLLMRouter.executeCompletion as any).mockResolvedValue(null);

      await expect(
        summarizeFile(mockLLMRouter, "TestFile.java", "java", "public class TestFile {}"),
      ).rejects.toThrow(BadResponseContentLLMError);
    });
  });
});
