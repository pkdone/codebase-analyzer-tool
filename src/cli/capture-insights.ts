import { runApplication } from "../lifecycle/service-runner";
import { TOKENS } from "../di/tokens";

runApplication(TOKENS.InsightsFromDBGenerationService).catch(console.error);
