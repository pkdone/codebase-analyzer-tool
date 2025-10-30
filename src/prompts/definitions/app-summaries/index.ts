import { AppSummaryCategoryType } from "../../types/app-summaries.types";
import { aggregatesPrompt } from "./aggregates.prompt";
import { appDescriptionPrompt } from "./appDescription.prompt";
import { billOfMaterialsPrompt } from "./billOfMaterials.prompt";
import { boundedContextsPrompt } from "./boundedContexts.prompt";
import { businessProcessesPrompt } from "./businessProcesses.prompt";
import { codeQualitySummaryPrompt } from "./codeQualitySummary.prompt";
import { entitiesPrompt } from "./entities.prompt";
import { moduleCouplingPrompt } from "./moduleCoupling.prompt";
import { potentialMicroservicesPrompt } from "./potentialMicroservices.prompt";
import { repositoriesPrompt } from "./repositories.prompt";
import { scheduledJobsSummaryPrompt } from "./scheduledJobsSummary.prompt";
import { technologiesPrompt } from "./technologies.prompt";
import { uiTechnologyAnalysisPrompt } from "./uiTechnologyAnalysis.prompt";

/**
 * Data-driven mapping of app summary categories to their templates and schemas
 */
export const appSummaryPromptMetadata: Record<AppSummaryCategoryType, typeof appDescriptionPrompt> =
  {
    aggregates: aggregatesPrompt,
    appDescription: appDescriptionPrompt,
    billOfMaterials: billOfMaterialsPrompt,
    boundedContexts: boundedContextsPrompt,
    businessProcesses: businessProcessesPrompt,
    codeQualitySummary: codeQualitySummaryPrompt,
    entities: entitiesPrompt,
    moduleCoupling: moduleCouplingPrompt,
    potentialMicroservices: potentialMicroservicesPrompt,
    repositories: repositoriesPrompt,
    scheduledJobsSummary: scheduledJobsSummaryPrompt,
    technologies: technologiesPrompt,
    uiTechnologyAnalysis: uiTechnologyAnalysisPrompt,
  } as const;
