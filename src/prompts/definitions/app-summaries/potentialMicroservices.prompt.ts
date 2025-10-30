import { potentialMicroservicesSchema } from "../../../schemas/app-summaries.schema";
import { AppSummaryPromptTemplate } from "../../types/app-summaries.types";
import { COMMON_INSTRUCTION_FRAGMENTS } from "./common-fragments";

export const potentialMicroservicesPrompt: AppSummaryPromptTemplate = {
  label: "Potential Microservices",
  summaryType: "microservice recommendations",
  contentDescription: `${COMMON_INSTRUCTION_FRAGMENTS.CONCISE_LIST} of recommended microservices ${COMMON_INSTRUCTION_FRAGMENTS.MODERNIZATION_RECOMMENDATIONS}`,
  responseSchema: potentialMicroservicesSchema,
  instructions: [
    {
      points: [
        "a concise list of recommended microservices to modernize the monolithic application architecture, each following the Single Responsibility Principle with detailed domain entities, defined CRUD operations, and REST API endpoints",
      ],
    },
  ],
};
