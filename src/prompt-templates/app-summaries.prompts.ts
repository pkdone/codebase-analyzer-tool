import {
  appDescriptionSchema,
  boundedContextsSchema,
  entitiesSchema,
  businessProcessesSchema,
  technologiesSchema,
  aggregatesSchema,
  repositoriesSchema,
  potentialMicroservicesSchema,
  billOfMaterialsSchema,
  codeQualitySummarySchema,
  scheduledJobsSummarySchema,
  moduleCouplingSchema,
  uiTechnologyAnalysisSchema,
} from "../schemas/app-summaries.schema";
import { AppSummaryPromptTemplate, AppSummaryCategoryType } from "./app-summaries.types";

/**
 * Template for single-pass insight generation strategy.
 * Used for small to medium codebases that can be processed in one LLM call.
 */
export const SINGLE_PASS_INSIGHTS_TEMPLATE = `Act as a senior developer analyzing the code in a legacy application. Take the list of paths and descriptions of its {{contentDesc}} shown below in the section marked 'SOURCES', and based on their content, return a JSON response that contains {{specificInstructions}}.

The JSON response must follow this JSON schema:
\`\`\`json
{{jsonSchema}}
\`\`\`

{{forceJSON}}

SOURCES:
{{codeContent}}`;

/**
 * Template for partial insights generation (MAP phase of map-reduce strategy).
 * Used for processing subsets of code in large codebases.
 */
export const PARTIAL_INSIGHTS_TEMPLATE = `Act as a senior developer analyzing a subset of code. Based on the list of file summaries below in 'SOURCES', return a JSON response that contains {{specificInstructions}}. This is a partial analysis of a larger codebase; focus on extracting insights from this subset only. The JSON response must follow this JSON schema:
\`\`\`json
{{jsonSchema}}
\`\`\`

{{forceJSON}}

SOURCES:
{{codeContent}}`;

/**
 * Template for consolidating partial insights (REDUCE phase of map-reduce strategy).
 * Used for merging and de-duplicating results from multiple partial analyses.
 */
export const REDUCE_INSIGHTS_TEMPLATE = `Act as a senior developer. You have been provided with several JSON objects below in 'PARTIAL_DATA', each containing a list of '{{categoryKey}}' generated from different parts of a codebase. Your task is to consolidate these lists into a single, de-duplicated, and coherent final JSON object. Merge similar items, remove duplicates based on semantic similarity (not just exact name matches), and ensure the final list is comprehensive and well-organized. The final JSON response must follow this JSON schema:
\`\`\`json
{{jsonSchema}}
\`\`\`

{{forceJSON}}

PARTIAL_DATA:
{{codeContent}}`;

/**
 * Common instruction phrases used across multiple app summary templates
 */
const COMMON_INSTRUCTIONS = {
  DETAILED_DESCRIPTION: "a detailed description of the application's purpose and implementation",
  CONCISE_LIST: "a concise list",
  COMPREHENSIVE_LIST: "a comprehensive list",
  COMPREHENSIVE_ANALYSIS: "a comprehensive analysis",
  AGGREGATED_METRICS:
    "aggregated code quality metrics including complexity analysis, code smell detection, and maintainability indicators to help prioritize refactoring efforts",
  DEPENDENCY_MATRIX:
    "a dependency matrix showing coupling relationships between modules to identify highly coupled components (candidates for single services) and loosely coupled components (candidates for easy separation)",
  TECHNICAL_DEBT_ASSESSMENT: "to assess technical debt and plan modernization efforts",
  SECURITY_RISKS: "to identify technical debt and security risks",
  MODERNIZATION_RECOMMENDATIONS:
    "to modernize the monolithic application architecture, each following the Single Responsibility Principle with detailed domain entities, defined CRUD operations, and REST API endpoints",
} as const;

/**
 * Data-driven mapping of app summary categories to their templates and schemas
 */
