import { z } from "zod";

export const databaseEnvSchema = z.object({
  DATABASE_URL: z.string().min(1),
});

export const securityEnvSchema = z.object({
  TOKEN_ENCRYPTION_KEY: z.string().min(1),
  TOKEN_HASH_PEPPER: z.string().min(16),
  ADMIN_TAKEDOWN_SECRET: z.string().min(24),
});

export const openRouterEnvSchema = z.object({
  OPENROUTER_API_KEY: z.string().min(1),
  OPENROUTER_APP_URL: z.string().url().default("http://localhost:3000"),
  OPENROUTER_APP_NAME: z.string().min(1).default("Settle a Bet"),
  CLAUDE_JUDGE_MODEL: z.string().default("anthropic/claude-opus-5"),
  SOL_JUDGE_MODEL: z.string().default("openai/gpt-5.6-sol"),
  GROK_JUDGE_MODEL: z.string().default("x-ai/grok-4.5"),
  SYNTHESIS_MODEL: z.string().default("openai/gpt-5.6-luna"),
});

export const evaluationEnvSchema = z.object({
  MAX_DAILY_EVALUATIONS: z.coerce.number().int().positive().default(20),
});

export function getDatabaseEnv() {
  return databaseEnvSchema.parse(process.env);
}

export function getSecurityEnv() {
  return securityEnvSchema.parse(process.env);
}

export function getOpenRouterEnv() {
  return openRouterEnvSchema.parse(process.env);
}

export function getEvaluationEnv() {
  return evaluationEnvSchema.parse(process.env);
}
