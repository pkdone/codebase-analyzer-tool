import { runApplication } from "../lifecycle/application-runner";
import { TOKENS } from "../di/tokens";

runApplication(TOKENS.McpServerTask).catch(console.error);
