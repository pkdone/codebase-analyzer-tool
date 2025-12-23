import {
  appDescriptionSchema,
  boundedContextsSchema,
  businessProcessesSchema,
  potentialMicroservicesSchema,
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
 *
 * Note: aggregates, entities, and repositories are now captured within the boundedContexts
 * category as a hierarchical structure to ensure naming consistency across domain elements.
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
    label: "Domain Model",
    instructions: [
      buildInstructionBlock(
        "Instructions",
        `${APP_SUMMARY_PROMPT_FRAGMENTS.CONCISE_LIST} of Domain-Driven Design Bounded Contexts that define explicit boundaries around related business capabilities. For each bounded context, include:
1. Its aggregates that enforce business rules and maintain consistency
2. For each aggregate, include:
   - A repository that provides persistence for that aggregate
   - The domain entities it manages with their descriptions and relationships

This hierarchical structure ensures consistent naming across all domain elements within each bounded context`,
      ),
    ] as const,
    responseSchema: boundedContextsSchema,
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
