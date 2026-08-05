import { createOpenRouterAdapter, OpenRouterResponseError } from "./openrouter";
import { z } from "zod";

const env = {
  OPENROUTER_API_KEY: "test-key",
  OPENROUTER_APP_URL: "http://localhost:3000",
  OPENROUTER_APP_NAME: "Settle a Bet",
};

describe("OpenRouter adapter", () => {
  beforeEach(() => Object.assign(process.env, env));

  it("uses one explicit model with search only when requested", async () => {
    const fetchImpl = jest.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      expect(body.model).toBe("openai/gpt-5.6-sol");
      expect(body.models).toBeUndefined();
      expect(body.tools).toHaveLength(1);
      expect(body.tools[0]).toEqual({
        type: "openrouter:web_search",
        parameters: {
          max_results: 5,
          max_total_results: 5,
          search_context_size: "low",
        },
      });
      return new Response(
        JSON.stringify({
          id: "response-1",
          model: "openai/gpt-5.6-sol",
          choices: [
            {
              message: {
                content: JSON.stringify({ answer: "ok" }),
                reasoning_details: ["hidden reasoning must not be stored"],
              },
            },
          ],
          usage: {
            prompt_tokens: 100,
            completion_tokens: 20,
            total_tokens: 120,
            server_tool_use: { web_search_requests: 1 },
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }) as unknown as typeof fetch;
    const result = await createOpenRouterAdapter({ fetchImpl }).runStructured({
      model: "openai/gpt-5.6-sol",
      schemaName: "answer",
      schema: z.object({ answer: z.string() }),
      system: "system",
      user: "user",
      reasoningEffort: "low",
      maxTokens: 100,
      webSearch: true,
    });
    expect(result.value).toEqual({ answer: "ok" });
    expect(result.audit.estimatedCostMicros).toBeGreaterThan(5_000);
    expect(JSON.stringify(result.audit.responseBody)).not.toContain("hidden reasoning");
  });

  it("rejects model substitution", async () => {
    const fetchImpl = jest.fn(
      async () =>
        new Response(
          JSON.stringify({
            id: "response-2",
            model: "openai/gpt-5.6-terra",
            choices: [{ message: { content: JSON.stringify({ answer: "ok" }) } }],
            usage: { prompt_tokens: 10, completion_tokens: 2, total_tokens: 12 },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
    ) as unknown as typeof fetch;
    await expect(
      createOpenRouterAdapter({ fetchImpl }).runStructured({
        model: "openai/gpt-5.6-sol",
        schemaName: "answer",
        schema: z.object({ answer: z.string() }),
        system: "system",
        user: "user",
        reasoningEffort: "medium",
        maxTokens: 100,
        webSearch: false,
      }),
    ).rejects.toThrow("instead of required model");
  });

  it("reports non-sensitive diagnostics for malformed structured output", async () => {
    const fetchImpl = jest.fn(
      async () =>
        new Response(
          JSON.stringify({
            id: "response-malformed",
            model: "anthropic/claude-opus-5",
            choices: [{ finish_reason: "length", message: { content: "{" } }],
            usage: { prompt_tokens: 10, completion_tokens: 2, total_tokens: 12 },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
    ) as unknown as typeof fetch;

    const error = await createOpenRouterAdapter({ fetchImpl })
      .runStructured({
        model: "anthropic/claude-opus-5",
        schemaName: "answer",
        schema: z.object({ answer: z.string() }),
        system: "system",
        user: "user",
        reasoningEffort: "low",
        maxTokens: 100,
        webSearch: false,
      })
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(OpenRouterResponseError);
    expect(error).toMatchObject({
      message: expect.stringContaining("finish_reason=length, content_length=1"),
      returnedModel: "anthropic/claude-opus-5",
      audit: expect.objectContaining({
        providerResponseId: "response-malformed",
        inputTokens: 10,
        outputTokens: 2,
        totalTokens: 12,
      }),
    });
  });

  it("omits provider-incompatible validation keywords from JSON Schema", async () => {
    const fetchImpl = jest.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      const serializedSchema = JSON.stringify(body.response_format.json_schema.schema);
      for (const keyword of [
        "default",
        "format",
        "maxItems",
        "maxLength",
        "minItems",
        "minLength",
        "pattern",
      ]) {
        expect(serializedSchema).not.toContain(`"${keyword}"`);
      }
      return new Response(
        JSON.stringify({
          id: "response-formats",
          model: "openai/gpt-5.6-sol",
          choices: [
            {
              message: {
                content: JSON.stringify({
                  url: "https://example.com/source",
                  retrievedAt: "2026-08-05T12:00:00.000Z",
                }),
              },
            },
          ],
          usage: {},
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }) as unknown as typeof fetch;

    await expect(
      createOpenRouterAdapter({ fetchImpl }).runStructured({
        model: "openai/gpt-5.6-sol",
        schemaName: "source",
        schema: z.object({
          url: z.string().url(),
          retrievedAt: z.string().datetime(),
          labels: z
            .array(
              z
                .string()
                .regex(/^[A-D]$/u)
                .max(1),
            )
            .min(1)
            .max(4)
            .default([]),
        }),
        system: "system",
        user: "user",
        reasoningEffort: "low",
        maxTokens: 100,
        webSearch: false,
      }),
    ).resolves.toMatchObject({
      value: {
        url: "https://example.com/source",
        retrievedAt: "2026-08-05T12:00:00.000Z",
        labels: [],
      },
    });
  });

  it("does not expose web tools during judgment", async () => {
    const fetchImpl = jest.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      expect(body.tools).toBeUndefined();
      expect(body.model).toBe("x-ai/grok-4.5");
      return new Response(
        JSON.stringify({
          id: "response-3",
          model: "x-ai/grok-4.5",
          choices: [{ message: { content: JSON.stringify({ answer: "ok" }) } }],
          usage: {},
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }) as unknown as typeof fetch;
    await createOpenRouterAdapter({ fetchImpl }).runStructured({
      model: "x-ai/grok-4.5",
      schemaName: "answer",
      schema: z.object({ answer: z.string() }),
      system: "system",
      user: "user",
      reasoningEffort: "medium",
      maxTokens: 100,
      webSearch: false,
    });
  });
});
