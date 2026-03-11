import { Command } from "commander";

jest.mock("./../../src/app/lifecycle/application-runner", () => ({
  runApplication: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("./../../src/app/di/tokens", () => {
  const tokens: Record<string, symbol> = {
    CodebaseCaptureTask: Symbol("CodebaseCaptureTask"),
    CodebaseQueryTask: Symbol("CodebaseQueryTask"),
    InsightsGenerationTask: Symbol("InsightsGenerationTask"),
    FileBasedInsightsGenerationTask: Symbol("FileBasedInsightsGenerationTask"),
    PluggableLLMsTestTask: Symbol("PluggableLLMsTestTask"),
    MongoConnectionTestTask: Symbol("MongoConnectionTestTask"),
    ReportGenerationTask: Symbol("ReportGenerationTask"),
    ListAvailableModelsTask: Symbol("ListAvailableModelsTask"),
    ListProjectsTask: Symbol("ListProjectsTask"),
    DeleteProjectTask: Symbol("DeleteProjectTask"),
  };

  return { taskTokens: tokens };
});

/**
 * Build a fresh Commander program using the same wiring logic as cli.ts
 * without triggering process.argv parsing or process.exit.
 */
function buildTestProgram(): Command {
  const { taskTokens } = jest.requireMock("./../../src/app/di/tokens");
  const { runApplication } = jest.requireMock("./../../src/app/lifecycle/application-runner");

  const program = new Command();
  program.name("cba").exitOverride();

  const commands: { name: string; description: string; token: symbol }[] = [
    { name: "capture", description: "Capture LLM-generated metadata for every source file into the database", token: taskTokens.CodebaseCaptureTask },
    { name: "insights", description: "Generate insights (tech stack, DDD aggregates, etc.) from database-captured sources", token: taskTokens.InsightsGenerationTask },
    { name: "insights-files", description: "Generate insights directly from source files (bypasses database)", token: taskTokens.FileBasedInsightsGenerationTask },
    { name: "report", description: "Generate a static HTML report from captured metadata and insights", token: taskTokens.ReportGenerationTask },
    { name: "query", description: "Query the codebase using MongoDB Atlas Vector Search", token: taskTokens.CodebaseQueryTask },
    { name: "projects", description: "List all projects stored in the database with summary statistics", token: taskTokens.ListProjectsTask },
    { name: "models", description: "List all available LLM models for completions and embeddings", token: taskTokens.ListAvailableModelsTask },
    { name: "test-mdb", description: "Test the MongoDB connection", token: taskTokens.MongoConnectionTestTask },
    { name: "test-llm", description: "Test configured LLM providers", token: taskTokens.PluggableLLMsTestTask },
  ];

  for (const cmd of commands) {
    program
      .command(cmd.name)
      .description(cmd.description)
      .action(() => void runApplication(cmd.token));
  }

  program
    .command("pipeline")
    .description("Run the full workflow: capture -> insights -> report")
    .action(() => {
      void (async () => {
        await runApplication(taskTokens.CodebaseCaptureTask);
        await runApplication(taskTokens.InsightsGenerationTask);
        await runApplication(taskTokens.ReportGenerationTask);
      })();
    });

  program
    .command("delete <project-name>")
    .description("Delete a project and all its data (sources and insights) from the database")
    .action((projectName: string) => {
      void runApplication(taskTokens.DeleteProjectTask, (task: Record<string, unknown>) => {
        task.targetProjectName = projectName;
      });
    });

  return program;
}

describe("CBA CLI", () => {
  const EXPECTED_COMMANDS = [
    "capture",
    "insights",
    "insights-files",
    "report",
    "query",
    "projects",
    "models",
    "pipeline",
    "test-mdb",
    "test-llm",
    "delete",
  ];

  let program: Command;

  beforeEach(() => {
    jest.clearAllMocks();
    program = buildTestProgram();
  });

  it("should register all expected commands", () => {
    const registeredNames = program.commands.map((cmd) => cmd.name());
    expect(registeredNames).toEqual(expect.arrayContaining(EXPECTED_COMMANDS));
    expect(registeredNames).toHaveLength(EXPECTED_COMMANDS.length);
  });

  it("should set the program name to 'cba'", () => {
    expect(program.name()).toBe("cba");
  });

  it.each(EXPECTED_COMMANDS)("command '%s' should have a non-empty description", (cmdName) => {
    const cmd = program.commands.find((c) => c.name() === cmdName);
    expect(cmd).toBeDefined();
    expect(cmd!.description()).not.toBe("");
  });

  it.each([
    ["capture", "CodebaseCaptureTask"],
    ["insights", "InsightsGenerationTask"],
    ["insights-files", "FileBasedInsightsGenerationTask"],
    ["report", "ReportGenerationTask"],
    ["query", "CodebaseQueryTask"],
    ["projects", "ListProjectsTask"],
    ["models", "ListAvailableModelsTask"],
    ["test-mdb", "MongoConnectionTestTask"],
    ["test-llm", "PluggableLLMsTestTask"],
  ])("command '%s' should invoke runApplication with %s token", async (cmdName, tokenKey) => {
    const { runApplication } = jest.requireMock("./../../src/app/lifecycle/application-runner");
    const { taskTokens } = jest.requireMock("./../../src/app/di/tokens");

    await program.parseAsync(["node", "cba", cmdName]);

    expect(runApplication).toHaveBeenCalledTimes(1);
    expect(runApplication).toHaveBeenCalledWith(taskTokens[tokenKey]);
  });

  it("command 'pipeline' should invoke runApplication for capture, insights, and report in order", async () => {
    const { runApplication } = jest.requireMock("./../../src/app/lifecycle/application-runner");
    const { taskTokens } = jest.requireMock("./../../src/app/di/tokens");

    await program.parseAsync(["node", "cba", "pipeline"]);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(runApplication).toHaveBeenCalledTimes(3);
    expect(runApplication).toHaveBeenNthCalledWith(1, taskTokens.CodebaseCaptureTask);
    expect(runApplication).toHaveBeenNthCalledWith(2, taskTokens.InsightsGenerationTask);
    expect(runApplication).toHaveBeenNthCalledWith(3, taskTokens.ReportGenerationTask);
  });

  it("command 'delete' should pass the project name via configureTask callback", async () => {
    const { runApplication } = jest.requireMock("./../../src/app/lifecycle/application-runner");
    const { taskTokens } = jest.requireMock("./../../src/app/di/tokens");

    await program.parseAsync(["node", "cba", "delete", "my-legacy-app"]);

    expect(runApplication).toHaveBeenCalledTimes(1);
    expect(runApplication).toHaveBeenCalledWith(
      taskTokens.DeleteProjectTask,
      expect.any(Function),
    );

    const configureTask = runApplication.mock.calls[0][1];
    const mockTask = { targetProjectName: "" };
    configureTask(mockTask);
    expect(mockTask.targetProjectName).toBe("my-legacy-app");
  });
});
