import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { OpenAICompatibleProvider } from "@/server/ai/openai-compatible";
import type { AIProviderConfiguration } from "@/server/ai/types";

const configuration: AIProviderConfiguration = {
  provider: "openai-compatible",
  baseUrl: "https://provider.example/v1/",
  apiKey: "test-provider-key",
  model: "test-model",
  timeoutMs: 2_000,
  maxRetries: 0,
  temperature: 0.1,
  supportsJsonSchema: true,
};

const outputSchema = z.object({
  summary: z.string(),
  confidence: z.number().min(0).max(1),
});

function request() {
  return {
    requestId: "request-123",
    schemaName: "schema_analysis",
    outputSchema,
    systemPrompt: "Use only approved metadata.",
    userPrompt: "Analyze the approved tables.",
    promptVersion: "schema-analysis-v1",
  };
}

afterEach(() => vi.unstubAllGlobals());

describe("OpenAI-compatible provider", () => {
  it("requests JSON schema output and validates the response", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json({
        choices: [
          {
            message: {
              content: JSON.stringify({ summary: "Grounded", confidence: 0.9 }),
            },
          },
        ],
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await new OpenAICompatibleProvider(
      configuration,
    ).generateStructuredOutput(request());

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.data.summary).toBe("Grounded");
    expect(result.data.usage?.totalTokens).toBe(15);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://provider.example/v1/chat/completions");
    expect(init.headers).toMatchObject({
      authorization: "Bearer test-provider-key",
      "x-request-id": "request-123",
    });
    expect(JSON.parse(String(init.body)).response_format.type).toBe(
      "json_schema",
    );
  });

  it("rejects invalid structured output without extracting text", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json({ choices: [{ message: { content: "Result: {}" } }] }),
      ),
    );
    const result = await new OpenAICompatibleProvider(
      configuration,
    ).generateStructuredOutput(request());
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("AI_INVALID_RESPONSE");
  });

  it("retries transient provider failures within the configured bound", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 503 }))
      .mockResolvedValueOnce(
        Response.json({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  summary: "Recovered",
                  confidence: 0.8,
                }),
              },
            },
          ],
        }),
      );
    vi.stubGlobal("fetch", fetchMock);
    const result = await new OpenAICompatibleProvider({
      ...configuration,
      maxRetries: 1,
    }).generateStructuredOutput(request());
    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("reports missing model configuration without a network request", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const result = await new OpenAICompatibleProvider({
      ...configuration,
      model: undefined,
    }).healthCheck("health-request");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("AI_CONFIGURATION_ERROR");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("supports compatible servers limited to JSON object mode", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json({
        choices: [
          {
            message: {
              content: JSON.stringify({ summary: "Local", confidence: 1 }),
            },
          },
        ],
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const result = await new OpenAICompatibleProvider({
      ...configuration,
      supportsJsonSchema: false,
    }).generateStructuredOutput(request());
    expect(result.ok).toBe(true);
    const body = JSON.parse(
      String((fetchMock.mock.calls[0][1] as RequestInit).body),
    );
    expect(body.response_format).toEqual({ type: "json_object" });
  });
});
