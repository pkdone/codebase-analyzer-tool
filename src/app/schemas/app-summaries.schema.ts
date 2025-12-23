import { z } from "zod";

/**
 * Zod schema for application summary categories
 * This is used to validate the category names in app summaries
 * Note: aggregates, entities, and repositories are now nested within boundedContexts
 */
export const AppSummaryCategories = z.enum([
  "appDescription",
  "technologies",
  "businessProcesses",
  "boundedContexts",
  "potentialMicroservices",
]);

// Base schema for common name-description pattern
const baseNameDescSchema = z.object({
  name: z.string(),
  description: z.string(),
});

/**
 * Schema for name-description pairs used for insights
 */
export const nameDescSchema = baseNameDescSchema
  .extend({
    name: baseNameDescSchema.shape.name.describe("The name of the item."),
    description: baseNameDescSchema.shape.description.describe(
      "A detailed description of the item in at least 5 sentences.",
    ),
  })
  .passthrough();

/**
 * Schema for business activities/steps within a business process
 */
export const businessActivitySchema = z
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
export const businessProcessSchema = baseNameDescSchema
  .extend({
    name: baseNameDescSchema.shape.name.describe(
      "The name of the 'logical'business process that reflects how part of the applicaiton operates.",
    ),
    description: baseNameDescSchema.shape.description.describe(
      "A detailed description of the business process in at least 5 sentences.",
    ),
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
export const nestedEntitySchema = z
  .object({
    name: z.string().describe("The name of the domain-driven design entity."),
    description: z
      .string()
      .describe(
        "A detailed description of the entity and its business purpose in at least 3 sentences.",
      ),
    relatedEntities: z
      .array(z.string())
      .describe(
        "A list of names of other entities within the same bounded context that this entity relates to.",
      )
      .optional(),
  })
  .passthrough();

/**
 * Schema for nested repository within an aggregate
 * Repositories provide persistence access for the aggregate.
 */
export const nestedRepositorySchema = z
  .object({
    name: z.string().describe("The name of the repository."),
    description: z
      .string()
      .describe(
        "A detailed description of the repository and its persistence responsibilities in at least 3 sentences.",
      ),
  })
  .passthrough();

/**
 * Schema for nested aggregate within a bounded context (contains full entity and repository objects)
 * Aggregates enforce business rules and maintain consistency boundaries.
 * Each aggregate has exactly one repository for persistence.
 */
export const nestedAggregateSchema = z
  .object({
    name: z.string().describe("The name of the domain-driven design aggregate."),
    description: z
      .string()
      .describe(
        "A detailed description of the aggregate and its business rules in at least 5 sentences.",
      ),
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
export const hierarchicalBoundedContextSchema = z
  .object({
    name: z.string().describe("The name of the domain-driven design Bounded Context."),
    description: z
      .string()
      .describe(
        "A detailed description of the bounded context and its business capabilities in at least 5 sentences.",
      ),
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
        "A list of domain-driven design Bounded Contexts, each containing its aggregates with their repositories and entities in a hierarchical structure.",
      ),
  })
  .passthrough();

/**
 * Schema for CRUD operations for microservices
 */
export const crudOperationSchema = z
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
export const restEndpointSchema = z
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
export const microserviceEntitySchema = z
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
export const potentialMicroserviceSchema = baseNameDescSchema
  .extend({
    name: baseNameDescSchema.shape.name.describe("The name of the potential microservice."),
    description: baseNameDescSchema.shape.description.describe(
      "A detailed description of the potential microservice's purpose and responsibilities in at least 5 sentences.",
    ),
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

/**
 * Schema for full application summary of categories
 * Note: aggregates, entities, and repositories are now nested within boundedContexts
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
