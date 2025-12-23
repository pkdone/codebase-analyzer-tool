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
import { APP_SUMMARY_PROMPT_FRAGMENTS } from "./app-summaries.fragments";
import { buildInstructionBlock } from "../instruction-utils";
import { z } from "zod";

/**
 * Configuration entry for an app summary prompt definition
 */
export interface AppSummaryConfigEntry {
  label: string;
  instructions: readonly string[];
  responseSchema: z.ZodType;
}

/**
 * Centralized configuration for all app summary prompt definitions.
 * This replaces the individual prompt definition files with a data-driven approach.
 *
 * Note: The `instructions` field contains the specific instruction text that will be used
 * in the PromptDefinition. The PromptDefinition's contentDesc field will be set to a
 * generic value like "a set of source file summaries".
 */
export const appSummaryConfigMap: Record<string, AppSummaryConfigEntry> = {
  appDescription: {
    label: "Application Description",
    instructions: [
      buildInstructionBlock(
        "Instructions",
        "a detailed description of the application's purpose and implementation",
      ),
    ] as const,
    responseSchema: appDescriptionSchema,
  },
  technologies: {
    label: "Technologies",
    instructions: [
      buildInstructionBlock(
        "Instructions",
        `${APP_SUMMARY_PROMPT_FRAGMENTS.COMPREHENSIVE_LIST} of key external and host platform technologies (including the names of programming languages used) depended on by the application`,
      ),
    ] as const,
    responseSchema: technologiesSchema,
  },
  businessProcesses: {
    label: "Business Processes",
    instructions: [
      buildInstructionBlock(
        "Instructions",
        `${APP_SUMMARY_PROMPT_FRAGMENTS.CONCISE_LIST} of the application's main business processes with their key business activity steps that are linearly conducted by each process`,
      ),
    ] as const,
    responseSchema: businessProcessesSchema,
  },
  boundedContexts: {
    label: "Bounded Contexts",
    instructions: [
      buildInstructionBlock(
        "Instructions",
        `${APP_SUMMARY_PROMPT_FRAGMENTS.CONCISE_LIST} of Domain-Driven Design Bounded Contexts that define explicit boundaries around related business capabilities and their models`,
      ),
    ] as const,
    responseSchema: boundedContextsSchema,
  },
  aggregates: {
    label: "Aggregates",
    instructions: [
      buildInstructionBlock(
        "Instructions",
        `${APP_SUMMARY_PROMPT_FRAGMENTS.CONCISE_LIST} of Domain Driven Design aggregates that enforce business rules and maintain consistency, including their associated domain entities and repositories`,
      ),
    ] as const,
    responseSchema: aggregatesSchema,
  },
  entities: {
    label: "Entities",
    instructions: [
      buildInstructionBlock(
        "Instructions",
        `${APP_SUMMARY_PROMPT_FRAGMENTS.CONCISE_LIST} of Domain-Driven Design entities that represent core business concepts and contain business logic`,
      ),
    ] as const,
    responseSchema: entitiesSchema,
  },
  repositories: {
    label: "Repositories",
    instructions: [
      buildInstructionBlock(
        "Instructions",
        `${APP_SUMMARY_PROMPT_FRAGMENTS.CONCISE_LIST} of Domain Driven Design repositories that provide access to aggregate persistence, each associated with a specific aggregate`,
      ),
    ] as const,
    responseSchema: repositoriesSchema,
  },
  potentialMicroservices: {
    label: "Potential Microservices",
    instructions: [
      buildInstructionBlock(
        "Instructions",
        `${APP_SUMMARY_PROMPT_FRAGMENTS.CONCISE_LIST} of recommended microservices to modernize the monolithic application architecture, each following the Single Responsibility Principle with detailed domain entities, defined CRUD operations, and REST API endpoints`,
      ),
    ] as const,
    responseSchema: potentialMicroservicesSchema,
  },
} as const;
