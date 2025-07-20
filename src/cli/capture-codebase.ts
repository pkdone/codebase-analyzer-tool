import { runApplication } from "../lifecycle/service-runner";
import { TOKENS } from "../di/tokens";

runApplication(TOKENS.CodebaseCaptureService).catch(console.error);
