import { potentialMicroservicesSchema } from "../../../schemas/app-summaries.schema";
import { PromptDefinition } from "../../types/prompt-definition.types";
import { APP_SUMMARY_FRAGMENTS } from "../fragments";

const INSTRUCTION = `${APP_SUMMARY_FRAGMENTS.CONCISE_LIST} of recommended microservices to modernize the monolithic application architecture, each following the Single Responsibility Principle with detailed domain entities, defined CRUD operations, and REST API endpoints`;

export const potentialMicroservicesPrompt: PromptDefinition = {
  label: "Potential Microservices",
  contentDesc: `${APP_SUMMARY_FRAGMENTS.CONCISE_LIST} of recommended microservices ${APP_SUMMARY_FRAGMENTS.MODERNIZATION_RECOMMENDATIONS}`,
  responseSchema: potentialMicroservicesSchema,
  instructions: [
    {
      points: [INSTRUCTION],
    },
  ],
};
