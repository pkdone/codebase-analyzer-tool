import { runApplication } from "./index";
import { TOKENS } from "../di/tokens";

runApplication(TOKENS.OneShotGenerateInsightsService).catch(console.error);
