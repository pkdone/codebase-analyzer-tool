import { runApplication } from "../lifecycle/application-runner";
import { TOKENS } from "../di/tokens";

runApplication(TOKENS.InsightsGenerationTask).catch(console.error);
