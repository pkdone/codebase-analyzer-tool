/**
 * Data extraction utility for microservices visualization.
 *
 * This module provides the function for extracting microservices data from
 * categorized app summary data for use in the microservices architecture diagram.
 */
import type { CategorizedSectionItem } from "../../data-processing/categorized-section-data-builder";
import type { Microservice } from "./architecture-diagram-generator";

/**
 * Extracts microservices data from categorized data.
 * Uses the discriminated union to automatically narrow the data type.
 *
 * @param categorizedData - Array of categorized section items from the report
 * @returns Array of microservices with normalized structure for diagram generation
 */
export function extractMicroservicesData(
  categorizedData: CategorizedSectionItem[],
): Microservice[] {
  // Find the potentialMicroservices category - type is automatically narrowed
  const microservicesCategory = categorizedData.find(
    (item): item is Extract<CategorizedSectionItem, { category: "potentialMicroservices" }> =>
      item.category === "potentialMicroservices",
  );

  if (!microservicesCategory || microservicesCategory.data.length === 0) {
    return [];
  }

  // Data is now typed as PotentialMicroservicesArray - fields are guaranteed by schema
  return microservicesCategory.data.map((item) => ({
    name: item.name,
    description: item.description,
    entities: item.entities.map((entity) => ({
      name: entity.name,
      description: entity.description,
      attributes: entity.attributes ?? [], // attributes is optional in the schema
    })),
    endpoints: item.endpoints,
    operations: item.operations,
  }));
}
