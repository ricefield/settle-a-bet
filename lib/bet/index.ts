import { getSecurityEnv } from "@/lib/env";
import { getTokenVault } from "@/lib/security/tokens";
import * as db from "@/lib/db";
import { enqueueBetEvaluation } from "@/lib/evaluation/queue";
import { createBetModule } from "./module";

export type { BetModule, EvaluationQueue } from "./module";
export type { BetStore } from "./store";

let moduleInstance: ReturnType<typeof createBetModule> | undefined;

export function getBetModule() {
  if (!moduleInstance) {
    moduleInstance = createBetModule({
      store: db.bets,
      tokens: getTokenVault(),
      queue: { enqueue: enqueueBetEvaluation },
    });
  }
  return moduleInstance;
}

export function getAdminTakedownSecret(): string {
  return getSecurityEnv().ADMIN_TAKEDOWN_SECRET;
}
