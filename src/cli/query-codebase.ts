import { runApplication } from "../lifecycle/application-runner";
import { TOKENS } from "../di/tokens";

runApplication(TOKENS.CodebaseQueryTask).catch(console.error);
