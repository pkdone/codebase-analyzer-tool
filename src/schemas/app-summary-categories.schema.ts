import { z } from "zod";

/**
 * Zod schema for application summary categories
 * This is used to validate the category names in app summaries
 */
export const AppSummaryCategoryEnum = z.enum([
  "appDescription",
  "technologies",
  "businessProcesses",
  "boundedContexts",
  "aggregates",
  "entities",
  "repositories",
  "potentialMicroservices",
]);

/**
 * Schema for name-description pairs used for insights
 */
export const nameDescSchema = z
  .object({
    name: z.string().describe("The name of the item."),
    description: z.string().describe("A detailed description of the item in at least 5 sentences."),
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
export const businessProcessSchema = z
  .object({
    name: z
      .string()
      .describe(
        "The name of the 'logical'business process that reflects how part of the applicaiton operates.",
      ),
    description: z
      .string()
      .describe("A detailed description of the business process in at least 5 sentences."),
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
export const appDescriptionSchema = z.object({
  appDescription: z
    .string()
    .describe(
      "A detailed description of the application's purpose and implementation in at least 20 sentences).",
    ),
});

/**
 * Schema for technologies used by the application
 */
export const technologiesSchema = z.object({
  technologies: z
    .array(nameDescSchema)
    .describe(
      "A list of key external and host platform technologies depended on by the application.",
    ),
});

/**
 * Schema for arrays of business processes with detailed activities
 */
export const businessProcessesSchema = z.object({
  businessProcesses: z
    .array(businessProcessSchema)
    .describe(
      "A list of the application's main business processes with their key business activities.",
    ),
});

/**
 * Schema for bounded contexts in the application
 */
export const boundedContextsSchema = z.object({
  boundedContexts: z
    .array(nameDescSchema)
    .describe(
      "A list of domain-driven design Bounded Contexts that define explicit boundaries around related business capabilities and their models.",
    ),
});

/**
 * Schema for enhanced aggregate with domain relationships
 */
export const aggregateSchema = z
  .object({
    name: z.string().describe("The name of the domain-driven design aggregate."),
    description: z
      .string()
      .describe(
        "A detailed description of the domain-driven design aggregate and its business rules that should exist for this application in at least 5 sentences.",
      ),
    entities: z
      .array(z.string())
      .describe(
        "A list of' logical' domain-driven design entity names that are managed by this aggregate.",
      ),
    repository: z
      .string()
      .describe(
        "The name of the 'logical' domain-driven design repository associated with this aggregate for persistence.",
      ),
  })
  .passthrough();

/**
 * Schema for enhanced repository with aggregate relationship
 */
export const repositorySchema = z
  .object({
    name: z
      .string()
      .describe(
        "The name of the domain-driven repository that should be present for this application.",
      ),
    description: z
      .string()
      .describe(
        "A detailed description of the potential repository and its persistence responsibilities in at least 5 sentences.",
      ),
    aggregate: z
      .string()
      .describe("The name of the 'logical' aggregate that this repository is associated with."),
  })
  .passthrough();

/**
 * Schema for arrays of aggregates with enhanced relationships
 */
export const aggregatesSchema = z.object({
  aggregates: z
    .array(aggregateSchema)
    .describe(
      "A list of domain-driven design aggregates that should exist toenforce business rules and maintain consistency, including their 'logical' associated entities and repositories that should exist for them.",
    ),
});

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
 * Schema for individual domain-driven design entities with relationships
 */
export const entitySchema = z
  .object({
    name: z.string().describe("The name of the domain-driven design entity."),
    description: z.string().describe("A detailed description of the entity in at least 5 sentences."),
    relatedEntities: z
      .array(z.string())
      .describe("A list of names of other entities that this entity would be linked to in an entity-relationship style model.")
      .optional(),
  })
  .passthrough();

/**
 * Schema for entities in the application
 */
export const entitiesSchema = z.object({
  entities: z
    .array(entitySchema)
    .describe(
      "A list of domain-driven design entities that should exist to represent core business concepts and contain business logic.",
    ),
});

/**
 * Schema for arrays of repositories with enhanced relationships
 */
export const repositoriesSchema = z.object({
  repositories: z
    .array(repositorySchema)
    .describe(
      "A list of domain-driven design repositories that provide access to aggregate persistence, each associated with a specific 'logical' aggregate that should exist for it.",
    ),
});

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
 * Schema for enhanced potential microservice with detailed fields
 */
export const potentialMicroserviceSchema = z
  .object({
    name: z.string().describe("The name of the potential microservice."),
    description: z
      .string()
      .describe(
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
export const potentialMicroservicesSchema = z.object({
  potentialMicroservices: z
    .array(potentialMicroserviceSchema)
    .describe(
      "A list of recommended potential applicable microservices to modernize the monolithic application, each following the Single Responsibility Principle with defined CRUD operations, REST API endpoints, and domain-driven design entities.",
    ),
});
