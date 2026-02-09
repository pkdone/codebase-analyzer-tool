import type { AppSummaryCategoryType } from "../schemas/app-summaries.schema";

/**
 * Display labels for app summary categories.
 *
 * This configuration provides human-readable labels for data categories,
 * used by both the prompt definitions and the reporting layer. By centralizing
 * these labels here, we decouple the reporting layer from prompt definitions,
 * reducing architectural coupling.
 *
 * When adding a new category:
 * 1. Add it to AppSummaryCategories enum in app-summaries.schema.ts
 * 2. Add the label here
 * 3. Add the prompt configuration in app-summaries.definitions.ts
 */
export const CATEGORY_LABELS: Readonly<Record<AppSummaryCategoryType, string>> = {
  appDescription: "Application Description",
  technologies: "Technologies",
  businessProcesses: "Business Processes",
  boundedContexts: "Domain Model",
  potentialMicroservices: "Potential Microservices",
  inferredArchitecture: "Inferred Architecture",
} as const;

/**
 * Get the display label for a category.
 * The type system ensures all categories have labels defined.
 */
export function getCategoryLabel(category: AppSummaryCategoryType): string {
  return CATEGORY_LABELS[category];
}
