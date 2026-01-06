import { z } from "zod";
import { createNameDescSchema } from "./schema-factories";

/**
 * Zod schema for application summary categories.
 * This is used to validate the category names in app summaries.
 * Note: aggregates, entities, and repositories are nested within boundedContexts.
 */
export const AppSummaryCategories = z.enum([
  "appDescription",
  "technologies",
  "businessProcesses",
  "boundedContexts",
  "potentialMicroservices",
  "inferredArchitecture",
]);

/**
 * Schema for name-description pairs used for insights
 */
export const nameDescSchema = createNameDescSchema(
  "The name of the item.",
  "A detailed description of the item in at least 5 sentences.",
).passthrough();

/**
 * Schema for business activities/steps within a business process
 */
const businessActivitySchema = z
  .object({
    activity: z.string().describe("The name of the business activity step."),
    description: z
      .string()
      .describe("A detailed description of the business activity step using business language."),
  })
  .passthrough();

/**
 * Schema for business processes with key activities
 */
export const businessProcessSchema = createNameDescSchema(
  "The name of the 'logical'business process that reflects how part of the applicaiton operates.",
  "A detailed description of the business process in at least 5 sentences.",
)
  .extend({
    keyBusinessActivities: z
      .array(businessActivitySchema)
      .describe(
        "An array of key business activity steps that are linearly conducted by this process.",
      ),
  })
  .passthrough();

/**
 * Schema for application description
 */
export const appDescriptionSchema = z
  .object({
    appDescription: z
      .string()
      .describe(
        "A detailed description of the application's purpose and implementation in at least 20 sentences).",
      ),
  })
  .passthrough();

/**
 * Schema for technologies used by the application
 */
export const technologiesSchema = z
  .object({
    technologies: z
      .array(nameDescSchema)
      .describe(
        "A list of key external and host platform technologies depended on by the application.",
      ),
  })
  .passthrough();

/**
 * Schema for arrays of business processes with detailed activities
 */
export const businessProcessesSchema = z
  .object({
    businessProcesses: z
      .array(businessProcessSchema)
      .describe(
        "A list of the application's main business processes with their key business activities.",
      ),
  })
  .passthrough();

// =============================================================================
// Hierarchical Domain Model Schemas
// These schemas define a nested structure where bounded contexts contain
// aggregates, and each aggregate contains its repository and entities.
// =============================================================================

/**
 * Schema for nested entity within an aggregate (full object, not just name)
 * Entities represent core business concepts within an aggregate boundary.
 */
export const nestedEntitySchema = createNameDescSchema(
  "The name of the domain-driven design entity.",
  "A detailed description of the entity and its business purpose in at least 3 sentences.",
).passthrough();

/**
 * Schema for nested repository within an aggregate
 * Repositories provide persistence access for the aggregate.
 */
export const nestedRepositorySchema = createNameDescSchema(
  "The name of the repository.",
  "A detailed description of the repository and its persistence responsibilities in at least 3 sentences.",
).passthrough();

/**
 * Schema for nested aggregate within a bounded context (contains full entity and repository objects)
 * Aggregates enforce business rules and maintain consistency boundaries.
 * Each aggregate has exactly one repository for persistence.
 */
export const nestedAggregateSchema = createNameDescSchema(
  "The name of the domain-driven design aggregate.",
  "A detailed description of the aggregate and its business rules in at least 5 sentences.",
)
  .extend({
    repository: nestedRepositorySchema.describe(
      "The repository that provides persistence for this aggregate.",
    ),
    entities: z
      .array(nestedEntitySchema)
      .describe("The domain entities managed by this aggregate, each with full details."),
  })
  .passthrough();

/**
 * Schema for hierarchical bounded context with embedded aggregates and entities
 * This ensures all domain elements within a context are captured consistently in one pass.
 */
export const hierarchicalBoundedContextSchema = createNameDescSchema(
  "The name of the domain-driven design Bounded Context.",
  "A detailed description of the bounded context and its business capabilities in at least 5 sentences.",
)
  .extend({
    aggregates: z
      .array(nestedAggregateSchema)
      .describe(
        "The aggregates within this bounded context, each containing its repository and entities.",
      ),
  })
  .passthrough();

/**
 * Schema for bounded contexts in the application (hierarchical structure)
 * Each bounded context now contains its full domain model hierarchy.
 */
