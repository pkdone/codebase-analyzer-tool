import { z } from "zod";

/**
 * Zod schema for application summary categories
 * This is used to validate the category names in app summaries
 */
export const AppSummaryCategories = z.enum([
  "appDescription",
  "technologies",
  "businessProcesses",
  "boundedContexts",
  "aggregates",
  "entities",
  "repositories",
  "potentialMicroservices",
  "billOfMaterials",
  "codeQualitySummary",
  "scheduledJobsSummary",
  "moduleCoupling",
  "uiTechnologyAnalysis",
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

/**
 * Schema for bounded contexts in the application
 */
export const boundedContextsSchema = z
  .object({
    boundedContexts: z
      .array(nameDescSchema)
      .describe(
        "A list of domain-driven design Bounded Contexts that define explicit boundaries around related business capabilities and their models.",
      ),
  })
  .passthrough();

/**
 * Schema for enhanced aggregate with domain relationships
 */
export const aggregateSchema = baseNameDescSchema
  .extend({
    name: baseNameDescSchema.shape.name.describe("The name of the domain-driven design aggregate."),
    description: baseNameDescSchema.shape.description.describe(
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
export const repositorySchema = baseNameDescSchema
  .extend({
    name: baseNameDescSchema.shape.name.describe(
      "The name of the domain-driven repository that should be present for this application.",
    ),
    description: baseNameDescSchema.shape.description.describe(
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
export const aggregatesSchema = z
  .object({
    aggregates: z
      .array(aggregateSchema)
      .describe(
        "A list of domain-driven design aggregates that should exist toenforce business rules and maintain consistency, including their 'logical' associated entities and repositories that should exist for them.",
      ),
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
 * Schema for individual domain-driven design entities with relationships
 */
export const entitySchema = baseNameDescSchema
  .extend({
    name: baseNameDescSchema.shape.name.describe("The name of the domain-driven design entity."),
    description: baseNameDescSchema.shape.description.describe(
      "A detailed description of the entity in at least 5 sentences.",
    ),
    relatedEntities: z
      .array(z.string())
      .describe(
        "A list of names of other entities that this entity would be linked to in an entity-relationship style model.",
      )
      .optional(),
  })
  .passthrough();

/**
 * Schema for entities in the application
 */
export const entitiesSchema = z
  .object({
    entities: z
      .array(entitySchema)
      .describe(
        "A list of domain-driven design entities that should exist to represent core business concepts and contain business logic.",
      ),
  })
  .passthrough();

/**
 * Schema for arrays of repositories with enhanced relationships
 */
export const repositoriesSchema = z
  .object({
    repositories: z
      .array(repositorySchema)
      .describe(
        "A list of domain-driven design repositories that provide access to aggregate persistence, each associated with a specific 'logical' aggregate that should exist for it.",
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
 * Schema for a dependency with conflict tracking
 */
export const bomDependencySchema = z
  .object({
    name: z.string().describe("The dependency name"),
    groupId: z.string().optional().describe("Group/organization ID (for Maven/Gradle)"),
    versions: z.array(z.string()).describe("All versions found across the codebase"),
    hasConflict: z.boolean().describe("True if multiple versions are present"),
    scopes: z.array(z.string()).optional().describe("All scopes where this dependency appears"),
    locations: z
      .array(z.string())
      .describe("List of build files where this dependency is declared"),
  })
  .passthrough();

/**
 * Schema for the Bill of Materials
 */
export const billOfMaterialsSchema = z
  .object({
    dependencies: z
      .array(bomDependencySchema)
      .describe("Comprehensive list of all dependencies with version conflict detection"),
    totalDependencies: z.number().describe("Total unique dependencies across all build files"),
    conflictCount: z.number().describe("Number of dependencies with version conflicts"),
    buildFiles: z.array(z.string()).describe("List of build files analyzed"),
  })
  .passthrough();

/**
 * Schema for a complex method with quality metrics
 */
export const complexMethodSchema = z
  .object({
    methodName: z.string().describe("Fully qualified method name"),
    filePath: z.string().describe("File path where the method is located"),
    complexity: z.number().describe("Cyclomatic complexity score"),
    linesOfCode: z.number().describe("Number of lines of code"),
    codeSmells: z.array(z.string()).optional().describe("Code smells in this method"),
  })
  .passthrough();

/**
 * Schema for code smell summary statistics
 */
export const codeSmellSummarySchema = z
  .object({
    smellType: z.string().describe("Type of code smell"),
    occurrences: z.number().describe("Number of occurrences across the codebase"),
    affectedFiles: z.number().describe("Number of files affected"),
  })
  .passthrough();

/**
 * Schema for code quality summary with complexity and smell analysis
 */
export const codeQualitySummarySchema = z
  .object({
    topComplexMethods: z
      .array(complexMethodSchema)
      .describe("Top 10 most complex methods across the codebase"),
    commonCodeSmells: z
      .array(codeSmellSummarySchema)
      .describe("Most frequently occurring code smells with statistics"),
    overallStatistics: z.object({
      totalMethods: z.number().describe("Total methods analyzed"),
      averageComplexity: z.number().describe("Average cyclomatic complexity"),
      highComplexityCount: z.number().describe("Methods with complexity > 10"),
      veryHighComplexityCount: z.number().describe("Methods with complexity > 20"),
      averageMethodLength: z.number().describe("Average method length in LOC"),
      longMethodCount: z.number().describe("Methods with > 50 lines of code"),
    }),
  })
  .passthrough();

/**
 * Schema for aggregated job information in the summary
 */
export const scheduledJobSummaryItemSchema = z
  .object({
    jobName: z.string().describe("Name of the job"),
    sourceFile: z.string().describe("Source file containing the job definition"),
    trigger: z.string().describe("Trigger mechanism (cron, manual, event-driven, etc.)"),
    purpose: z.string().describe("Purpose of the job"),
    inputResources: z.array(z.string()).optional().describe("Input resources"),
    outputResources: z.array(z.string()).optional().describe("Output resources"),
    dependencies: z.array(z.string()).optional().describe("Job dependencies"),
  })
  .passthrough();

/**
 * Schema for scheduled jobs summary
 */
export const scheduledJobsSummarySchema = z
  .object({
    jobs: z
      .array(scheduledJobSummaryItemSchema)
      .describe("List of all scheduled jobs and batch processes discovered"),
    totalJobs: z.number().describe("Total number of jobs found"),
    triggerTypes: z
      .array(z.string())
      .describe("Unique trigger types found (cron, manual, event-driven, etc.)"),
    jobFiles: z.array(z.string()).describe("Source files containing job definitions"),
  })
  .passthrough();

/**
 * Schema for a single module coupling relationship
 */
export const moduleCouplingItemSchema = z
  .object({
    fromModule: z.string().describe("Source module name"),
    toModule: z.string().describe("Target module name"),
    referenceCount: z.number().describe("Number of references from source to target module"),
  })
  .passthrough();

/**
 * Schema for module coupling analysis
 */
export const moduleCouplingSchema = z
  .object({
    couplings: z
      .array(moduleCouplingItemSchema)
      .describe("List of all module-to-module coupling relationships"),
    totalModules: z.number().describe("Total number of unique modules identified"),
    totalCouplings: z.number().describe("Total number of coupling relationships"),
    highestCouplingCount: z.number().describe("Highest reference count between any two modules"),
    moduleDepth: z.number().describe("Directory depth used for module identification"),
  })
  .passthrough();

/**
 * Schema for identified UI framework
 */
export const uiFrameworkItemSchema = z
  .object({
    name: z.string().describe("Framework name (e.g., 'Struts', 'JSF', 'Spring MVC')"),
    version: z.string().optional().describe("Framework version if identifiable"),
    configFiles: z
      .array(z.string())
      .describe("Configuration files where this framework was detected"),
  })
  .passthrough();

/**
 * Schema for custom tag library usage statistics
 */
export const customTagLibrarySchema = z
  .object({
    prefix: z.string().describe("Tag library prefix"),
    uri: z.string().describe("Tag library URI"),
    usageCount: z.number().describe("Number of JSP files using this tag library"),
  })
  .passthrough();

/**
 * Schema for JSP file with scriptlet metrics
 */
export const jspFileMetricsSchema = z
  .object({
    filePath: z.string().describe("Path to the JSP file"),
    scriptletCount: z.number().describe("Number of Java scriptlets"),
    expressionCount: z.number().describe("Number of expressions"),
    declarationCount: z.number().describe("Number of declarations"),
    totalScriptletBlocks: z
      .number()
      .describe("Total scriptlet-related blocks (scriptlets + expressions + declarations)"),
  })
  .passthrough();

/**
 * Schema for UI technology analysis summary
 */
export const uiTechnologyAnalysisSchema = z
  .object({
    frameworks: z
      .array(uiFrameworkItemSchema)
      .describe("List of UI frameworks detected in the application"),
    totalJspFiles: z.number().describe("Total number of JSP files analyzed"),
    totalScriptlets: z.number().describe("Total scriptlets across all JSP files"),
    totalExpressions: z.number().describe("Total expressions across all JSP files"),
    totalDeclarations: z.number().describe("Total declarations across all JSP files"),
    averageScriptletsPerFile: z
      .number()
      .describe("Average scriptlet blocks per JSP file (technical debt indicator)"),
    filesWithHighScriptletCount: z
      .number()
      .describe("Number of JSP files with >10 scriptlet blocks"),
    customTagLibraries: z
      .array(customTagLibrarySchema)
      .describe("De-duplicated list of custom tag libraries used"),
    topScriptletFiles: z
      .array(jspFileMetricsSchema)
      .describe("Top 10 JSP files with highest scriptlet counts"),
  })
  .passthrough();

/**
 * Schema for full application summary of categories
 */
export const appSummarySchema = z
  .object({
    projectName: z.string(),
    llmProvider: z.string(),
    appDescription: appDescriptionSchema.shape.appDescription.optional(),
    businessProcesses: businessProcessesSchema.shape.businessProcesses.optional(),
    technologies: technologiesSchema.shape.technologies.optional(),
    boundedContexts: boundedContextsSchema.shape.boundedContexts.optional(),
    aggregates: aggregatesSchema.shape.aggregates.optional(),
    entities: entitiesSchema.shape.entities.optional(),
    repositories: repositoriesSchema.shape.repositories.optional(),
    potentialMicroservices: potentialMicroservicesSchema.shape.potentialMicroservices.optional(),
    billOfMaterials: billOfMaterialsSchema.shape.dependencies.optional(),
    codeQualitySummary: codeQualitySummarySchema.optional(),
    scheduledJobsSummary: scheduledJobsSummarySchema.optional(),
    moduleCoupling: moduleCouplingSchema.optional(),
    uiTechnologyAnalysis: uiTechnologyAnalysisSchema.optional(),
  })
  .passthrough();
