import { runApplication } from "./index";
import { TOKENS } from "../di/tokens";

runApplication(TOKENS.MDBConnectionTestService).catch(console.error);