export const boundedContextsSchema = z
  .object({
    boundedContexts: z
      .array(hierarchicalBoundedContextSchema)
      .describe(
        "A list of domain-driven design Bounded Contexts, where each Bounded Context contains its aggregates, with each aggregate holding it repository and entities, in a hierarchical structure.",
      ),
  })
  .passthrough();

/**
 * Schema for CRUD operations for microservices
 */
const crudOperationSchema = z
  .object({
    operation: z
      .string()
      .describe(
        "The potential CRUD operation name that should exist for this microservice (e.g., Create User, Update Profile).",
      ),
    method: z.string().describe("The HTTP method (GET, POST, PUT, DELETE, PATCH)."),
    description: z
      .string()
      .describe("A detailed description of what this CRUD operation would do."),
  })
  .passthrough();

/**
 * Schema for REST API endpoints for microservices
 */
const restEndpointSchema = z
  .object({
    path: z
      .string()
      .describe(
        "The potential REST API endpoint path that should exist for this microservice  (e.g., /api/users/{id}).",
      ),
    method: z.string().describe("The HTTP method (GET, POST, PUT, DELETE, PATCH)."),
    description: z.string().describe("A detailed description of what this endpoint would do."),
  })
  .passthrough();

/**
 * Schema for domain-driven design entities for microservices
 */
const microserviceEntitySchema = z
  .object({
    name: z
      .string()
      .describe(
        "The name of the 'logical'  domain-driven design entity that should exist for this microservice.",
      ),
    description: z
      .string()
      .describe(
        "A detailed description of the potntial  domain-driven design entity and its purpose.",
      ),
    attributes: z
      .array(z.string())
      .describe("Key attributes or properties of this potential entity.")
      .optional(),
  })
  .passthrough();

/**
 * Schema for enhanced potential microservice with detailed fields
 */
export const potentialMicroserviceSchema = createNameDescSchema(
  "The name of the potential microservice.",
  "A detailed description of the potential microservice's purpose and responsibilities in at least 5 sentences.",
)
  .extend({
    entities: z
      .array(microserviceEntitySchema)
      .describe(
        "A list of 'logical' domain-driven design entities that would be managed by this potential microservice.",
      ),
    endpoints: z
      .array(restEndpointSchema)
      .describe("A list of REST API endpoints that this potential microservice would expose."),
    operations: z
      .array(crudOperationSchema)
      .describe("A list of CRUD operations that this potential microservice would support."),
  })
  .passthrough();

/**
 * Schema for arrays of potential microservices with detailed specifications
 */
export const potentialMicroservicesSchema = z
  .object({
    potentialMicroservices: z
      .array(potentialMicroserviceSchema)
      .describe(
        "A list of recommended potential applicable microservices to modernize the monolithic application, each following the Single Responsibility Principle with defined CRUD operations, REST API endpoints, and domain-driven design entities.",
      ),
  })
  .passthrough();

// =============================================================================
// Inferred Architecture Schemas
// These schemas define the structure for business components inferred from
// the codebase and their external dependencies.
// =============================================================================

/**
 * Schema for a dependency relationship between components
 */
export const componentDependencySchema = z
  .object({
    from: z.string().describe("The name of the source business component."),
    to: z.string().describe("The name of the target business component or external system."),
    description: z.string().describe("A brief description of the dependency relationship."),
  })
  .passthrough();

/**
 * Schema for an inferred internal business component.
 * These should be BUSINESS DOMAIN components (e.g., "Loan Manager", "Customer Service",
 * "Order Processor", "Payment Handler"), NOT technical layers (e.g., NOT "Web Layer",
 * "Service Layer", "DAO Layer", "Presentation Layer").
 */
export const inferredComponentSchema = z
  .object({
    name: z
      .string()
      .describe(
        "The name of a business domain component that handles a specific business capability (e.g., 'Loan Manager', 'Customer Service', 'Invoice Processor'). Do NOT use technical layer names like 'Web Layer', 'Service Layer', 'DAO', or 'Presentation Layer'.",
      ),
    description: z
      .string()
      .describe(
        "A detailed description of the business capabilities and domain responsibilities this component handles, in at least 3 sentences. Focus on WHAT business function it serves, not HOW it is technically implemented.",
      ),
  })
  .passthrough();

