import "reflect-metadata";
import { DomainModelTransformer } from "../../../../../src/app/components/reporting/sections/visualizations/domain-model-transformer";
import type { HierarchicalBoundedContext } from "../../../../../src/app/schemas/app-summaries.schema";
import type { CategorizedSectionItem } from "../../../../../src/app/components/reporting/data-processing";

describe("DomainModelTransformer", () => {
  let transformer: DomainModelTransformer;

  beforeEach(() => {
    transformer = new DomainModelTransformer();
  });

  describe("getDomainModelData", () => {
    it("should return empty structure when no boundedContexts category exists", () => {
      const categorizedData: CategorizedSectionItem[] = [
        { category: "technologies", label: "Technologies", data: [] },
      ];

      const result = transformer.getDomainModelData(categorizedData);

      expect(result).toEqual({
        boundedContexts: [],
        aggregates: [],
        entities: [],
        repositories: [],
      });
    });

    it("should extract aggregates from multiple bounded contexts", () => {
      const hierarchicalData: HierarchicalBoundedContext[] = [
        {
          name: "Context1",
          description: "First context",
          aggregates: [
            {
              name: "Aggregate1",
              description: "First aggregate",
              entities: [{ name: "Entity1", description: "Entity in aggregate 1" }],
              repository: { name: "Repo1", description: "Repository 1" },
            },
          ],
        },
        {
          name: "Context2",
          description: "Second context",
          aggregates: [
            {
              name: "Aggregate2",
              description: "Second aggregate",
              entities: [{ name: "Entity2", description: "Entity in aggregate 2" }],
              repository: { name: "Repo2", description: "Repository 2" },
            },
          ],
        },
      ];

      const categorizedData: CategorizedSectionItem[] = [
        {
          category: "boundedContexts",
          label: "Bounded Contexts",
          data: hierarchicalData,
        },
      ];

      const result = transformer.getDomainModelData(categorizedData);

      expect(result.aggregates).toHaveLength(2);
      expect(result.aggregates.map((a) => a.name)).toContain("Aggregate1");
      expect(result.aggregates.map((a) => a.name)).toContain("Aggregate2");
    });

    it("should deduplicate aggregates by name across contexts", () => {
      const hierarchicalData: HierarchicalBoundedContext[] = [
        {
          name: "Context1",
          description: "First context",
          aggregates: [
            {
              name: "SharedAggregate",
              description: "Shared aggregate from context 1",
              entities: [{ name: "Entity1", description: "Entity 1" }],
              repository: { name: "Repo1", description: "Repository 1" },
            },
          ],
        },
        {
          name: "Context2",
          description: "Second context",
          aggregates: [
            {
              name: "SharedAggregate",
              description: "Same aggregate referenced from context 2",
              entities: [{ name: "Entity2", description: "Entity 2" }],
              repository: { name: "Repo2", description: "Repository 2" },
            },
          ],
        },
      ];

      const categorizedData: CategorizedSectionItem[] = [
        {
          category: "boundedContexts",
          label: "Bounded Contexts",
          data: hierarchicalData,
        },
      ];

      const result = transformer.getDomainModelData(categorizedData);

      // Should only have one aggregate with the name "SharedAggregate"
      expect(result.aggregates).toHaveLength(1);
      expect(result.aggregates[0].name).toBe("SharedAggregate");
    });

    it("should deduplicate entities by name across contexts", () => {
      const hierarchicalData: HierarchicalBoundedContext[] = [
        {
          name: "Context1",
          description: "First context",
          aggregates: [
            {
              name: "Aggregate1",
              description: "Aggregate 1",
              entities: [
                { name: "SharedEntity", description: "Entity from context 1" },
                { name: "UniqueEntity1", description: "Unique entity 1" },
              ],
              repository: { name: "Repo1", description: "Repository 1" },
            },
          ],
        },
        {
          name: "Context2",
          description: "Second context",
          aggregates: [
            {
              name: "Aggregate2",
              description: "Aggregate 2",
              entities: [
                { name: "SharedEntity", description: "Same entity from context 2" },
                { name: "UniqueEntity2", description: "Unique entity 2" },
              ],
              repository: { name: "Repo2", description: "Repository 2" },
            },
          ],
        },
      ];

      const categorizedData: CategorizedSectionItem[] = [
        {
          category: "boundedContexts",
          label: "Bounded Contexts",
          data: hierarchicalData,
        },
      ];

      const result = transformer.getDomainModelData(categorizedData);

      // Should have 3 entities: SharedEntity (deduplicated), UniqueEntity1, UniqueEntity2
      expect(result.entities).toHaveLength(3);
      const entityNames = result.entities.map((e) => e.name);
      expect(entityNames.filter((n) => n === "SharedEntity")).toHaveLength(1);
    });

    it("should deduplicate repositories by name across contexts", () => {
      const hierarchicalData: HierarchicalBoundedContext[] = [
        {
          name: "Context1",
          description: "First context",
          aggregates: [
            {
              name: "Aggregate1",
              description: "Aggregate 1",
              entities: [{ name: "Entity1", description: "Entity 1" }],
              repository: { name: "SharedRepo", description: "Shared repository" },
            },
          ],
        },
        {
          name: "Context2",
          description: "Second context",
          aggregates: [
            {
              name: "Aggregate2",
              description: "Aggregate 2",
              entities: [{ name: "Entity2", description: "Entity 2" }],
              repository: { name: "SharedRepo", description: "Same shared repository" },
            },
          ],
        },
      ];

      const categorizedData: CategorizedSectionItem[] = [
        {
          category: "boundedContexts",
          label: "Bounded Contexts",
          data: hierarchicalData,
        },
      ];

      const result = transformer.getDomainModelData(categorizedData);

      // Should only have one repository with the name "SharedRepo"
      expect(result.repositories).toHaveLength(1);
      expect(result.repositories[0].name).toBe("SharedRepo");
    });

    it("should preserve first occurrence when deduplicating", () => {
      const hierarchicalData: HierarchicalBoundedContext[] = [
        {
          name: "Context1",
          description: "First context",
          aggregates: [
            {
              name: "TestAggregate",
              description: "First description",
              entities: [],
              repository: { name: "TestRepo", description: "First repo description" },
            },
          ],
        },
        {
          name: "Context2",
          description: "Second context",
          aggregates: [
            {
              name: "TestAggregate",
              description: "Second description - should be ignored",
              entities: [],
              repository: { name: "TestRepo", description: "Second repo - should be ignored" },
            },
          ],
        },
      ];

      const categorizedData: CategorizedSectionItem[] = [
        {
          category: "boundedContexts",
          label: "Bounded Contexts",
          data: hierarchicalData,
        },
      ];

      const result = transformer.getDomainModelData(categorizedData);

      // Should keep the first occurrence
      expect(result.aggregates[0].description).toBe("First description");
      expect(result.repositories[0].description).toBe("First repo description");
    });

    it("should handle bounded contexts with missing aggregates property gracefully", () => {
      // Simulate runtime data where aggregates might be missing in legacy data
      // The type guard allows missing aggregates to support schema evolution
      const hierarchicalData = [
        {
          name: "ContextWithAggregates",
          description: "Context with aggregates",
          aggregates: [
            {
              name: "Aggregate1",
              description: "Aggregate 1",
              entities: [{ name: "Entity1", description: "Entity 1" }],
              repository: { name: "Repo1", description: "Repository 1" },
            },
          ],
        },
        {
          name: "ContextWithoutAggregates",
          description: "Context without aggregates property",
          // aggregates property intentionally missing - allowed by type guard
        },
      ] as unknown as HierarchicalBoundedContext[];

      const categorizedData: CategorizedSectionItem[] = [
        {
          category: "boundedContexts",
          label: "Bounded Contexts",
          data: hierarchicalData as unknown as HierarchicalBoundedContext[],
        },
      ];

      const result = transformer.getDomainModelData(categorizedData);

      // Should have both bounded contexts
      expect(result.boundedContexts).toHaveLength(2);

      // Context without aggregates should have empty aggregates array
      expect(result.boundedContexts[1].name).toBe("ContextWithoutAggregates");
      expect(result.boundedContexts[1].aggregates).toEqual([]);

      // Should only have aggregates from the first context
      expect(result.aggregates).toHaveLength(1);
      expect(result.aggregates[0].name).toBe("Aggregate1");

      // Should only have entities from the first context
      expect(result.entities).toHaveLength(1);
      expect(result.entities[0].name).toBe("Entity1");

      // Should only have repositories from the first context
      expect(result.repositories).toHaveLength(1);
      expect(result.repositories[0].name).toBe("Repo1");
    });

    it("should handle bounded context with empty aggregates array", () => {
      const hierarchicalData: HierarchicalBoundedContext[] = [
        {
          name: "EmptyContext",
          description: "Context with empty aggregates",
          aggregates: [],
        },
      ];

      const categorizedData: CategorizedSectionItem[] = [
        {
          category: "boundedContexts",
          label: "Bounded Contexts",
          data: hierarchicalData,
        },
      ];

      const result = transformer.getDomainModelData(categorizedData);

      expect(result.boundedContexts).toHaveLength(1);
      expect(result.boundedContexts[0].name).toBe("EmptyContext");
      expect(result.boundedContexts[0].aggregates).toEqual([]);
      expect(result.aggregates).toEqual([]);
      expect(result.entities).toEqual([]);
      expect(result.repositories).toEqual([]);
    });
  });
});
