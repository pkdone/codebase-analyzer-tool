import { runApplication } from "./index";
import { TOKENS } from "../di/tokens";

runApplication(TOKENS.CodebaseQueryService).catch(console.error);
