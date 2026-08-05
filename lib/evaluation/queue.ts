import "server-only";

import { start } from "workflow/api";

import { evaluateBetWorkflow } from "@/workflows/evaluate-bet";

export async function enqueueBetEvaluation(betId: string): Promise<void> {
  await start(evaluateBetWorkflow, [betId]);
}
