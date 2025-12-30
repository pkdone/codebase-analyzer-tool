/**
 * Type guards for domain model data validation.
 */

import type { AppSummaryNameDescArray } from "../../../../repositories/app-summaries/app-summaries.model";

/**
 * Type guard to check if data is a valid array of hierarchical bounded context data.
 * Validates the structure at runtime.
 * Accepts data that has name and description (basic structure) even if aggregates is missing,
 * since the schema uses .passthrough() which allows flexibility.
 *
 * @param data - The app summary data to validate
 * @returns True if the data matches the hierarchical bounded context structure
 */
export function isHierarchicalBoundedContextDataArray(data: AppSummaryNameDescArray): boolean {
  if (!Array.isArray(data)) {
    return false;
  }
  // Validate each item - use a more lenient check that allows missing aggregates
  // since .passthrough() allows extra properties and aggregates might be optional in practice
  return data.every((item) => {
    // Check basic structure (name and description are required)
    if (typeof item.name !== "string" || typeof item.description !== "string") {
      return false;
    }
    // If aggregates exists, validate it's an array
    if ("aggregates" in item && !Array.isArray(item.aggregates)) {
      return false;
    }
    return true;
  });
}

