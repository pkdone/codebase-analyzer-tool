import {
  inferredArchitectureSchema,
  inferredComponentSchema,
  externalDependencyComponentSchema,
  componentDependencySchema,
  appSummaryCategorySchemas,
  AppSummaryCategories,
} from "../../../src/app/schemas/app-summaries.schema";

describe("Inferred Architecture Schemas", () => {
  describe("componentDependencySchema", () => {
    it("should validate a valid component dependency", () => {
      const result = componentDependencySchema.safeParse({
        from: "Order Manager",
        to: "PostgreSQL Database",
        description: "Persists order data",
      });
      expect(result.success).toBe(true);
    });

    it("should reject a dependency missing required fields", () => {
      const result = componentDependencySchema.safeParse({
        from: "Order Manager",
        // Missing 'to' and 'description'
      });
      expect(result.success).toBe(false);
    });
  });

  describe("inferredComponentSchema", () => {
    it("should validate a valid internal component", () => {
      const result = inferredComponentSchema.safeParse({
        name: "Order Manager",
        description:
          "Handles order lifecycle operations including creation, updates, and cancellations. Integrates with payment processing and inventory systems.",
      });
      expect(result.success).toBe(true);
    });

    it("should reject a component missing name", () => {
      const result = inferredComponentSchema.safeParse({
        description: "Some description",
      });
      expect(result.success).toBe(false);
    });

    it("should reject a component missing description", () => {
      const result = inferredComponentSchema.safeParse({
        name: "Order Manager",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("externalDependencyComponentSchema", () => {
    it("should validate a valid external dependency", () => {
      const result = externalDependencyComponentSchema.safeParse({
        name: "PostgreSQL Database",
        type: "Database",
        description: "Primary data storage for order and customer data",
      });
      expect(result.success).toBe(true);
    });

    it("should validate different types of external dependencies", () => {
      const dependencies = [
        { name: "RabbitMQ", type: "Queue", description: "Message queue for async processing" },
        { name: "Stripe API", type: "API", description: "Payment processing service" },
        { name: "Redis", type: "Cache", description: "Caching layer for session data" },
      ];

      dependencies.forEach((dep) => {
        const result = externalDependencyComponentSchema.safeParse(dep);
        expect(result.success).toBe(true);
      });
    });

    it("should reject an external dependency missing type", () => {
      const result = externalDependencyComponentSchema.safeParse({
        name: "PostgreSQL",
        description: "Database storage",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("inferredArchitectureSchema", () => {
    it("should validate a complete inferred architecture", () => {
      const result = inferredArchitectureSchema.safeParse({
        inferredArchitecture: {
          internalComponents: [
            {
              name: "Order Manager",
              description: "Handles order lifecycle and business logic",
            },
            {
              name: "Customer Manager",
              description: "Manages customer data and preferences",
            },
          ],
          externalDependencies: [
            {
              name: "PostgreSQL",
              type: "Database",
              description: "Primary relational database",
            },
            {
              name: "RabbitMQ",
              type: "Queue",
              description: "Message broker for async events",
            },
          ],
          dependencies: [
            {
              from: "Order Manager",
              to: "PostgreSQL",
              description: "Persists order data",
            },
            {
              from: "Order Manager",
              to: "Customer Manager",
              description: "Fetches customer information",
            },
            {
              from: "Customer Manager",
              to: "PostgreSQL",
              description: "Persists customer data",
            },
          ],
        },
      });
      expect(result.success).toBe(true);
    });

    it("should validate an architecture with empty arrays", () => {
      const result = inferredArchitectureSchema.safeParse({
        inferredArchitecture: {
          internalComponents: [],
          externalDependencies: [],
          dependencies: [],
        },
      });
      expect(result.success).toBe(true);
    });

    it("should validate architecture with only internal components", () => {
      const result = inferredArchitectureSchema.safeParse({
        inferredArchitecture: {
          internalComponents: [
            {
              name: "Order Manager",
              description: "Handles order operations",
            },
          ],
          externalDependencies: [],
          dependencies: [],
        },
      });
      expect(result.success).toBe(true);
    });

    it("should reject architecture missing internalComponents", () => {
      const result = inferredArchitectureSchema.safeParse({
        inferredArchitecture: {
          externalDependencies: [],
          dependencies: [],
        },
      });
      expect(result.success).toBe(false);
    });

    it("should reject architecture missing the wrapper object", () => {
      const result = inferredArchitectureSchema.safeParse({
        internalComponents: [],
        externalDependencies: [],
        dependencies: [],
      });
      expect(result.success).toBe(false);
    });
  });

  describe("appSummaryCategorySchemas integration", () => {
    it("should include inferredArchitecture in the category schemas", () => {
      expect(appSummaryCategorySchemas).toHaveProperty("inferredArchitecture");
      expect(appSummaryCategorySchemas.inferredArchitecture).toBe(inferredArchitectureSchema);
    });

    it("should include inferredArchitecture in AppSummaryCategories enum", () => {
      expect(AppSummaryCategories.options).toContain("inferredArchitecture");
    });

    it("should have matching length between enum options and category schemas", () => {
      const enumOptions = AppSummaryCategories.options;
      const schemaKeys = Object.keys(appSummaryCategorySchemas);
      expect(schemaKeys.length).toBe(enumOptions.length);
    });
  });
});
