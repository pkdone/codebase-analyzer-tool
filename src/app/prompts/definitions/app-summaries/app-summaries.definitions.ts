import {
  appDescriptionSchema,
  boundedContextsSchema,
  businessProcessesSchema,
  inferredArchitectureSchema,
  potentialMicroservicesSchema,
  technologiesSchema,
} from "../../../schemas/app-summaries.schema";
import { CATEGORY_LABELS } from "../../../config/category-labels.config";
import { APP_SUMMARY_PROMPT_FRAGMENTS } from "./app-summaries.fragments";
import { z } from "zod";
import type { PromptConfigEntry } from "../../prompt.types";

/**
 * Configuration entry for an app summary prompt definition.
 * Extends PromptConfigEntry with an additional required `label` field.
 *
 * App summaries require a label for UI display and logging purposes,
 * which distinguishes them from source configs where labels are optional.
 *
 * This interface is generic over the schema type S to preserve specific Zod schema types
 * through the type system, enabling better type inference for downstream consumers.
 *
 * @template S - The Zod schema type for validating the LLM response. Defaults to z.ZodType for backward compatibility.
 */
export interface AppSummaryConfigEntry<
  S extends z.ZodType = z.ZodType,
> extends PromptConfigEntry<S> {
  /** Label for UI display and logging (required for app summary configs) */
  label: string;
}

/**
 * Centralized configuration for all app summary prompt definitions.
 *
 * Note: The `instructions` field contains the specific instruction text that will be used
 * in the PromptDefinition. The PromptDefinition's contentDesc field will be set to a
 * generic value like "a set of source file summaries".
 *
 * Note: aggregates, entities, and repositories are captured within the boundedContexts
 * category as a hierarchical structure to ensure naming consistency across domain elements.
 *
 * The `satisfies` pattern validates that the object conforms to the Record structure
 * while preserving the literal types of each entry (including specific Zod schema types).
 * This enables TypeScript to infer the exact schema type for each category key.
 */
export const appSummaryConfigMap = {
  appDescription: {
    label: CATEGORY_LABELS.appDescription,
    contentDesc: "a set of source file summaries",
    instructions: [
      "a detailed description of the application's purpose and implementation",
    ] as const,
    responseSchema: appDescriptionSchema,
  },
  technologies: {
    label: CATEGORY_LABELS.technologies,
    contentDesc: "a set of source file summaries",
    instructions: [
      `${APP_SUMMARY_PROMPT_FRAGMENTS.COMPREHENSIVE_LIST} of key external and host platform technologies (including the names of programming languages used) depended on by the application`,
    ] as const,
    responseSchema: technologiesSchema,
  },
  businessProcesses: {
    label: CATEGORY_LABELS.businessProcesses,
    contentDesc: "a set of source file summaries",
    instructions: [
      `${APP_SUMMARY_PROMPT_FRAGMENTS.CONCISE_LIST} of the application's main business processes with their key business activity steps that are linearly conducted by each process`,
    ] as const,
    responseSchema: businessProcessesSchema,
  },
  boundedContexts: {
    label: CATEGORY_LABELS.boundedContexts,
    contentDesc: "a set of source file summaries",
    instructions: [
      `${APP_SUMMARY_PROMPT_FRAGMENTS.CONCISE_LIST} of Domain-Driven Design Bounded Contexts that define explicit boundaries around related business capabilities. For each bounded context, include:
1. Its aggregates that enforce business rules and maintain consistency
2. For each aggregate, include:
   - A repository that provides persistence for that aggregate
   - The domain entities it manages with their descriptions and relationships

This hierarchical structure ensures consistent naming across all domain elements within each bounded context`,
    ] as const,
    responseSchema: boundedContextsSchema,
  },
  potentialMicroservices: {
    label: CATEGORY_LABELS.potentialMicroservices,
    contentDesc: "a set of source file summaries",
    instructions: [
      `${APP_SUMMARY_PROMPT_FRAGMENTS.CONCISE_LIST} of recommended microservices to modernize the monolithic application architecture, each following the Single Responsibility Principle with detailed domain entities, defined CRUD operations, and REST API endpoints`,
    ] as const,
    responseSchema: potentialMicroservicesSchema,
  },
  inferredArchitecture: {
    label: CATEGORY_LABELS.inferredArchitecture,
    contentDesc: "a set of source file summaries",
    instructions: [
      `${APP_SUMMARY_PROMPT_FRAGMENTS.CONCISE_LIST} of BUSINESS DOMAIN components inferred from the codebase.

IMPORTANT: Identify components by their BUSINESS CAPABILITY, not by their technical layer.

CORRECT examples of business components:
- "Loan Manager" (manages loan lifecycle)
- "Customer Service" (handles customer data and operations)
- "Payment Processor" (processes payments and transactions)
- "Invoice Generator" (creates and manages invoices)
- "Account Manager" (manages user accounts)
- "Order Fulfillment" (handles order processing)

INCORRECT examples (do NOT use these technical layer names):
- "Web Presentation Layer" ❌
- "Service Layer" ❌
- "Data Access Layer (DAO)" ❌
- "Business Logic Layer" ❌
- "Database Logic Layer" ❌
- "Batch Processing Layer" ❌

For each business component, describe its domain responsibilities and what business function it serves.

Also identify:
1. External systems that internal components actively depend on (databases, message queues, external APIs, caches). ONLY include external systems that have at least one dependency relationship with an internal component.
2. Directed dependency relationships between all business components and external systems. Every external dependency listed MUST have at least one "from" relationship from an internal component.`,
    ] as const,
    responseSchema: inferredArchitectureSchema,
  },
} as const satisfies Record<string, AppSummaryConfigEntry>;

/**
 * Type alias for the appSummaryConfigMap that preserves specific schema types for each category.
 * Use this type when you need compile-time access to the exact schema for a specific category.
 */
export type AppSummaryConfigMap = typeof appSummaryConfigMap;
