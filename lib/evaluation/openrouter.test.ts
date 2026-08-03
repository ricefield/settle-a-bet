import { createOpenRouterAdapter } from "./openrouter";
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
            usage: {},
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
