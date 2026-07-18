import { z } from "zod";
import { logger } from "@/server/services/logger";
import { failure, success } from "@/types/result";
import type {
  AIProvider,
  AIProviderConfiguration,
  AIRequest,
  AIResponse,
} from "./types";

const completionEnvelopeSchema = z.object({
  choices: z
    .array(
      z.object({
        message: z.object({ content: z.string() }),
      }),
    )
    .min(1),
  usage: z
    .object({
      prompt_tokens: z.number().int().nonnegative().optional(),
      completion_tokens: z.number().int().nonnegative().optional(),
      total_tokens: z.number().int().nonnegative().optional(),
    })
    .optional(),
});

function sleep(delayMs: number) {
  return new Promise((resolve) => setTimeout(resolve, delayMs));
}

function providerUrl(baseUrl: string, path: string) {
  return `${baseUrl.replace(/\/$/, "")}${path}`;
}

function providerFailure(status: number, requestId: string) {
  if (status === 429)
    return failure(
      "AI_RATE_LIMITED",
      "The AI provider is temporarily rate limited. Try again shortly.",
      { requestId, diagnostics: { providerStatus: status } },
    );
  return failure(
    "AI_PROVIDER_ERROR",
    "The AI provider could not complete the structured request.",
    { requestId, diagnostics: { providerStatus: status } },
  );
}

export class OpenAICompatibleProvider implements AIProvider {
  readonly name = "openai-compatible";
  readonly capabilities;

  constructor(private readonly configuration: AIProviderConfiguration) {
    this.capabilities = {
      structuredOutput: configuration.supportsJsonSchema
        ? ("json-schema" as const)
        : ("json-object" as const),
      capturesTokenUsage: true,
    };
  }

  get model() {
    return this.configuration.model ?? "";
  }

  private headers(requestId: string) {
    return {
      "content-type": "application/json",
      "x-request-id": requestId,
      ...(this.configuration.apiKey
        ? { authorization: `Bearer ${this.configuration.apiKey}` }
        : {}),
    };
  }

  async healthCheck(requestId = crypto.randomUUID()) {
    if (!this.configuration.model)
      return failure(
        "AI_CONFIGURATION_ERROR",
        "Configure AI_MODEL before starting analysis.",
        { requestId },
      );
    const startedAt = performance.now();
    try {
      const response = await fetch(
        providerUrl(this.configuration.baseUrl, "/models"),
        {
          headers: this.headers(requestId),
          signal: AbortSignal.timeout(
            Math.min(this.configuration.timeoutMs, 10_000),
          ),
        },
      );
      if (!response.ok) return providerFailure(response.status, requestId);
      return success({
        available: true as const,
        provider: this.name,
        model: this.configuration.model,
        latencyMs: Math.round(performance.now() - startedAt),
      });
    } catch (error) {
      const timedOut = error instanceof Error && error.name === "TimeoutError";
      logger.warn("AI provider health check failed", {
        requestId,
        provider: this.name,
        model: this.configuration.model,
        timedOut,
      });
      return failure(
        timedOut ? "AI_TIMEOUT" : "AI_PROVIDER_ERROR",
        timedOut
          ? "The AI provider health check timed out."
          : "The AI provider is not reachable.",
        { requestId },
      );
    }
  }

  async generateStructuredOutput<T>(
    request: AIRequest<T>,
  ): Promise<
    ReturnType<typeof success<AIResponse<T>>> | ReturnType<typeof failure>
  > {
    if (!this.configuration.model)
      return failure(
        "AI_CONFIGURATION_ERROR",
        "Configure AI_MODEL before starting analysis.",
        { requestId: request.requestId },
      );

    const responseFormat = this.configuration.supportsJsonSchema
      ? {
          type: "json_schema",
          json_schema: {
            name: request.schemaName,
            strict: true,
            schema: z.toJSONSchema(request.outputSchema, {
              target: "draft-7",
            }),
          },
        }
      : { type: "json_object" };
    const body = {
      model: this.configuration.model,
      temperature: this.configuration.temperature,
      messages: [
        { role: "system", content: request.systemPrompt },
        { role: "user", content: request.userPrompt },
      ],
      response_format: responseFormat,
    };

    for (let attempt = 0; attempt <= this.configuration.maxRetries; attempt++) {
      try {
        const response = await fetch(
          providerUrl(this.configuration.baseUrl, "/chat/completions"),
          {
            method: "POST",
            headers: this.headers(request.requestId),
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(this.configuration.timeoutMs),
          },
        );
        const retryable =
          response.status === 408 ||
          response.status === 429 ||
          response.status >= 500;
        if (!response.ok) {
          if (retryable && attempt < this.configuration.maxRetries) {
            await sleep(250 * 2 ** attempt);
            continue;
          }
          logger.warn("AI structured request rejected", {
            requestId: request.requestId,
            provider: this.name,
            model: this.configuration.model,
            providerStatus: response.status,
            attempt,
          });
          return providerFailure(response.status, request.requestId);
        }

        const envelope = completionEnvelopeSchema.safeParse(
          await response.json(),
        );
        if (!envelope.success)
          return failure(
            "AI_INVALID_RESPONSE",
            "The AI provider returned an invalid response envelope.",
            { requestId: request.requestId },
          );
        let rawOutput: unknown;
        try {
          rawOutput = JSON.parse(envelope.data.choices[0].message.content);
        } catch {
          return failure(
            "AI_INVALID_RESPONSE",
            "The AI provider did not return valid structured JSON.",
            { requestId: request.requestId },
          );
        }
        const output = request.outputSchema.safeParse(rawOutput);
        if (!output.success)
          return failure(
            "AI_INVALID_RESPONSE",
            "The AI provider output did not satisfy the required schema.",
            {
              requestId: request.requestId,
              diagnostics: { validationIssues: output.error.issues.length },
            },
          );
        return success({
          data: output.data,
          provider: this.name,
          model: this.configuration.model,
          requestId: request.requestId,
          promptVersion: request.promptVersion,
          usage: envelope.data.usage
            ? {
                inputTokens: envelope.data.usage.prompt_tokens,
                outputTokens: envelope.data.usage.completion_tokens,
                totalTokens: envelope.data.usage.total_tokens,
              }
            : undefined,
        });
      } catch (error) {
        const timedOut =
          error instanceof Error && error.name === "TimeoutError";
        if (!timedOut && attempt < this.configuration.maxRetries) {
          await sleep(250 * 2 ** attempt);
          continue;
        }
        logger.warn("AI structured request failed", {
          requestId: request.requestId,
          provider: this.name,
          model: this.configuration.model,
          timedOut,
          attempt,
        });
        return failure(
          timedOut ? "AI_TIMEOUT" : "AI_PROVIDER_ERROR",
          timedOut
            ? "The AI provider request timed out."
            : "The AI provider could not be reached.",
          { requestId: request.requestId },
        );
      }
    }
    return failure(
      "AI_PROVIDER_ERROR",
      "The AI provider could not complete the request.",
      { requestId: request.requestId },
    );
  }
}
