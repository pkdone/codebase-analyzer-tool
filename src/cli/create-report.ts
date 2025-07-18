import { runApplication } from "./index";
import { TOKENS } from "../di/tokens";

runApplication(TOKENS.ReportGenerationService).catch(console.error);
