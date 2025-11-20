// Top-level CLI file required to make it easy to instantly launch from the IDE's Run/Debug facility
import { runApplication } from "../../lifecycle/main";
import { taskTokens } from "../../di/tokens";
void runApplication(taskTokens.DirectInsightsGenerationTask);
