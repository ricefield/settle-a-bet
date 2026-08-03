import type { PanelMember } from "@/lib/types";
import { getOpenRouterEnv } from "@/lib/env";

export type PanelModel = { member: PanelMember; model: string; displayName: string };

export function getPanelModels(): PanelModel[] {
  const env = getOpenRouterEnv();
  return [
    { member: "CLAUDE_OPUS", model: env.CLAUDE_JUDGE_MODEL, displayName: "Claude Opus" },
    { member: "OPENAI_SOL", model: env.SOL_JUDGE_MODEL, displayName: "OpenAI Sol" },
    { member: "XAI_GROK", model: env.GROK_JUDGE_MODEL, displayName: "Grok" },
  ];
}

const pricesPerToken: Record<string, { input: number; output: number }> = {
  "anthropic/claude-opus-5": { input: 5 / 1_000_000, output: 25 / 1_000_000 },
  "openai/gpt-5.6-sol": { input: 5 / 1_000_000, output: 30 / 1_000_000 },
  "x-ai/grok-4.5": { input: 2 / 1_000_000, output: 6 / 1_000_000 },
  "openai/gpt-5.6-luna": { input: 1 / 1_000_000, output: 6 / 1_000_000 },
};

export function estimateCostMicros(
  model: string,
  inputTokens: number,
  outputTokens: number,
): number {
  const price = pricesPerToken[model];
  if (!price) return 0;
  return Math.round((inputTokens * price.input + outputTokens * price.output) * 1_000_000);
}
