import { z } from "zod";
import {
  appDescriptionSchema,
  boundedContextsSchema,
  businessProcessesSchema,
  inferredArchitectureSchema,
  potentialMicroservicesSchema,
  technologiesSchema,
} from "../../schemas/app-summaries.schema";
import {
  APP_SUMMARY_PROMPT_FRAGMENTS,
  FILE_SUMMARIES_DATA_BLOCK_HEADER,
  APP_SUMMARY_CONTENT_DESC,
} from "./app-summaries.fragments";

export { FILE_SUMMARIES_DATA_BLOCK_HEADER, APP_SUMMARY_CONTENT_DESC };

/**
 * Configuration entry for app summary prompts.
 * Contains all fields necessary to construct a complete prompt, making each entry
 * self-describing. This design is consistent with SourceConfigEntry and eliminates
 * the need for consumers to provide presentation fields at instantiation time.
 *
 * @template S - The Zod schema type for validating the LLM response.
 */
export interface AppSummaryConfigEntry<S extends z.ZodType = z.ZodType> {
  /** Description of the content being analyzed (e.g., "a set of source file summaries") */
  readonly contentDesc: string;
  /** The data block header to use in the template (e.g., "FILE_SUMMARIES") */
  readonly dataBlockHeader: string;
  /** Array of instruction strings for the LLM */
  readonly instructions: readonly string[];
  /** Zod schema for validating the LLM response */
  readonly responseSchema: S;
}

/**
 * Centralized configuration for all app summary prompt definitions.
 *
 * Each entry is self-describing with all fields needed to construct a complete prompt.
 * This design is consistent with SourceConfigEntry and eliminates the need for consumers
 * to provide presentation fields at instantiation time.
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
    contentDesc: APP_SUMMARY_CONTENT_DESC,
    dataBlockHeader: FILE_SUMMARIES_DATA_BLOCK_HEADER,
    responseSchema: appDescriptionSchema,
    instructions: [
      `${APP_SUMMARY_PROMPT_FRAGMENTS.DETAILED_DESC} of the application's purpose and implementation`,
    ],
  },
  technologies: {
    contentDesc: APP_SUMMARY_CONTENT_DESC,
    dataBlockHeader: FILE_SUMMARIES_DATA_BLOCK_HEADER,
    responseSchema: technologiesSchema,
    instructions: [
      `${APP_SUMMARY_PROMPT_FRAGMENTS.COMPREHENSIVE_LIST} of key external and host platform technologies (including the names of programming languages used) depended on by the application`,
    ],
  },
  businessProcesses: {
    contentDesc: APP_SUMMARY_CONTENT_DESC,
    dataBlockHeader: FILE_SUMMARIES_DATA_BLOCK_HEADER,
    responseSchema: businessProcessesSchema,
    instructions: [
      `${APP_SUMMARY_PROMPT_FRAGMENTS.CONCISE_LIST} of the application's main business processes with their key business activity steps that are linearly conducted by each process`,
    ],
  },
  boundedContexts: {
    contentDesc: APP_SUMMARY_CONTENT_DESC,
    dataBlockHeader: FILE_SUMMARIES_DATA_BLOCK_HEADER,
    responseSchema: boundedContextsSchema,
    instructions: [
      `${APP_SUMMARY_PROMPT_FRAGMENTS.CONCISE_LIST} of Domain-Driven Design Bounded Contexts that define explicit boundaries around related business capabilities. For each bounded context, include:
1. Its aggregates that enforce business rules and maintain consistency
2. For each aggregate, include:
   - A repository that provides persistence for that aggregate
   - The domain entities it manages with their descriptions and relationships

This hierarchical structure ensures consistent naming across all domain elements within each bounded context`,
    ],
  },
  potentialMicroservices: {
    contentDesc: APP_SUMMARY_CONTENT_DESC,
    dataBlockHeader: FILE_SUMMARIES_DATA_BLOCK_HEADER,
    responseSchema: potentialMicroservicesSchema,
    instructions: [
      `${APP_SUMMARY_PROMPT_FRAGMENTS.CONCISE_LIST} of recommended microservices to modernize the monolithic application architecture, each following the Single Responsibility Principle with detailed domain entities, defined CRUD operations, and REST API endpoints`,
    ],
  },
  inferredArchitecture: {
    contentDesc: APP_SUMMARY_CONTENT_DESC,
    dataBlockHeader: FILE_SUMMARIES_DATA_BLOCK_HEADER,
    responseSchema: inferredArchitectureSchema,
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
    ],
  },
} as const satisfies Record<string, AppSummaryConfigEntry>;

/**
 * Type alias for the appSummaryConfigMap that preserves specific schema types for each category.
 * Use this type when you need compile-time access to the exact schema for a specific category.
 */
export type AppSummaryConfigMap = typeof appSummaryConfigMap;
