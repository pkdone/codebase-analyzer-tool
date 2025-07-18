import { runApplication } from "./index";
import { TOKENS } from "../di/tokens";

runApplication(TOKENS.InsightsFromDBGenerationService).catch(console.error);
