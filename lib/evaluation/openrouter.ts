import "server-only";

import { z } from "zod";

import { getOpenRouterEnv } from "@/lib/env";
import { ServiceUnavailableError } from "@/lib/errors";
import { estimateCostMicros } from "./models";
import type { ModelCallAudit } from "./types";

const responseSchema = z.object({
  id: z.string(),
  model: z.string(),
  choices: z
    .array(
      z.object({
        finish_reason: z.string().nullable().optional(),
        message: z.object({
          content: z.union([z.string(), z.array(z.unknown())]),
          annotations: z.array(z.unknown()).optional(),
        }),
      }),
    )
    .min(1),
  usage: z
    .object({
      prompt_tokens: z.number().int().default(0),
      completion_tokens: z.number().int().default(0),
      total_tokens: z.number().int().default(0),
      input_tokens: z.number().int().optional(),
      output_tokens: z.number().int().optional(),
      server_tool_use: z
        .object({ web_search_requests: z.number().int().nonnegative().default(0) })
        .optional(),
    })
    .default({ prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }),
});

export type StructuredModelRequest<T> = {
  model: string;
  schemaName: string;
  schema: z.ZodType<T>;
  system: string;
  user: string;
  reasoningEffort: "low" | "medium";
  maxTokens: number;
  webSearch: boolean;
};

export type StructuredModelResult<T> = { value: T; returnedModel: string; audit: ModelCallAudit };

export type ModelAdapter = {
  runStructured<T>(request: StructuredModelRequest<T>): Promise<StructuredModelResult<T>>;
};

export class OpenRouterResponseError extends ServiceUnavailableError {
  constructor(
    message: string,
    public readonly returnedModel: string,
    public readonly audit: ModelCallAudit,
  ) {
    super(message);
  }
}

function textContent(content: string | unknown[]): string {
  if (typeof content === "string") return content;
  return content
    .flatMap((part) => {
      if (part && typeof part === "object" && "text" in part && typeof part.text === "string")
        return [part.text];
      return [];
    })
    .join("");
}

const unsupportedJsonSchemaKeywords = new Set([
  "default",
  "exclusiveMaximum",
  "exclusiveMinimum",
  "format",
  "maxItems",
  "maxLength",
  "maxProperties",
  "maximum",
  "minItems",
  "minLength",
  "minProperties",
  "minimum",
  "multipleOf",
  "pattern",
]);

function omitUnsupportedJsonSchemaKeywords(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(omitUnsupportedJsonSchemaKeywords);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !unsupportedJsonSchemaKeywords.has(key))
      .map(([key, entry]) => [key, omitUnsupportedJsonSchemaKeywords(entry)]),
  );
}

export function createOpenRouterAdapter({
  fetchImpl = fetch,
}: { fetchImpl?: typeof fetch } = {}): ModelAdapter {
  return {
    async runStructured<T>(request: StructuredModelRequest<T>): Promise<StructuredModelResult<T>> {
      const env = getOpenRouterEnv();
      const body = {
        model: request.model,
        messages: [
          { role: "system", content: request.system },
          { role: "user", content: request.user },
        ],
        reasoning: { effort: request.reasoningEffort },
        max_tokens: request.maxTokens,
        response_format: {
          type: "json_schema",
          json_schema: {
            name: request.schemaName,
            strict: true,
            schema: omitUnsupportedJsonSchemaKeywords(z.toJSONSchema(request.schema)),
          },
        },
        provider: { require_parameters: true },
        ...(request.webSearch
          ? {
              tools: [
                {
                  type: "openrouter:web_search",
                  parameters: {
                    max_results: 5,
                    max_total_results: 5,
                    search_context_size: "low",
                  },
                },
              ],
            }
          : {}),
      };
      const response = await fetchImpl("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": env.OPENROUTER_APP_URL,
          "X-Title": env.OPENROUTER_APP_NAME,
        },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const detail = (await response.text()).slice(0, 1_000);
        throw new ServiceUnavailableError(
          `OpenRouter request failed (${response.status}): ${detail}`,
        );
      }
      const raw = await response.json();
      const parsed = responseSchema.parse(raw);
      const inputTokens = parsed.usage.input_tokens ?? parsed.usage.prompt_tokens;
      const outputTokens = parsed.usage.output_tokens ?? parsed.usage.completion_tokens;
      const webSearchCostMicros = (parsed.usage.server_tool_use?.web_search_requests ?? 0) * 5_000;
      const audit: ModelCallAudit = {
        providerResponseId: parsed.id,
        requestBody: body,
        responseBody: {
          id: parsed.id,
          model: parsed.model,
          choices: parsed.choices.map((choice) => ({
            finishReason: choice.finish_reason,
            content: choice.message.content,
            annotations: choice.message.annotations,
          })),
          usage: parsed.usage,
        },
        inputTokens,
        outputTokens,
        totalTokens: parsed.usage.total_tokens,
        estimatedCostMicros:
          estimateCostMicros(request.model, inputTokens, outputTokens) + webSearchCostMicros,
      };
      if (parsed.model !== request.model) {
        throw new OpenRouterResponseError(
          `OpenRouter returned ${parsed.model} instead of required model ${request.model}`,
          parsed.model,
          audit,
        );
      }
      const content = textContent(parsed.choices[0].message.content);
      let decoded: unknown;
      try {
        decoded = JSON.parse(content);
      } catch {
        throw new OpenRouterResponseError(
          `OpenRouter returned malformed structured output (finish_reason=${parsed.choices[0].finish_reason ?? "unknown"}, content_length=${content.length})`,
          parsed.model,
          audit,
        );
      }
      let value: T;
      try {
        value = request.schema.parse(decoded);
      } catch (error) {
        const detail = error instanceof Error ? error.message : "unknown validation failure";
        throw new OpenRouterResponseError(
          `OpenRouter returned invalid structured output: ${detail}`,
          parsed.model,
          audit,
        );
      }
      return {
        value,
        returnedModel: parsed.model,
        audit,
      };
    },
  };
}
