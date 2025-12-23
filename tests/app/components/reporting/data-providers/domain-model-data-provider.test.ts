import "reflect-metadata";
import { DomainModelDataProvider } from "../../../../../src/app/components/reporting/sections/advanced-data/domain-model-data-provider";
import type { AppSummaryNameDescArray } from "../../../../../src/app/repositories/app-summaries/app-summaries.model";

describe("DomainModelDataProvider", () => {
  let provider: DomainModelDataProvider;

  beforeEach(() => {
    provider = new DomainModelDataProvider();
  });

  describe("getDomainModelData", () => {
    it("should correctly group aggregates using explicit aggregates array from bounded contexts", () => {
      const categorizedData = [
        {
          category: "boundedContexts",
          label: "Bounded Contexts",
          data: [
            {
              name: "Order Management",
              description: "Handles order lifecycle and processing",
              aggregates: ["OrderAggregate", "PaymentAggregate"],
            },
            {
              name: "Inventory",
              description: "Manages inventory and stock levels",
              aggregates: ["InventoryAggregate"],
            },
          ] as AppSummaryNameDescArray,
        },
        {
          category: "aggregates",
          label: "Aggregates",
          data: [
            {
              name: "OrderAggregate",
              description: "Order aggregate description",
              entities: ["Order", "OrderItem"],
              repository: "OrderRepository",
            },
            {
              name: "PaymentAggregate",
              description: "Payment aggregate description",
              entities: ["Payment"],
              repository: "PaymentRepository",
            },
            {
              name: "InventoryAggregate",
              description: "Inventory aggregate description",
              entities: ["InventoryItem", "StockLevel"],
              repository: "InventoryRepository",
            },
          ] as AppSummaryNameDescArray,
        },
        {
          category: "entities",
          label: "Entities",
          data: [
            { name: "Order", description: "Order entity" },
            { name: "OrderItem", description: "Order item entity" },
            { name: "Payment", description: "Payment entity" },
            { name: "InventoryItem", description: "Inventory item entity" },
            { name: "StockLevel", description: "Stock level entity" },
          ] as AppSummaryNameDescArray,
        },
        {
          category: "repositories",
          label: "Repositories",
          data: [
            { name: "OrderRepository", description: "Order repository" },
            { name: "PaymentRepository", description: "Payment repository" },
            { name: "InventoryRepository", description: "Inventory repository" },
          ] as AppSummaryNameDescArray,
        },
      ];

      const result = provider.getDomainModelData(categorizedData);

      // Check Order Management bounded context
      const orderContext = result.boundedContexts.find((bc) => bc.name === "Order Management");
      expect(orderContext).toBeDefined();
      expect(orderContext!.aggregates).toHaveLength(2);
      expect(orderContext!.aggregates.map((a) => a.name)).toEqual(
        expect.arrayContaining(["OrderAggregate", "PaymentAggregate"]),
      );
      expect(orderContext!.entities).toHaveLength(3); // Order, OrderItem, Payment
      expect(orderContext!.entities.map((e) => e.name)).toEqual(
        expect.arrayContaining(["Order", "OrderItem", "Payment"]),
      );
      expect(orderContext!.repositories).toHaveLength(2);
      expect(orderContext!.repositories.map((r) => r.name)).toEqual(
        expect.arrayContaining(["OrderRepository", "PaymentRepository"]),
      );

      // Check Inventory bounded context
      const inventoryContext = result.boundedContexts.find((bc) => bc.name === "Inventory");
      expect(inventoryContext).toBeDefined();
      expect(inventoryContext!.aggregates).toHaveLength(1);
      expect(inventoryContext!.aggregates[0].name).toBe("InventoryAggregate");
      expect(inventoryContext!.entities).toHaveLength(2); // InventoryItem, StockLevel
      expect(inventoryContext!.repositories).toHaveLength(1);
      expect(inventoryContext!.repositories[0].name).toBe("InventoryRepository");
    });

    it("should derive entities from aggregate relationships", () => {
      const categorizedData = [
        {
          category: "boundedContexts",
          label: "Bounded Contexts",
          data: [
            {
              name: "User Management",
              description: "Handles user accounts",
              aggregates: ["UserAggregate"],
            },
          ] as AppSummaryNameDescArray,
        },
        {
          category: "aggregates",
          label: "Aggregates",
          data: [
            {
              name: "UserAggregate",
              description: "User aggregate",
              entities: ["User", "UserProfile", "UserPreferences"],
              repository: "UserRepository",
            },
          ] as AppSummaryNameDescArray,
        },
        {
          category: "entities",
          label: "Entities",
          data: [
            { name: "User", description: "User entity" },
            { name: "UserProfile", description: "User profile entity" },
            { name: "UserPreferences", description: "User preferences entity" },
            { name: "UnrelatedEntity", description: "Entity not linked to any aggregate" },
          ] as AppSummaryNameDescArray,
        },
        {
          category: "repositories",
          label: "Repositories",
          data: [
            { name: "UserRepository", description: "User repository" },
          ] as AppSummaryNameDescArray,
        },
      ];

      const result = provider.getDomainModelData(categorizedData);

      const userContext = result.boundedContexts[0];
      // Should only include entities that are in the aggregate's entities array
      expect(userContext.entities).toHaveLength(3);
      expect(userContext.entities.map((e) => e.name)).toEqual(
        expect.arrayContaining(["User", "UserProfile", "UserPreferences"]),
      );
      // UnrelatedEntity should not be included
      expect(userContext.entities.map((e) => e.name)).not.toContain("UnrelatedEntity");
    });

    it("should handle bounded context with empty aggregates array", () => {
      const categorizedData = [
        {
          category: "boundedContexts",
          label: "Bounded Contexts",
          data: [
            {
              name: "Empty Context",
              description: "A context with no aggregates",
              aggregates: [],
            },
          ] as AppSummaryNameDescArray,
        },
        {
          category: "aggregates",
          label: "Aggregates",
          data: [
            {
              name: "SomeAggregate",
              description: "An aggregate",
              entities: ["SomeEntity"],
              repository: "SomeRepository",
            },
          ] as AppSummaryNameDescArray,
        },
        {
          category: "entities",
          label: "Entities",
          data: [{ name: "SomeEntity", description: "Some entity" }] as AppSummaryNameDescArray,
        },
        {
          category: "repositories",
          label: "Repositories",
          data: [
            { name: "SomeRepository", description: "Some repository" },
          ] as AppSummaryNameDescArray,
        },
      ];

      const result = provider.getDomainModelData(categorizedData);

      const emptyContext = result.boundedContexts[0];
      expect(emptyContext.aggregates).toHaveLength(0);
      expect(emptyContext.entities).toHaveLength(0);
      expect(emptyContext.repositories).toHaveLength(0);
    });

    it("should handle missing bounded contexts data gracefully", () => {
      const categorizedData = [
        {
          category: "aggregates",
          label: "Aggregates",
          data: [
            {
              name: "OrderAggregate",
              description: "Order aggregate",
              entities: ["Order"],
              repository: "OrderRepository",
            },
          ] as AppSummaryNameDescArray,
        },
        {
          category: "entities",
          label: "Entities",
          data: [{ name: "Order", description: "Order entity" }] as AppSummaryNameDescArray,
        },
        {
          category: "repositories",
          label: "Repositories",
          data: [
            { name: "OrderRepository", description: "Order repository" },
          ] as AppSummaryNameDescArray,
        },
      ];

      const result = provider.getDomainModelData(categorizedData);

      expect(result.boundedContexts).toHaveLength(0);
      // All aggregates, entities, and repositories should still be returned at top level
      expect(result.aggregates).toHaveLength(1);
      expect(result.entities).toHaveLength(1);
      expect(result.repositories).toHaveLength(1);
    });

    it("should handle bounded context without aggregates property (legacy data)", () => {
      const categorizedData = [
        {
          category: "boundedContexts",
          label: "Bounded Contexts",
          data: [
            {
              name: "Legacy Context",
              description: "A context without aggregates property",
              // No aggregates property - simulating legacy data
            },
          ] as AppSummaryNameDescArray,
        },
        {
          category: "aggregates",
          label: "Aggregates",
          data: [
            {
              name: "SomeAggregate",
              description: "An aggregate",
              entities: ["SomeEntity"],
              repository: "SomeRepository",
            },
          ] as AppSummaryNameDescArray,
        },
        {
          category: "entities",
          label: "Entities",
          data: [{ name: "SomeEntity", description: "Some entity" }] as AppSummaryNameDescArray,
        },
        {
          category: "repositories",
          label: "Repositories",
          data: [
            { name: "SomeRepository", description: "Some repository" },
          ] as AppSummaryNameDescArray,
        },
      ];

      const result = provider.getDomainModelData(categorizedData);

      const legacyContext = result.boundedContexts[0];
      // Should handle missing aggregates property gracefully
      expect(legacyContext.aggregates).toHaveLength(0);
      expect(legacyContext.entities).toHaveLength(0);
      expect(legacyContext.repositories).toHaveLength(0);
    });

    it("should link repositories via aggregates", () => {
      const categorizedData = [
        {
          category: "boundedContexts",
          label: "Bounded Contexts",
          data: [
            {
              name: "Sales",
              description: "Sales context",
              aggregates: ["CustomerAggregate", "OrderAggregate"],
            },
          ] as AppSummaryNameDescArray,
        },
        {
          category: "aggregates",
          label: "Aggregates",
          data: [
            {
              name: "CustomerAggregate",
              description: "Customer aggregate",
              entities: ["Customer"],
              repository: "CustomerRepository",
            },
            {
              name: "OrderAggregate",
              description: "Order aggregate",
              entities: ["Order"],
              repository: "OrderRepository",
            },
            {
              name: "UnrelatedAggregate",
              description: "Unrelated aggregate",
              entities: ["Unrelated"],
              repository: "UnrelatedRepository",
            },
          ] as AppSummaryNameDescArray,
        },
        {
          category: "entities",
          label: "Entities",
          data: [
            { name: "Customer", description: "Customer entity" },
            { name: "Order", description: "Order entity" },
            { name: "Unrelated", description: "Unrelated entity" },
          ] as AppSummaryNameDescArray,
        },
        {
          category: "repositories",
          label: "Repositories",
          data: [
            { name: "CustomerRepository", description: "Customer repository" },
            { name: "OrderRepository", description: "Order repository" },
            { name: "UnrelatedRepository", description: "Unrelated repository" },
          ] as AppSummaryNameDescArray,
        },
      ];

      const result = provider.getDomainModelData(categorizedData);

      const salesContext = result.boundedContexts[0];
      expect(salesContext.repositories).toHaveLength(2);
      expect(salesContext.repositories.map((r) => r.name)).toEqual(
        expect.arrayContaining(["CustomerRepository", "OrderRepository"]),
      );
      // UnrelatedRepository should not be included
      expect(salesContext.repositories.map((r) => r.name)).not.toContain("UnrelatedRepository");
    });

    it("should extract repositories from aggregates when no repositories category exists", () => {
      const categorizedData = [
        {
          category: "boundedContexts",
          label: "Bounded Contexts",
          data: [
            {
              name: "Test Context",
              description: "Test context",
              aggregates: ["TestAggregate"],
            },
          ] as AppSummaryNameDescArray,
        },
        {
          category: "aggregates",
          label: "Aggregates",
          data: [
            {
              name: "TestAggregate",
              description: "Test aggregate",
              entities: ["TestEntity"],
              repository: "TestRepository",
            },
          ] as AppSummaryNameDescArray,
        },
        {
          category: "entities",
          label: "Entities",
          data: [{ name: "TestEntity", description: "Test entity" }] as AppSummaryNameDescArray,
        },
        // No repositories category
      ];

      const result = provider.getDomainModelData(categorizedData);

      // Repositories should be extracted from aggregates
      expect(result.repositories).toHaveLength(1);
      expect(result.repositories[0].name).toBe("TestRepository");
      expect(result.repositories[0].description).toBe("Repository for TestAggregate");

      // Bounded context should also get the repository
      const testContext = result.boundedContexts[0];
      expect(testContext.repositories).toHaveLength(1);
      expect(testContext.repositories[0].name).toBe("TestRepository");
    });

    it("should return all data at top level regardless of bounded context grouping", () => {
      const categorizedData = [
        {
          category: "boundedContexts",
          label: "Bounded Contexts",
          data: [
            {
              name: "Context A",
              description: "Context A description",
              aggregates: ["AggregateA"],
            },
          ] as AppSummaryNameDescArray,
        },
        {
          category: "aggregates",
          label: "Aggregates",
          data: [
            {
              name: "AggregateA",
              description: "Aggregate A",
              entities: ["EntityA"],
              repository: "RepositoryA",
            },
            {
              name: "AggregateB",
              description: "Aggregate B not in any context",
              entities: ["EntityB"],
              repository: "RepositoryB",
            },
          ] as AppSummaryNameDescArray,
        },
        {
          category: "entities",
          label: "Entities",
          data: [
            { name: "EntityA", description: "Entity A" },
            { name: "EntityB", description: "Entity B" },
          ] as AppSummaryNameDescArray,
        },
        {
          category: "repositories",
          label: "Repositories",
          data: [
            { name: "RepositoryA", description: "Repository A" },
            { name: "RepositoryB", description: "Repository B" },
          ] as AppSummaryNameDescArray,
        },
      ];

      const result = provider.getDomainModelData(categorizedData);

      // Top-level should contain all items regardless of context grouping
      expect(result.aggregates).toHaveLength(2);
      expect(result.entities).toHaveLength(2);
      expect(result.repositories).toHaveLength(2);

      // Context A should only have AggregateA and its related items
      const contextA = result.boundedContexts[0];
      expect(contextA.aggregates).toHaveLength(1);
      expect(contextA.aggregates[0].name).toBe("AggregateA");
    });
  });
});
