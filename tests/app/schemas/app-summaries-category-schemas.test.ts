import { z } from "zod";
import {
  appSummaryCategorySchemas,
  AppSummaryCategorySchemas,
  AppSummaryCategories,
  appDescriptionSchema,
  technologiesSchema,
  businessProcessesSchema,
  boundedContextsSchema,
  hierarchicalBoundedContextSchema,
  nestedAggregateSchema,
  nestedEntitySchema,
  nestedRepositorySchema,
  potentialMicroservicesSchema,
  inferredArchitectureSchema,
} from "../../../src/app/schemas/app-summaries.schema";

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
      expect(appSummaryCategorySchemas.potentialMicroservices).toBe(potentialMicroservicesSchema);
      expect(appSummaryCategorySchemas.inferredArchitecture).toBe(inferredArchitectureSchema);
    });

    it("should not include aggregates, entities, or repositories as separate categories", () => {
      // These are now nested within boundedContexts
      expect(AppSummaryCategories.options).not.toContain("aggregates");
      expect(AppSummaryCategories.options).not.toContain("entities");
      expect(AppSummaryCategories.options).not.toContain("repositories");
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

      // potentialMicroservices has 'potentialMicroservices' key
      expect(appSummaryCategorySchemas.potentialMicroservices.shape).toHaveProperty(
        "potentialMicroservices",
      );

      // inferredArchitecture has 'inferredArchitecture' key
      expect(appSummaryCategorySchemas.inferredArchitecture.shape).toHaveProperty(
        "inferredArchitecture",
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

    it("should infer correct type for hierarchical boundedContexts", () => {
      type InferredType = z.infer<AppSummaryCategorySchemas["boundedContexts"]>;

      const validData: InferredType = {
        boundedContexts: [
          {
            name: "Order Management",
            description: "Handles order lifecycle and processing",
            aggregates: [
              {
                name: "OrderAggregate",
                description: "Handles order business logic",
                repository: {
                  name: "OrderRepository",
                  description: "Persists order data",
                },
                entities: [
                  { name: "Order", description: "Order entity" },
                  { name: "OrderItem", description: "Order item entity" },
                ],
              },
            ],
          },
        ],
      };
      expect(validData.boundedContexts).toHaveLength(1);
      expect(validData.boundedContexts[0].aggregates[0].entities).toHaveLength(2);
      expect(validData.boundedContexts[0].aggregates[0].repository.name).toBe("OrderRepository");
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

    it("should infer correct type for inferredArchitecture", () => {
      type InferredType = z.infer<AppSummaryCategorySchemas["inferredArchitecture"]>;

      const validData: InferredType = {
        inferredArchitecture: {
          internalComponents: [{ name: "Order Manager", description: "Handles order operations" }],
          externalDependencies: [
            { name: "PostgreSQL", type: "Database", description: "Primary database" },
          ],
          dependencies: [
            { from: "Order Manager", to: "PostgreSQL", description: "Persists order data" },
          ],
        },
      };
      expect(validData.inferredArchitecture.internalComponents).toHaveLength(1);
      expect(validData.inferredArchitecture.externalDependencies).toHaveLength(1);
      expect(validData.inferredArchitecture.dependencies).toHaveLength(1);
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
          { name: "Node.ts", description: "JavaScript runtime" },
          { name: "TypeScript", description: "Typed JavaScript" },
        ],
      });
      expect(result.success).toBe(true);
    });

    it("should reject technologies with missing required fields", () => {
      const result = appSummaryCategorySchemas.technologies.safeParse({
        technologies: [{ name: "Node.ts" }], // Missing description
      });
      expect(result.success).toBe(false);
    });

    it("should validate hierarchical bounded context with all nested elements", () => {
      const result = appSummaryCategorySchemas.boundedContexts.safeParse({
        boundedContexts: [
          {
            name: "Order Management",
            description: "Handles order lifecycle",
            aggregates: [
              {
                name: "OrderAggregate",
                description: "Order aggregate root",
                repository: {
                  name: "OrderRepository",
                  description: "Repository for orders",
                },
                entities: [
                  { name: "Order", description: "Order entity" },
                  { name: "OrderItem", description: "Order item entity" },
                ],
              },
            ],
          },
        ],
      });
      expect(result.success).toBe(true);
    });

    it("should reject aggregate missing required repository", () => {
      const result = appSummaryCategorySchemas.boundedContexts.safeParse({
        boundedContexts: [
          {
            name: "Order Management",
            description: "Handles order lifecycle",
            aggregates: [
              {
                name: "OrderAggregate",
                description: "Order aggregate root",
                // Missing repository
                entities: [],
              },
            ],
          },
        ],
      });
      expect(result.success).toBe(false);
    });

    it("should validate bounded context with empty aggregates array", () => {
      const result = appSummaryCategorySchemas.boundedContexts.safeParse({
        boundedContexts: [
          {
            name: "Empty Context",
            description: "A bounded context with no aggregates yet",
            aggregates: [],
          },
        ],
      });
      expect(result.success).toBe(true);
    });
  });

  describe("hierarchicalBoundedContextSchema", () => {
    it("should have required aggregates field (repository is now at aggregate level)", () => {
      expect(hierarchicalBoundedContextSchema.shape).toHaveProperty("aggregates");
      // repository is now at aggregate level, not bounded context level
      expect(hierarchicalBoundedContextSchema.shape).not.toHaveProperty("repository");
    });

    it("should validate a complete hierarchical bounded context", () => {
      const result = hierarchicalBoundedContextSchema.safeParse({
        name: "Order Management",
        description: "Handles order lifecycle and processing workflows",
        aggregates: [
          {
            name: "OrderAggregate",
            description: "Root aggregate for orders",
            repository: {
              name: "OrderRepository",
              description: "Persists order aggregate data",
            },
            entities: [
              { name: "Order", description: "The main order entity" },
              { name: "OrderItem", description: "Line items in an order" },
            ],
          },
        ],
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.aggregates).toHaveLength(1);
        expect(result.data.aggregates[0].entities).toHaveLength(2);
        expect(result.data.aggregates[0].repository.name).toBe("OrderRepository");
      }
    });
  });

  describe("nestedAggregateSchema", () => {
    it("should validate aggregate with repository and entities", () => {
      const result = nestedAggregateSchema.safeParse({
        name: "OrderAggregate",
        description: "Aggregate for order management",
        repository: {
          name: "OrderRepository",
          description: "Repository for order aggregate",
        },
        entities: [
          { name: "Order", description: "Order entity" },
          { name: "OrderItem", description: "Order item entity" },
        ],
      });
      expect(result.success).toBe(true);
    });

    it("should validate aggregate with empty entities", () => {
      const result = nestedAggregateSchema.safeParse({
        name: "EmptyAggregate",
        description: "Aggregate with no entities",
        repository: {
          name: "EmptyRepository",
          description: "Repository for empty aggregate",
        },
        entities: [],
      });
      expect(result.success).toBe(true);
    });
  });

  describe("nestedEntitySchema", () => {
    it("should validate entity with name and description", () => {
      const result = nestedEntitySchema.safeParse({
        name: "Order",
        description: "Order entity description",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("nestedRepositorySchema", () => {
    it("should validate repository", () => {
      const result = nestedRepositorySchema.safeParse({
        name: "OrderRepository",
        description: "Repository for order persistence",
      });
      expect(result.success).toBe(true);
    });

    it("should reject repository with missing description", () => {
      const result = nestedRepositorySchema.safeParse({
        name: "OrderRepository",
      });
      expect(result.success).toBe(false);
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
