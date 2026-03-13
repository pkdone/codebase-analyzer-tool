#!/usr/bin/env node
import { Command } from "commander";
import { runApplication } from "./lifecycle/application-runner";
import { taskTokens } from "./di/tokens";
import type { DeleteProjectTask } from "./tasks/dev/delete-project.task";

/**
 * Defines a CLI command that delegates to a registered task via the DI container.
 */
function taskCommand(program: Command, name: string, description: string, taskToken: symbol): void {
  program
    .command(name)
    .description(description)
    .action(() => void runApplication(taskToken));
}

const program = new Command();

program
  .name("cba")
  .description("Codebase Analyzer Tools — capture, analyze, and report on application codebases")
  .version("1.0.0");

// Main workflow commands
taskCommand(program, "capture", "Capture LLM-generated metadata for every source file into the database", taskTokens.CodebaseCaptureTask);
taskCommand(program, "insights", "Generate insights (tech stack, DDD aggregates, etc.) from database-captured sources", taskTokens.InsightsGenerationTask);
taskCommand(program, "insights-files", "Generate insights directly from source files (bypasses database)", taskTokens.FileBasedInsightsGenerationTask);
taskCommand(program, "report", "Generate a static HTML report from captured metadata and insights", taskTokens.ReportGenerationTask);
taskCommand(program, "query", "Query the codebase using MongoDB Atlas Vector Search", taskTokens.CodebaseQueryTask);
taskCommand(program, "pipeline", "Run the full workflow: capture -> insights -> report", taskTokens.PipelineTask);

// Utility commands
taskCommand(program, "projects", "List all projects stored in the database with summary statistics", taskTokens.ListProjectsTask);
taskCommand(program, "models", "List all available LLM models for completions and embeddings", taskTokens.ListAvailableModelsTask);

program
  .command("delete <project-name>")
  .description("Delete a project and all its data (sources and insights) from the database")
  .action((projectName: string) => {
    void runApplication(taskTokens.DeleteProjectTask, (task) => {
      (task as DeleteProjectTask).targetProjectName = projectName;
    });
  });

// Diagnostic commands
taskCommand(program, "test-mdb", "Test the MongoDB connection", taskTokens.MongoConnectionTestTask);
taskCommand(program, "test-llm", "Test configured LLM providers", taskTokens.PluggableLLMsTestTask);

program.action(() => {
  program.outputHelp();
});

program.parse();
