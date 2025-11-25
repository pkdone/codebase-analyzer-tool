import {
  aggregatesSchema,
  appDescriptionSchema,
  boundedContextsSchema,
  businessProcessesSchema,
  entitiesSchema,
  potentialMicroservicesSchema,
  repositoriesSchema,
  technologiesSchema,
} from "../../../schemas/app-summaries.schema";
import { APP_SUMMARY_FRAGMENTS } from "../fragments";
import { z } from "zod";

/**
 * Configuration entry for an app summary prompt definition
 */
export interface AppSummaryConfigEntry {
  label: string;
  contentDesc: string;
  responseSchema: z.ZodType;
}

/**
 * Centralized configuration for all app summary prompt definitions.
 * This replaces the individual prompt definition files with a data-driven approach.
 *
 * Note: The `contentDesc` field contains the specific instruction text that will be used
 * to build the instructions array in the PromptDefinition. The PromptDefinition's contentDesc
 * field will be set to a generic value like "a set of source file summaries".
 */
export const appSummaryConfigMap: Record<string, AppSummaryConfigEntry> = {
  appDescription: {
    label: "Application Description",
    contentDesc: APP_SUMMARY_FRAGMENTS.DETAILED_DESCRIPTION,
    responseSchema: appDescriptionSchema,
  },
  technologies: {
    label: "Technologies",
    contentDesc: `${APP_SUMMARY_FRAGMENTS.CONCISE_LIST} of key external and host platform technologies depended on by the application`,
    responseSchema: technologiesSchema,
  },
  businessProcesses: {
    label: "Business Processes",
    contentDesc: `${APP_SUMMARY_FRAGMENTS.CONCISE_LIST} of the application's main business processes with their key business activity steps that are linearly conducted by each process`,
    responseSchema: businessProcessesSchema,
  },
  boundedContexts: {
    label: "Bounded Contexts",
    contentDesc: `${APP_SUMMARY_FRAGMENTS.CONCISE_LIST} of Domain-Driven Design Bounded Contexts that define explicit boundaries around related business capabilities and their models`,
    responseSchema: boundedContextsSchema,
  },
  aggregates: {
    label: "Aggregates",
    contentDesc: `${APP_SUMMARY_FRAGMENTS.CONCISE_LIST} of Domain Driven Design aggregates that enforce business rules and maintain consistency, including their associated domain entities and repositories`,
    responseSchema: aggregatesSchema,
  },
  entities: {
    label: "Entities",
    contentDesc: `${APP_SUMMARY_FRAGMENTS.CONCISE_LIST} of Domain-Driven Design entities that represent core business concepts and contain business logic`,
    responseSchema: entitiesSchema,
  },
  repositories: {
    label: "Repositories",
    contentDesc: `${APP_SUMMARY_FRAGMENTS.CONCISE_LIST} of Domain Driven Design repositories that provide access to aggregate persistence, each associated with a specific aggregate`,
    responseSchema: repositoriesSchema,
  },
  potentialMicroservices: {
    label: "Potential Microservices",
    contentDesc: `${APP_SUMMARY_FRAGMENTS.CONCISE_LIST} of recommended microservices to modernize the monolithic application architecture, each following the Single Responsibility Principle with detailed domain entities, defined CRUD operations, and REST API endpoints`,
    responseSchema: potentialMicroservicesSchema,
  },
} as const;
