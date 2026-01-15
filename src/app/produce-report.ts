import { runCliTask } from "./lifecycle/cli-entry-utils";
import { taskTokens } from "./di/tokens";
runCliTask(taskTokens.ReportGenerationTask);
