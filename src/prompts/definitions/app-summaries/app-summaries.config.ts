import {
  aggregatesSchema,
  appDescriptionSchema,
  billOfMaterialsSchema,
  boundedContextsSchema,
  businessProcessesSchema,
  codeQualitySummarySchema,
  entitiesSchema,
  moduleCouplingSchema,
  potentialMicroservicesSchema,
  repositoriesSchema,
  scheduledJobsSummarySchema,
  technologiesSchema,
  uiTechnologyAnalysisSchema,
} from "../../../schemas/app-summaries.schema";
import { APP_SUMMARY_FRAGMENTS } from "../fragments";
import { APP_SUMMARY_TEMPLATE } from "../../templates/app-summaries-templates.prompt";
import { z } from "zod";

/**
 * Configuration entry for an app summary prompt definition
 */
interface AppSummaryConfigEntry {
  label: string;
  instruction: string;
  responseSchema: z.ZodType;
  template: string;
}

/**
 * Centralized configuration for all app summary prompt definitions.
 * This replaces the individual prompt definition files with a data-driven approach.
 *
 * Note: The `instruction` field serves both as the contentDesc (used in template)
 * and as the actual instruction point (what the LLM sees). For categories where
 * contentDesc and instructions differed in the original files, we use the
 * instruction point value to preserve the exact LLM prompt text.
 */
export const appSummaryConfigMap: Record<string, AppSummaryConfigEntry> = {
  appDescription: {
    label: "Application Description",
    instruction: APP_SUMMARY_FRAGMENTS.DETAILED_DESCRIPTION,
    responseSchema: appDescriptionSchema,
    template: APP_SUMMARY_TEMPLATE,
  },
  technologies: {
    label: "Technologies",
    instruction: `${APP_SUMMARY_FRAGMENTS.CONCISE_LIST} of key external and host platform technologies depended on by the application`,
    responseSchema: technologiesSchema,
    template: APP_SUMMARY_TEMPLATE,
  },
  businessProcesses: {
    label: "Business Processes",
    instruction: `${APP_SUMMARY_FRAGMENTS.CONCISE_LIST} of the application's main business processes with their key business activity steps that are linearly conducted by each process`,
    responseSchema: businessProcessesSchema,
    template: APP_SUMMARY_TEMPLATE,
  },
  boundedContexts: {
    label: "Bounded Contexts",
    instruction: `${APP_SUMMARY_FRAGMENTS.CONCISE_LIST} of Domain-Driven Design Bounded Contexts that define explicit boundaries around related business capabilities and their models`,
    responseSchema: boundedContextsSchema,
    template: APP_SUMMARY_TEMPLATE,
  },
  aggregates: {
    label: "Aggregates",
    instruction: `${APP_SUMMARY_FRAGMENTS.CONCISE_LIST} of Domain Driven Design aggregates that enforce business rules and maintain consistency, including their associated domain entities and repositories`,
    responseSchema: aggregatesSchema,
    template: APP_SUMMARY_TEMPLATE,
  },
  entities: {
    label: "Entities",
    instruction: `${APP_SUMMARY_FRAGMENTS.CONCISE_LIST} of Domain-Driven Design entities that represent core business concepts and contain business logic`,
    responseSchema: entitiesSchema,
    template: APP_SUMMARY_TEMPLATE,
  },
  repositories: {
    label: "Repositories",
    instruction: `${APP_SUMMARY_FRAGMENTS.CONCISE_LIST} of Domain Driven Design repositories that provide access to aggregate persistence, each associated with a specific aggregate`,
    responseSchema: repositoriesSchema,
    template: APP_SUMMARY_TEMPLATE,
  },
  potentialMicroservices: {
    label: "Potential Microservices",
    instruction: `${APP_SUMMARY_FRAGMENTS.CONCISE_LIST} of recommended microservices to modernize the monolithic application architecture, each following the Single Responsibility Principle with detailed domain entities, defined CRUD operations, and REST API endpoints`,
    responseSchema: potentialMicroservicesSchema,
    template: APP_SUMMARY_TEMPLATE,
  },
  billOfMaterials: {
    label: "Bill of Materials",
    instruction: `${APP_SUMMARY_FRAGMENTS.COMPREHENSIVE_LIST} of all third-party dependencies with version conflict detection to identify technical debt and security risks`,
    responseSchema: billOfMaterialsSchema,
    template: APP_SUMMARY_TEMPLATE,
  },
  codeQualitySummary: {
    label: "Code Quality Summary",
    instruction: APP_SUMMARY_FRAGMENTS.AGGREGATED_METRICS,
    responseSchema: codeQualitySummarySchema,
    template: APP_SUMMARY_TEMPLATE,
  },
  scheduledJobsSummary: {
    label: "Scheduled Jobs",
    instruction: `${APP_SUMMARY_FRAGMENTS.COMPREHENSIVE_LIST} of batch processes, scheduled jobs, and automated scripts that perform critical business operations`,
    responseSchema: scheduledJobsSummarySchema,
    template: APP_SUMMARY_TEMPLATE,
  },
  moduleCoupling: {
    label: "Module Coupling",
    instruction: APP_SUMMARY_FRAGMENTS.DEPENDENCY_MATRIX,
    responseSchema: moduleCouplingSchema,
    template: APP_SUMMARY_TEMPLATE,
  },
  uiTechnologyAnalysis: {
    label: "UI Technology Analysis",
    instruction: `${APP_SUMMARY_FRAGMENTS.COMPREHENSIVE_ANALYSIS} of UI layer technologies including legacy web frameworks, JSP scriptlet usage, and custom tag libraries to assess technical debt and plan modernization efforts`,
    responseSchema: uiTechnologyAnalysisSchema,
    template: APP_SUMMARY_TEMPLATE,
  },
} as const;
