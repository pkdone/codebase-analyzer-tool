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
import { AppSummaryPromptTemplate, AppSummaryCategoryType } from "./types/app-summaries.types";

/**
 * Common instruction fragments used across multiple app summary templates
 * These are composed into instruction arrays for consistency
 */
const COMMON_INSTRUCTION_FRAGMENTS = {
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
    summaryType: "application description",
    contentDescription: COMMON_INSTRUCTION_FRAGMENTS.DETAILED_DESCRIPTION,
    responseSchema: appDescriptionSchema,
    instructions: [COMMON_INSTRUCTION_FRAGMENTS.DETAILED_DESCRIPTION],
  },

  technologies: {
    label: "Technologies",
    summaryType: "technology inventory",
    contentDescription: `${COMMON_INSTRUCTION_FRAGMENTS.CONCISE_LIST} of key external and host platform technologies depended on by the application`,
    responseSchema: technologiesSchema,
    instructions: [
      "a concise list of key external and host platform technologies depended on by the application",
    ],
  },

  businessProcesses: {
    label: "Business Processes",
    summaryType: "business process analysis",
    contentDescription: `${COMMON_INSTRUCTION_FRAGMENTS.CONCISE_LIST} of the application's main business processes with their key business activity steps that are linearly conducted by each process`,
    responseSchema: businessProcessesSchema,
    instructions: [
      "a concise list of the application's main business processes with their key business activity steps that are linearly conducted by each process",
    ],
  },

  boundedContexts: {
    label: "Bounded Contexts",
    summaryType: "bounded context analysis",
    contentDescription: `${COMMON_INSTRUCTION_FRAGMENTS.CONCISE_LIST} of Domain-Driven Design Bounded Contexts that define explicit boundaries around related business capabilities and their models`,
    responseSchema: boundedContextsSchema,
    instructions: [
      "a concise list of Domain-Driven Design Bounded Contexts that define explicit boundaries around related business capabilities and their models",
    ],
  },

  aggregates: {
    label: "Aggregates",
    summaryType: "domain aggregate analysis",
    contentDescription: `${COMMON_INSTRUCTION_FRAGMENTS.CONCISE_LIST} of Domain Driven Design aggregates that enforce business rules and maintain consistency, including their associated domain entities and repositories`,
    responseSchema: aggregatesSchema,
    instructions: [
      "a concise list of Domain Driven Design aggregates that enforce business rules and maintain consistency, including their associated domain entities and repositories",
    ],
  },

  entities: {
    label: "Entities",
    summaryType: "domain entity analysis",
    contentDescription: `${COMMON_INSTRUCTION_FRAGMENTS.CONCISE_LIST} of Domain-Driven Design entities that represent core business concepts and contain business logic`,
    responseSchema: entitiesSchema,
    instructions: [
      "a concise list of Domain-Driven Design entities that represent core business concepts and contain business logic",
    ],
  },

  repositories: {
    label: "Repositories",
    summaryType: "repository pattern analysis",
    contentDescription: `${COMMON_INSTRUCTION_FRAGMENTS.CONCISE_LIST} of Domain Driven Design repositories that provide access to aggregate persistence, each associated with a specific aggregate`,
    responseSchema: repositoriesSchema,
    instructions: [
      "a concise list of Domain Driven Design repositories that provide access to aggregate persistence, each associated with a specific aggregate",
    ],
  },

  potentialMicroservices: {
    label: "Potential Microservices",
    summaryType: "microservice recommendations",
    contentDescription: `${COMMON_INSTRUCTION_FRAGMENTS.CONCISE_LIST} of recommended microservices ${COMMON_INSTRUCTION_FRAGMENTS.MODERNIZATION_RECOMMENDATIONS}`,
    responseSchema: potentialMicroservicesSchema,
    instructions: [
      "a concise list of recommended microservices to modernize the monolithic application architecture, each following the Single Responsibility Principle with detailed domain entities, defined CRUD operations, and REST API endpoints",
    ],
  },

  billOfMaterials: {
    label: "Bill of Materials",
    summaryType: "dependency inventory",
    contentDescription: `${COMMON_INSTRUCTION_FRAGMENTS.COMPREHENSIVE_LIST} of all third-party dependencies with version conflict detection ${COMMON_INSTRUCTION_FRAGMENTS.SECURITY_RISKS}`,
    responseSchema: billOfMaterialsSchema,
    instructions: [
      "a comprehensive list of all third-party dependencies with version conflict detection to identify technical debt and security risks",
    ],
  },

  codeQualitySummary: {
    label: "Code Quality Summary",
    summaryType: "code quality analysis",
    contentDescription: COMMON_INSTRUCTION_FRAGMENTS.AGGREGATED_METRICS,
    responseSchema: codeQualitySummarySchema,
    instructions: [COMMON_INSTRUCTION_FRAGMENTS.AGGREGATED_METRICS],
  },

  scheduledJobsSummary: {
    label: "Scheduled Jobs",
    summaryType: "scheduled job analysis",
    contentDescription: `${COMMON_INSTRUCTION_FRAGMENTS.COMPREHENSIVE_LIST} of batch processes, scheduled jobs, and automated scripts that perform critical business operations`,
    responseSchema: scheduledJobsSummarySchema,
    instructions: [
      "a comprehensive list of batch processes, scheduled jobs, and automated scripts that perform critical business operations",
    ],
  },

  moduleCoupling: {
    label: "Module Coupling",
    summaryType: "module coupling analysis",
    contentDescription: COMMON_INSTRUCTION_FRAGMENTS.DEPENDENCY_MATRIX,
    responseSchema: moduleCouplingSchema,
    instructions: [COMMON_INSTRUCTION_FRAGMENTS.DEPENDENCY_MATRIX],
  },

  uiTechnologyAnalysis: {
    label: "UI Technology Analysis",
    summaryType: "UI technology analysis",
    contentDescription: `${COMMON_INSTRUCTION_FRAGMENTS.COMPREHENSIVE_ANALYSIS} of UI layer technologies including legacy web frameworks, JSP scriptlet usage, and custom tag libraries ${COMMON_INSTRUCTION_FRAGMENTS.TECHNICAL_DEBT_ASSESSMENT}`,
    responseSchema: uiTechnologyAnalysisSchema,
    instructions: [
      "a comprehensive analysis of UI layer technologies including legacy web frameworks, JSP scriptlet usage, and custom tag libraries to assess technical debt and plan modernization efforts",
    ],
  },
} as const;
