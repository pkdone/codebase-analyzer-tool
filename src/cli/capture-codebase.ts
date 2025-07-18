import { runApplication } from "./index";
import { TOKENS } from "../di/tokens";

runApplication(TOKENS.CodebaseCaptureService).catch(console.error);
