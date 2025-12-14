import { z } from "zod";
import {
  appSummaryCategorySchemas,
  AppSummaryCategorySchemas,
  AppSummaryCategories,
  appDescriptionSchema,
  technologiesSchema,
  businessProcessesSchema,
  boundedContextsSchema,
  aggregatesSchema,
  entitiesSchema,
  repositoriesSchema,
  potentialMicroservicesSchema,
} from "../../src/schemas/app-summaries.schema";

describe("appSummaryCategorySchemas", () => {
  describe("mapping completeness", () => {
    it("should have an entry for every category in AppSummaryCategories", () => {
      const allCategories = AppSummaryCategories.options;
      const mappedCategories = Object.keys(appSummaryCategorySchemas);

      expect(mappedCategories).toHaveLength(allCategories.length);
      for (const category of allCategories) {
        expect(appSummaryCategorySchemas).toHaveProperty(category);
      }
    });

    it("should map each category to the correct schema", () => {
      expect(appSummaryCategorySchemas.appDescription).toBe(appDescriptionSchema);
      expect(appSummaryCategorySchemas.technologies).toBe(technologiesSchema);
      expect(appSummaryCategorySchemas.businessProcesses).toBe(businessProcessesSchema);
      expect(appSummaryCategorySchemas.boundedContexts).toBe(boundedContextsSchema);
      expect(appSummaryCategorySchemas.aggregates).toBe(aggregatesSchema);
      expect(appSummaryCategorySchemas.entities).toBe(entitiesSchema);
      expect(appSummaryCategorySchemas.repositories).toBe(repositoriesSchema);
      expect(appSummaryCategorySchemas.potentialMicroservices).toBe(potentialMicroservicesSchema);
    });
  });

  describe("schema types", () => {
    it("should have all entries as Zod object schemas", () => {
      for (const [_category, schema] of Object.entries(appSummaryCategorySchemas)) {
        expect(schema).toBeInstanceOf(z.ZodObject);
        expect(schema._def.typeName).toBe("ZodObject");
      }
    });

    it("should have each schema with the correct top-level key", () => {
      // appDescription has 'appDescription' key
      expect(appSummaryCategorySchemas.appDescription.shape).toHaveProperty("appDescription");

      // technologies has 'technologies' key
      expect(appSummaryCategorySchemas.technologies.shape).toHaveProperty("technologies");

      // businessProcesses has 'businessProcesses' key
      expect(appSummaryCategorySchemas.businessProcesses.shape).toHaveProperty("businessProcesses");

      // boundedContexts has 'boundedContexts' key
      expect(appSummaryCategorySchemas.boundedContexts.shape).toHaveProperty("boundedContexts");

      // aggregates has 'aggregates' key
      expect(appSummaryCategorySchemas.aggregates.shape).toHaveProperty("aggregates");

      // entities has 'entities' key
      expect(appSummaryCategorySchemas.entities.shape).toHaveProperty("entities");

      // repositories has 'repositories' key
      expect(appSummaryCategorySchemas.repositories.shape).toHaveProperty("repositories");

      // potentialMicroservices has 'potentialMicroservices' key
      expect(appSummaryCategorySchemas.potentialMicroservices.shape).toHaveProperty(
        "potentialMicroservices",
      );
    });
  });

  describe("type inference", () => {
    // These tests verify that TypeScript correctly infers types at compile time.
    // They use type assertions to ensure the inference is working as expected.

    it("should infer correct type for appDescription", () => {
      type InferredType = z.infer<AppSummaryCategorySchemas["appDescription"]>;

      // Type assertion test - this would fail to compile if types don't match
      const validData: InferredType = { appDescription: "Test description" };
      expect(validData.appDescription).toBe("Test description");
    });

    it("should infer correct type for technologies", () => {
      type InferredType = z.infer<AppSummaryCategorySchemas["technologies"]>;

      const validData: InferredType = {
        technologies: [{ name: "TypeScript", description: "A typed superset of JavaScript" }],
      };
      expect(validData.technologies).toHaveLength(1);
      expect(validData.technologies[0].name).toBe("TypeScript");
    });

    it("should infer correct type for entities", () => {
      type InferredType = z.infer<AppSummaryCategorySchemas["entities"]>;

      const validData: InferredType = {
        entities: [{ name: "User", description: "Represents a user in the system" }],
      };
      expect(validData.entities).toHaveLength(1);
      expect(validData.entities[0].name).toBe("User");
    });

    it("should infer correct type for aggregates", () => {
      type InferredType = z.infer<AppSummaryCategorySchemas["aggregates"]>;

      const validData: InferredType = {
        aggregates: [
          {
            name: "OrderAggregate",
            description: "Handles order-related business logic",
            entities: ["Order", "OrderItem"],
            repository: "OrderRepository",
          },
        ],
      };
      expect(validData.aggregates).toHaveLength(1);
      expect(validData.aggregates[0].entities).toContain("Order");
    });

    it("should infer correct type for potentialMicroservices", () => {
      type InferredType = z.infer<AppSummaryCategorySchemas["potentialMicroservices"]>;

      const validData: InferredType = {
        potentialMicroservices: [
          {
            name: "UserService",
            description: "Handles user management",
            entities: [{ name: "User", description: "User entity" }],
            endpoints: [{ path: "/users", method: "GET", description: "Get all users" }],
            operations: [{ operation: "CreateUser", method: "POST", description: "Create a user" }],
          },
        ],
      };
      expect(validData.potentialMicroservices).toHaveLength(1);
      expect(validData.potentialMicroservices[0].name).toBe("UserService");
    });
  });

  describe("schema validation", () => {
    it("should validate valid appDescription data", () => {
      const result = appSummaryCategorySchemas.appDescription.safeParse({
        appDescription: "This is a test application description.",
      });
      expect(result.success).toBe(true);
    });

    it("should reject invalid appDescription data", () => {
      const result = appSummaryCategorySchemas.appDescription.safeParse({
        appDescription: 123, // Should be string
      });
      expect(result.success).toBe(false);
    });

    it("should validate valid technologies data", () => {
      const result = appSummaryCategorySchemas.technologies.safeParse({
        technologies: [
          { name: "Node.js", description: "JavaScript runtime" },
          { name: "TypeScript", description: "Typed JavaScript" },
        ],
      });
      expect(result.success).toBe(true);
    });

    it("should reject technologies with missing required fields", () => {
      const result = appSummaryCategorySchemas.technologies.safeParse({
        technologies: [{ name: "Node.js" }], // Missing description
      });
      expect(result.success).toBe(false);
    });

    it("should validate valid entities data with optional fields", () => {
      const result = appSummaryCategorySchemas.entities.safeParse({
        entities: [
          {
            name: "User",
            description: "User entity description",
            relatedEntities: ["Order", "Profile"], // Optional field
          },
        ],
      });
      expect(result.success).toBe(true);
    });
  });

  describe("const assertion", () => {
    it("should be a const object (immutable at type level)", () => {
      // The 'as const' assertion ensures the object is readonly at type level
      // This test verifies the object exists and has the expected structure
      expect(typeof appSummaryCategorySchemas).toBe("object");
      expect(Object.isFrozen(appSummaryCategorySchemas)).toBe(false); // Not frozen at runtime
      // But TypeScript treats it as readonly due to 'as const'
    });
  });
});
