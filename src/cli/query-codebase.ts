// Top-level CLI file required to make it easy to instancly launch from the IDE's Run/Debug facility
import { runApplication } from "../lifecycle/application-runner";
import { TOKENS } from "../di/tokens";
runApplication(TOKENS.CodebaseQueryTask);
