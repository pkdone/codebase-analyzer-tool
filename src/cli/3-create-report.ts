import { runApplication } from "../lifecycle/application-runner";
import { TOKENS } from "../di/tokens";

runApplication(TOKENS.ReportGenerationTask).catch(console.error);
