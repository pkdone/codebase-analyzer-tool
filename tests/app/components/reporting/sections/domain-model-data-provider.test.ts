import "reflect-metadata";
import { DomainModelDataProvider } from "../../../../../src/app/components/reporting/sections/visualizations/domain-model-data-provider";
import type { HierarchicalBoundedContextData } from "../../../../../src/app/components/reporting/sections/visualizations/domain-model.types";
import type { CategorizedDataItem } from "../../../../../src/app/components/reporting/sections/file-types/categories-data-provider";

describe("DomainModelDataProvider", () => {
  let provider: DomainModelDataProvider;

  beforeEach(() => {
    provider = new DomainModelDataProvider();
  });

  describe("getDomainModelData", () => {
    it("should return empty structure when no boundedContexts category exists", () => {
      const categorizedData: { category: string; label: string; data: CategorizedDataItem }[] = [
        { category: "technologies", label: "Technologies", data: [] },
      ];

      const result = provider.getDomainModelData(categorizedData);

      expect(result).toEqual({
        boundedContexts: [],
        aggregates: [],
        entities: [],
        repositories: [],
      });
    });

    it("should extract aggregates from multiple bounded contexts", () => {
      const hierarchicalData: HierarchicalBoundedContextData[] = [
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

      const categorizedData: { category: string; label: string; data: CategorizedDataItem }[] = [
        {
          category: "boundedContexts",
          label: "Bounded Contexts",
          data: hierarchicalData as unknown as CategorizedDataItem,
        },
      ];

      const result = provider.getDomainModelData(categorizedData);

      expect(result.aggregates).toHaveLength(2);
      expect(result.aggregates.map((a) => a.name)).toContain("Aggregate1");
      expect(result.aggregates.map((a) => a.name)).toContain("Aggregate2");
    });

    it("should deduplicate aggregates by name across contexts", () => {
      const hierarchicalData: HierarchicalBoundedContextData[] = [
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

      const categorizedData: { category: string; label: string; data: CategorizedDataItem }[] = [
        {
          category: "boundedContexts",
          label: "Bounded Contexts",
          data: hierarchicalData as unknown as CategorizedDataItem,
        },
      ];

      const result = provider.getDomainModelData(categorizedData);

      // Should only have one aggregate with the name "SharedAggregate"
      expect(result.aggregates).toHaveLength(1);
      expect(result.aggregates[0].name).toBe("SharedAggregate");
    });

    it("should deduplicate entities by name across contexts", () => {
      const hierarchicalData: HierarchicalBoundedContextData[] = [
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

      const categorizedData: { category: string; label: string; data: CategorizedDataItem }[] = [
        {
          category: "boundedContexts",
          label: "Bounded Contexts",
          data: hierarchicalData as unknown as CategorizedDataItem,
        },
      ];

      const result = provider.getDomainModelData(categorizedData);

      // Should have 3 entities: SharedEntity (deduplicated), UniqueEntity1, UniqueEntity2
      expect(result.entities).toHaveLength(3);
      const entityNames = result.entities.map((e) => e.name);
      expect(entityNames.filter((n) => n === "SharedEntity")).toHaveLength(1);
    });

    it("should deduplicate repositories by name across contexts", () => {
      const hierarchicalData: HierarchicalBoundedContextData[] = [
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

      const categorizedData: { category: string; label: string; data: CategorizedDataItem }[] = [
        {
          category: "boundedContexts",
          label: "Bounded Contexts",
          data: hierarchicalData as unknown as CategorizedDataItem,
        },
      ];

      const result = provider.getDomainModelData(categorizedData);

      // Should only have one repository with the name "SharedRepo"
      expect(result.repositories).toHaveLength(1);
      expect(result.repositories[0].name).toBe("SharedRepo");
    });

    it("should preserve first occurrence when deduplicating", () => {
      const hierarchicalData: HierarchicalBoundedContextData[] = [
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

      const categorizedData: { category: string; label: string; data: CategorizedDataItem }[] = [
        {
          category: "boundedContexts",
          label: "Bounded Contexts",
          data: hierarchicalData as unknown as CategorizedDataItem,
        },
      ];

      const result = provider.getDomainModelData(categorizedData);

      // Should keep the first occurrence
      expect(result.aggregates[0].description).toBe("First description");
      expect(result.repositories[0].description).toBe("First repo description");
    });
  });
});
