import { injectable, inject } from "tsyringe";
import LLMRouter from "../../llm/core/llm-router";
import { LLMOutputFormat } from "../../llm/types/llm.types";
import { appConfig } from "../../config/app.config";
import { logErrorMsgAndDetail, logWarningMsg } from "../../common/utils/error-utils";
import { joinArrayWithSeparators } from "../../common/utils/text-utils";
import type { AppSummariesRepository } from "../../repositories/app-summary/app-summaries.repository.interface";
import type { SourcesRepository } from "../../repositories/source/sources.repository.interface";
import { TOKENS } from "../../di/tokens";
import { summaryCategoriesConfig } from "./insights.config";
import { AppSummaryCategories } from "../../schemas/app-summaries.schema";
import { createPromptFromConfig } from "../../llm/core/utils/msgProcessing/prompt-templator";
import type { InsightsGenerator } from "./insights-generator.interface";
import { PartialAppSummaryRecord, AppSummaryCategoryEnum } from "./insights.types";

// Mark schema as being easy for LLMs to digest
const IS_TRICKY_SCHEMA = false;

/**
 * Generates metadata in database collections to capture application information,
 * such as entities and processes, for a given project.
 */
@injectable()
export default class InsightsFromDBGenerator implements InsightsGenerator {
  // Private fields
  private readonly APP_CATEGORY_SUMMARIZER_TEMPLATE =
    "Act as a senior developer analyzing the code in a legacy application. Take the list of paths and descriptions of its {{contentDesc}} shown below in the section marked 'SOURCES', and based on their content, return a JSON response that contains {{specificInstructions}}.\n\nThe JSON response must follow this JSON schema:\n```json\n{{jsonSchema}}\n```\n\n{{forceJSON}}\n\nSOURCES:\n{{codeContent}}";
  private readonly llmProviderDescription: string;

  /**
   * Creates a new SummariesGenerator.
   */
  constructor(
    @inject(TOKENS.AppSummariesRepository)
    private readonly appSummariesRepository: AppSummariesRepository,
    @inject(TOKENS.LLMRouter) private readonly llmRouter: LLMRouter,
    @inject(TOKENS.SourcesRepository) private readonly sourcesRepository: SourcesRepository,
    @inject(TOKENS.ProjectName) private readonly projectName: string,
  ) {
    this.llmProviderDescription = this.llmRouter.getModelsUsedDescription();
  }

  /**
   * Gathers metadata about all classes in an application and uses an LLM to identify
   * the entities and processes for the application, storing the results
   * in the database.
   */
  async generateSummariesBackIntoDB(): Promise<void> {
    const sourceFileSummaries = await this.getSourceFileSummaries();

    if (sourceFileSummaries.length === 0) {
      throw new Error(
        "No existing code file summaries found in the metadata database. " +
          "Please ensure you have run the script to process the source data first.",
      );
    }

    await this.appSummariesRepository.createOrReplaceAppSummary({
      projectName: this.projectName,
      llmProvider: this.llmProviderDescription,
    });
    const categories: AppSummaryCategoryEnum[] = AppSummaryCategories.options;
    await Promise.all(
      categories.map(async (category) =>
        this.generateAndRecordDataForCategory(category, sourceFileSummaries),
      ),
    );
  }

  /**
   * Returns a list of source file summaries with basic info.
   */
  private async getSourceFileSummaries(): Promise<string[]> {
    const srcFilesList: string[] = [];
    const records = await this.sourcesRepository.getProjectSourcesSummaries(this.projectName, [
      ...appConfig.CODE_FILE_EXTENSIONS,
    ]);

    for (const record of records) {
      if (!record.summary || Object.keys(record.summary).length === 0) {
        console.log(`No source code summary exists for file: ${record.filepath}. Skipping.`);
        continue;
      }

      const fileLabel = record.summary.classpath ?? record.filepath;
      const purpose = record.summary.purpose;
      const implementation = record.summary.implementation;
      srcFilesList.push(`* ${fileLabel}: ${purpose} ${implementation}`);
    }

    return srcFilesList;
  }

  /**
   * Calls an LLM to summarize a specific set of data (i.e., one category), and then saves the
   * dataset under a named field of the main application summary record.
   */
  private async generateAndRecordDataForCategory(
    category: AppSummaryCategoryEnum,
    sourceFileSummaries: string[],
  ): Promise<void> {
    const categoryLabel = summaryCategoriesConfig[category].label;

    try {
      console.log(`Processing ${categoryLabel}`);
      const categorySummaryData = await this.getCategorySummaryAsValidatedJSON(
        category,
        sourceFileSummaries,
      );
      if (!categorySummaryData) return;
      await this.appSummariesRepository.updateAppSummary(this.projectName, categorySummaryData);
      console.log(`Captured main ${categoryLabel} summary details into database`);
    } catch (error: unknown) {
      logErrorMsgAndDetail(`Unable to generate ${categoryLabel} details into database`, error);
    }
  }

  /**
   * Calls an LLM to summarize a specific set of data (i.e., one category), and then saves the
   * dataset under a named field of the main application summary record.
   */
  private async getCategorySummaryAsValidatedJSON(
    category: AppSummaryCategoryEnum,
    sourceFileSummaries: string[],
  ): Promise<PartialAppSummaryRecord | null> {
    const categoryLabel = summaryCategoriesConfig[category].label;

    try {
      const schema = summaryCategoriesConfig[category].schema;
      const content = joinArrayWithSeparators(sourceFileSummaries);
      const prompt = this.createInsightsForCategoryPrompt(category, content);
      const llmResponse = await this.llmRouter.executeCompletion<PartialAppSummaryRecord>(
        category,
        prompt,
        {
          outputFormat: LLMOutputFormat.JSON,
          jsonSchema: schema,
          hasComplexSchema: IS_TRICKY_SCHEMA,
        },
      );
      return llmResponse;
    } catch (error) {
      logWarningMsg(
        `${error instanceof Error ? error.message : "Unknown error"} for ${categoryLabel}`,
      );
      return null;
    }
  }

  /**
   * Create a prompt for the LLM to generate insights for a specific categories
   */
  private createInsightsForCategoryPrompt(
    type: AppSummaryCategoryEnum,
    codeContent: string,
  ): string {
    const config = summaryCategoriesConfig[type];
    return createPromptFromConfig(
      this.APP_CATEGORY_SUMMARIZER_TEMPLATE,
      "source files",
      config.description,
      config.schema,
      codeContent,
    );
  }
}