export const appSummaryPromptMetadata: Record<AppSummaryCategoryType, AppSummaryPromptTemplate> = {
  appDescription: {
    label: "Application Description",
    description: COMMON_INSTRUCTIONS.DETAILED_DESCRIPTION,
    schema: appDescriptionSchema,
    summaryType: "application description",
    specificInstructions: COMMON_INSTRUCTIONS.DETAILED_DESCRIPTION,
  },

  technologies: {
    label: "Technologies",
    description: `${COMMON_INSTRUCTIONS.CONCISE_LIST} of key external and host platform technologies depended on by the application`,
    schema: technologiesSchema,
    summaryType: "technology inventory",
    specificInstructions: `${COMMON_INSTRUCTIONS.CONCISE_LIST} of key external and host platform technologies depended on by the application`,
  },

  businessProcesses: {
    label: "Business Processes",
    description: `${COMMON_INSTRUCTIONS.CONCISE_LIST} of the application's main business processes with their key business activity steps that are linearly conducted by each process`,
    schema: businessProcessesSchema,
    summaryType: "business process analysis",
    specificInstructions: `${COMMON_INSTRUCTIONS.CONCISE_LIST} of the application's main business processes with their key business activity steps that are linearly conducted by each process`,
  },

  boundedContexts: {
    label: "Bounded Contexts",
    description: `${COMMON_INSTRUCTIONS.CONCISE_LIST} of Domain-Driven Design Bounded Contexts that define explicit boundaries around related business capabilities and their models`,
    schema: boundedContextsSchema,
    summaryType: "bounded context analysis",
    specificInstructions: `${COMMON_INSTRUCTIONS.CONCISE_LIST} of Domain-Driven Design Bounded Contexts that define explicit boundaries around related business capabilities and their models`,
  },

  aggregates: {
    label: "Aggregates",
    description: `${COMMON_INSTRUCTIONS.CONCISE_LIST} of Domain Driven Design aggregates that enforce business rules and maintain consistency, including their associated domain entities and repositories`,
    schema: aggregatesSchema,
    summaryType: "domain aggregate analysis",
    specificInstructions: `${COMMON_INSTRUCTIONS.CONCISE_LIST} of Domain Driven Design aggregates that enforce business rules and maintain consistency, including their associated domain entities and repositories`,
  },

  entities: {
    label: "Entities",
    description: `${COMMON_INSTRUCTIONS.CONCISE_LIST} of Domain-Driven Design entities that represent core business concepts and contain business logic`,
    schema: entitiesSchema,
    summaryType: "domain entity analysis",
    specificInstructions: `${COMMON_INSTRUCTIONS.CONCISE_LIST} of Domain-Driven Design entities that represent core business concepts and contain business logic`,
  },

  repositories: {
    label: "Repositories",
    description: `${COMMON_INSTRUCTIONS.CONCISE_LIST} of Domain Driven Design repositories that provide access to aggregate persistence, each associated with a specific aggregate`,
    schema: repositoriesSchema,
    summaryType: "repository pattern analysis",
    specificInstructions: `${COMMON_INSTRUCTIONS.CONCISE_LIST} of Domain Driven Design repositories that provide access to aggregate persistence, each associated with a specific aggregate`,
  },

  potentialMicroservices: {
    label: "Potential Microservices",
    description: `${COMMON_INSTRUCTIONS.CONCISE_LIST} of recommended microservices ${COMMON_INSTRUCTIONS.MODERNIZATION_RECOMMENDATIONS}`,
    schema: potentialMicroservicesSchema,
    summaryType: "microservice recommendations",
    specificInstructions: `${COMMON_INSTRUCTIONS.CONCISE_LIST} of recommended microservices ${COMMON_INSTRUCTIONS.MODERNIZATION_RECOMMENDATIONS}`,
  },

  billOfMaterials: {
    label: "Bill of Materials",
    description: `${COMMON_INSTRUCTIONS.COMPREHENSIVE_LIST} of all third-party dependencies with version conflict detection ${COMMON_INSTRUCTIONS.SECURITY_RISKS}`,
    schema: billOfMaterialsSchema,
    summaryType: "dependency inventory",
    specificInstructions: `${COMMON_INSTRUCTIONS.COMPREHENSIVE_LIST} of all third-party dependencies with version conflict detection ${COMMON_INSTRUCTIONS.SECURITY_RISKS}`,
  },

  codeQualitySummary: {
    label: "Code Quality Summary",
    description: COMMON_INSTRUCTIONS.AGGREGATED_METRICS,
    schema: codeQualitySummarySchema,
    summaryType: "code quality analysis",
    specificInstructions: COMMON_INSTRUCTIONS.AGGREGATED_METRICS,
  },

  scheduledJobsSummary: {
    label: "Scheduled Jobs",
    description: `${COMMON_INSTRUCTIONS.COMPREHENSIVE_LIST} of batch processes, scheduled jobs, and automated scripts that perform critical business operations`,
    schema: scheduledJobsSummarySchema,
    summaryType: "scheduled job analysis",
    specificInstructions: `${COMMON_INSTRUCTIONS.COMPREHENSIVE_LIST} of batch processes, scheduled jobs, and automated scripts that perform critical business operations`,
  },

  moduleCoupling: {
    label: "Module Coupling",
    description: COMMON_INSTRUCTIONS.DEPENDENCY_MATRIX,
    schema: moduleCouplingSchema,
    summaryType: "module coupling analysis",
    specificInstructions: COMMON_INSTRUCTIONS.DEPENDENCY_MATRIX,
  },

  uiTechnologyAnalysis: {
    label: "UI Technology Analysis",
    description: `${COMMON_INSTRUCTIONS.COMPREHENSIVE_ANALYSIS} of UI layer technologies including legacy web frameworks, JSP scriptlet usage, and custom tag libraries ${COMMON_INSTRUCTIONS.TECHNICAL_DEBT_ASSESSMENT}`,
    schema: uiTechnologyAnalysisSchema,
    summaryType: "UI technology analysis",
    specificInstructions: `${COMMON_INSTRUCTIONS.COMPREHENSIVE_ANALYSIS} of UI layer technologies including legacy web frameworks, JSP scriptlet usage, and custom tag libraries ${COMMON_INSTRUCTIONS.TECHNICAL_DEBT_ASSESSMENT}`,
  },
} as const;
