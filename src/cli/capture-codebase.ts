// Top-level CLI file required to make it easy to instantly launch from the IDE's Run/Debug facility
import { bootstrapAndRunTask } from "../lifecycle/application-runner";
import { TOKENS } from "../tokens";
bootstrapAndRunTask(TOKENS.CodebaseCaptureTask);
