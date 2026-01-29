import "reflect-metadata";
import { DomainModelTransformer } from "../../../../../src/app/components/reporting/sections/domain-model/domain-model-transformer";
import type {
  CategorizedSectionItem,
  BoundedContextsArray,
} from "../../../../../src/app/components/reporting/data-processing";

describe("DomainModelTransformer", () => {
  let transformer: DomainModelTransformer;

  beforeEach(() => {
    transformer = new DomainModelTransformer();
  });

  describe("getDomainModelData with hierarchical bounded contexts", () => {
    it("should correctly extract hierarchical bounded context data with repository at aggregate level", () => {
      const categorizedData: CategorizedSectionItem[] = [
        {
          category: "boundedContexts",
          label: "Domain Model",
          data: [
            {
              name: "Order Management",
              description: "Handles order lifecycle and processing",
              aggregates: [
                {
                  name: "OrderAggregate",
                  description: "Order aggregate description",
                  repository: {
                    name: "OrderRepository",
                    description: "Persists order data",
                  },
                  entities: [
                    { name: "Order", description: "Order entity" },
                    { name: "OrderItem", description: "Order item entity" },
                  ],
                },
                {
                  name: "PaymentAggregate",
                  description: "Payment aggregate description",
                  repository: {
                    name: "PaymentRepository",
                    description: "Persists payment data",
                  },
                  entities: [{ name: "Payment", description: "Payment entity" }],
                },
              ],
            },
            {
              name: "Inventory",
              description: "Manages inventory and stock levels",
              aggregates: [
                {
                  name: "InventoryAggregate",
                  description: "Inventory aggregate description",
                  repository: {
                    name: "InventoryRepository",
                    description: "Persists inventory data",
                  },
                  entities: [
                    { name: "InventoryItem", description: "Inventory item entity" },
                    { name: "StockLevel", description: "Stock level entity" },
                  ],
                },
              ],
            },
          ] as BoundedContextsArray,
        },
      ];

      const result = transformer.getDomainModelData(categorizedData);

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
      expect(orderContext!.repositories).toHaveLength(2); // OrderRepository, PaymentRepository
      expect(orderContext!.repositories.map((r) => r.name)).toEqual(
        expect.arrayContaining(["OrderRepository", "PaymentRepository"]),
      );

      // Check aggregate has repository as a child
      const orderAggregate = orderContext!.aggregates.find((a) => a.name === "OrderAggregate");
      expect(orderAggregate).toBeDefined();
      expect(orderAggregate!.repository).toEqual({
        name: "OrderRepository",
        description: "Persists order data",
      });

      // Check Inventory bounded context
      const inventoryContext = result.boundedContexts.find((bc) => bc.name === "Inventory");
      expect(inventoryContext).toBeDefined();
      expect(inventoryContext!.aggregates).toHaveLength(1);
      expect(inventoryContext!.aggregates[0].name).toBe("InventoryAggregate");
      expect(inventoryContext!.aggregates[0].repository.name).toBe("InventoryRepository");
      expect(inventoryContext!.entities).toHaveLength(2); // InventoryItem, StockLevel
      expect(inventoryContext!.repositories).toHaveLength(1);
      expect(inventoryContext!.repositories[0].name).toBe("InventoryRepository");
    });

    it("should flatten aggregates with entity names as string array and repository as object", () => {
      const categorizedData: CategorizedSectionItem[] = [
        {
          category: "boundedContexts",
          label: "Domain Model",
          data: [
            {
              name: "User Management",
              description: "Handles user accounts",
              aggregates: [
                {
                  name: "UserAggregate",
                  description: "User aggregate",
                  repository: {
                    name: "UserRepository",
                    description: "User repository",
                  },
                  entities: [
                    { name: "User", description: "User entity" },
                    { name: "UserProfile", description: "User profile entity" },
                    { name: "UserPreferences", description: "User preferences entity" },
                  ],
                },
              ],
            },
          ] as BoundedContextsArray,
        },
      ];

      const result = transformer.getDomainModelData(categorizedData);

      const userContext = result.boundedContexts[0];
      // Aggregates should have entity names as string[]
      expect(userContext.aggregates[0].entities).toEqual([
        "User",
        "UserProfile",
        "UserPreferences",
      ]);
      // Aggregates should have repository as object
      expect(userContext.aggregates[0].repository).toEqual({
        name: "UserRepository",
        description: "User repository",
      });

      // Entities should be full objects
      expect(userContext.entities).toHaveLength(3);
      expect(userContext.entities.map((e) => e.name)).toEqual(
        expect.arrayContaining(["User", "UserProfile", "UserPreferences"]),
      );

      // Repositories should be extracted from aggregates
      expect(userContext.repositories).toHaveLength(1);
      expect(userContext.repositories[0]).toEqual({
        name: "UserRepository",
        description: "User repository",
      });
    });

    it("should handle bounded context with empty aggregates array", () => {
      const categorizedData: CategorizedSectionItem[] = [
        {
          category: "boundedContexts",
          label: "Domain Model",
          data: [
            {
              name: "Empty Context",
              description: "A context with no aggregates",
              aggregates: [],
            },
          ] as BoundedContextsArray,
        },
      ];

      const result = transformer.getDomainModelData(categorizedData);

      const emptyContext = result.boundedContexts[0];
      expect(emptyContext.aggregates).toHaveLength(0);
      expect(emptyContext.entities).toHaveLength(0);
      expect(emptyContext.repositories).toHaveLength(0);
    });

    it("should handle missing bounded contexts data gracefully", () => {
      const categorizedData: CategorizedSectionItem[] = [
        {
          category: "technologies",
          label: "Technologies",
          data: [{ name: "Java", description: "Java language" }],
        },
      ];

      const result = transformer.getDomainModelData(categorizedData);

      expect(result.boundedContexts).toHaveLength(0);
      expect(result.aggregates).toHaveLength(0);
      expect(result.entities).toHaveLength(0);
      expect(result.repositories).toHaveLength(0);
    });

    it("should flatten all aggregates, entities, and repositories from multiple bounded contexts", () => {
      const categorizedData: CategorizedSectionItem[] = [
        {
          category: "boundedContexts",
          label: "Domain Model",
          data: [
            {
              name: "Sales",
              description: "Sales context",
              aggregates: [
                {
                  name: "CustomerAggregate",
                  description: "Customer aggregate",
                  repository: {
                    name: "CustomerRepository",
                    description: "Customer repository",
                  },
                  entities: [{ name: "Customer", description: "Customer entity" }],
                },
                {
                  name: "OrderAggregate",
                  description: "Order aggregate",
                  repository: {
                    name: "OrderRepository",
                    description: "Order repository",
                  },
                  entities: [{ name: "Order", description: "Order entity" }],
                },
              ],
            },
            {
              name: "Inventory",
              description: "Inventory context",
              aggregates: [
                {
                  name: "StockAggregate",
                  description: "Stock aggregate",
                  repository: {
                    name: "StockRepository",
                    description: "Stock repository",
                  },
                  entities: [{ name: "Stock", description: "Stock entity" }],
                },
              ],
            },
          ] as BoundedContextsArray,
        },
      ];

      const result = transformer.getDomainModelData(categorizedData);

      // Top-level should contain all items from all contexts
      expect(result.aggregates).toHaveLength(3);
      expect(result.aggregates.map((a) => a.name)).toEqual(
        expect.arrayContaining(["CustomerAggregate", "OrderAggregate", "StockAggregate"]),
      );

      expect(result.entities).toHaveLength(3);
      expect(result.entities.map((e) => e.name)).toEqual(
        expect.arrayContaining(["Customer", "Order", "Stock"]),
      );

      expect(result.repositories).toHaveLength(3);
      expect(result.repositories.map((r) => r.name)).toEqual(
        expect.arrayContaining(["CustomerRepository", "OrderRepository", "StockRepository"]),
      );
    });

    it("should deduplicate entities that appear in multiple aggregates", () => {
      const categorizedData: CategorizedSectionItem[] = [
        {
          category: "boundedContexts",
          label: "Domain Model",
          data: [
            {
              name: "Context With Shared Entity",
              description: "A context where entity appears in multiple aggregates",
              aggregates: [
                {
                  name: "AggregateA",
                  description: "Aggregate A",
                  repository: {
                    name: "RepositoryA",
                    description: "Repository A",
                  },
                  entities: [
                    { name: "SharedEntity", description: "Shared entity" },
                    { name: "EntityA", description: "Entity A" },
                  ],
                },
                {
                  name: "AggregateB",
                  description: "Aggregate B",
                  repository: {
                    name: "RepositoryB",
                    description: "Repository B",
                  },
                  entities: [
                    { name: "SharedEntity", description: "Shared entity" },
                    { name: "EntityB", description: "Entity B" },
                  ],
                },
              ],
            },
          ] as BoundedContextsArray,
        },
      ];

      const result = transformer.getDomainModelData(categorizedData);

      // Entities should be deduplicated
      const context = result.boundedContexts[0];
      expect(context.entities).toHaveLength(3); // SharedEntity, EntityA, EntityB
      expect(context.entities.filter((e) => e.name === "SharedEntity")).toHaveLength(1);

      // Top-level entities should also be deduplicated
      expect(result.entities).toHaveLength(3);
      expect(result.entities.filter((e) => e.name === "SharedEntity")).toHaveLength(1);
    });

    it("should handle aggregates with empty entities array", () => {
      const categorizedData: CategorizedSectionItem[] = [
        {
          category: "boundedContexts",
          label: "Domain Model",
          data: [
            {
              name: "Context With Empty Aggregate",
              description: "A context with aggregate that has no entities",
              aggregates: [
                {
                  name: "EmptyAggregate",
                  description: "An aggregate with no entities",
                  repository: {
                    name: "EmptyRepository",
                    description: "Empty repository",
                  },
                  entities: [],
                },
              ],
            },
          ] as BoundedContextsArray,
        },
      ];

      const result = transformer.getDomainModelData(categorizedData);

      const context = result.boundedContexts[0];
      expect(context.aggregates).toHaveLength(1);
      expect(context.aggregates[0].entities).toEqual([]);
      expect(context.aggregates[0].repository).toEqual({
        name: "EmptyRepository",
        description: "Empty repository",
      });
      expect(context.entities).toHaveLength(0);
      expect(context.repositories).toHaveLength(1);
    });

    it("should handle bounded context without aggregates property", () => {
      const categorizedData: CategorizedSectionItem[] = [
        {
          category: "boundedContexts",
          label: "Domain Model",
          data: [
            {
              name: "Minimal Context",
              description: "A context without aggregates property",
              // No aggregates property at all
            },
          ] as BoundedContextsArray,
        },
      ];

      const result = transformer.getDomainModelData(categorizedData);

      const context = result.boundedContexts[0];
      expect(context.aggregates).toHaveLength(0);
      expect(context.entities).toHaveLength(0);
      expect(context.repositories).toHaveLength(0);
    });
  });
});
