import { runApplication } from "./index";
import { TOKENS } from "../di/tokens";

runApplication(TOKENS.PluggableLLMsTestService).catch(console.error);
