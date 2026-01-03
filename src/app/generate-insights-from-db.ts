// Top-level CLI file required to make it easy to instantly launch from the IDE's Run/Debug facility
import { runCliTask } from "./lifecycle/cli-entry-utils";
import { taskTokens } from "./di/tokens";
runCliTask(taskTokens.InsightsGenerationTask);
