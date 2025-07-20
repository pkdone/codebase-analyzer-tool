import { runApplication } from "../lifecycle/service-runner";
import { TOKENS } from "../di/tokens";

runApplication(TOKENS.MDBConnectionTestService).catch(console.error);