/**
 * Schema for an external dependency (database, queue, API, etc.)
 * Only include external dependencies that have at least one internal component depending on them.
 */
export const externalDependencyComponentSchema = z
  .object({
    name: z.string().describe("The name of the external system or technology."),
    type: z.string().describe("The type (e.g., Database, Message Queue, External API, Cache)."),
    description: z
      .string()
      .describe(
        "A brief description of how it is used by the application. Only include if at least one internal component depends on it.",
      ),
  })
  .passthrough();

/**
 * Schema for the complete inferred architecture insight.
 * Internal components should represent BUSINESS capabilities, not technical layers.
 */
export const inferredArchitectureSchema = z
  .object({
    inferredArchitecture: z
      .object({
        internalComponents: z
          .array(inferredComponentSchema)
          .describe(
            "Business domain components inferred from the codebase. These should represent business capabilities (e.g., 'Loan Manager', 'Account Service', 'Payment Processor'), NOT technical architecture layers (avoid names like 'Web Layer', 'Service Layer', 'DAO Layer').",
          ),
        externalDependencies: z
          .array(externalDependencyComponentSchema)
          .describe(
            "External systems the application depends on (databases, queues, APIs, etc.). ONLY include external systems that have at least one internal component depending on them - do not list orphaned external dependencies with no connections.",
          ),
        dependencies: z
          .array(componentDependencySchema)
          .describe(
            "Directed relationships showing how business components depend on each other and on external systems. Every external dependency MUST appear as a 'to' target in at least one relationship.",
          ),
      })
      .describe(
        "The inferred business architecture of the application, focusing on domain components rather than technical layers.",
      ),
  })
  .passthrough();

/**
 * Schema for full application summary of categories.
 * Note: aggregates, entities, and repositories are nested within boundedContexts.
 */
export const appSummarySchema = z
  .object({
    projectName: z.string(),
    llmProvider: z.string(),
    appDescription: appDescriptionSchema.shape.appDescription.optional(),
    businessProcesses: businessProcessesSchema.shape.businessProcesses.optional(),
    technologies: technologiesSchema.shape.technologies.optional(),
    boundedContexts: boundedContextsSchema.shape.boundedContexts.optional(),
    potentialMicroservices: potentialMicroservicesSchema.shape.potentialMicroservices.optional(),
    inferredArchitecture: inferredArchitectureSchema.shape.inferredArchitecture.optional(),
  })
  .passthrough();

/**
 * Strongly-typed mapping of app summary categories to their Zod schemas.
 * This preserves type information for compile-time inference, unlike the
 * PromptDefinition.responseSchema which is typed as z.ZodType.
 *
 * Use this mapping when you need TypeScript to infer the correct return type
 * based on a category key, rather than getting a generic z.ZodType.
 */
export const appSummaryCategorySchemas = {
  appDescription: appDescriptionSchema,
  technologies: technologiesSchema,
  businessProcesses: businessProcessesSchema,
  boundedContexts: boundedContextsSchema,
  potentialMicroservices: potentialMicroservicesSchema,
  inferredArchitecture: inferredArchitectureSchema,
} as const;

/**
 * Type representing the strongly-typed category-to-schema mapping.
 * Use with z.infer<AppSummaryCategorySchemas[C]> to get the inferred type for a category.
 */
export type AppSummaryCategorySchemas = typeof appSummaryCategorySchemas;

// =============================================================================
// Type exports for use in domain model data provider and reporting
// =============================================================================

/**
 * Inferred types from hierarchical schemas for use in data providers
 */
export type NestedEntity = z.infer<typeof nestedEntitySchema>;
export type NestedAggregate = z.infer<typeof nestedAggregateSchema>;
export type NestedRepository = z.infer<typeof nestedRepositorySchema>;
export type HierarchicalBoundedContext = z.infer<typeof hierarchicalBoundedContextSchema>;

/**
 * Inferred types from inferred architecture schemas
 */
export type InferredComponent = z.infer<typeof inferredComponentSchema>;
export type ExternalDependencyComponent = z.infer<typeof externalDependencyComponentSchema>;
export type ComponentDependency = z.infer<typeof componentDependencySchema>;
export type InferredArchitecture = z.infer<typeof inferredArchitectureSchema>;
