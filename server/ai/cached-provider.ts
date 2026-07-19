import { createHash } from "node:crypto";
import type { Prisma } from "@/generated/prisma/client";
import type { AuthorizationContext } from "@/server/auth/authorization";
import { db } from "@/server/db";
import { createAIProvider } from "./factory";
import type { AIProvider, AIRequest, AIResponse } from "./types";
import { success } from "@/types/result";

function requestHash(request: AIRequest<unknown>) {
  return createHash("sha256")
    .update(
      JSON.stringify({
        schemaName: request.schemaName,
        promptVersion: request.promptVersion,
        systemPrompt: request.systemPrompt,
        userPrompt: request.userPrompt,
      }),
    )
    .digest("hex");
}

export async function generateCachedStructuredOutput<T>(
  context: AuthorizationContext,
  request: AIRequest<T>,
  provider: AIProvider = createAIProvider(),
) {
  const inputHash = requestHash(request);
  const cached = await db.aiResponseCache.findUnique({
    where: {
      workspaceId_provider_model_promptVersion_inputHash: {
        workspaceId: context.workspaceId,
        provider: provider.name,
        model: provider.model,
        promptVersion: request.promptVersion,
        inputHash,
      },
    },
  });
  if (!cached?.expiresAt || cached.expiresAt > new Date()) {
    const parsed = request.outputSchema.safeParse(cached?.response);
    if (parsed.success && cached)
      return success({
        data: parsed.data,
        provider: cached.provider,
        model: cached.model,
        requestId: request.requestId,
        promptVersion: cached.promptVersion,
        usage: {
          inputTokens: cached.inputTokens ?? undefined,
          outputTokens: cached.outputTokens ?? undefined,
        },
        cacheHit: true as const,
        inputHash,
      });
  }
  const result = await provider.generateStructuredOutput(request);
  if (!result.ok) return result;
  await db.aiResponseCache.upsert({
    where: {
      workspaceId_provider_model_promptVersion_inputHash: {
        workspaceId: context.workspaceId,
        provider: provider.name,
        model: provider.model,
        promptVersion: request.promptVersion,
        inputHash,
      },
    },
    create: {
      workspaceId: context.workspaceId,
      provider: provider.name,
      model: provider.model,
      promptVersion: request.promptVersion,
      inputHash,
      response: result.data.data as Prisma.InputJsonValue,
      inputTokens: result.data.usage?.inputTokens,
      outputTokens: result.data.usage?.outputTokens,
    },
    update: {
      response: result.data.data as Prisma.InputJsonValue,
      inputTokens: result.data.usage?.inputTokens,
      outputTokens: result.data.usage?.outputTokens,
      expiresAt: null,
    },
  });
  return success({
    ...result.data,
    cacheHit: false as const,
    inputHash,
  } satisfies AIResponse<T> & { cacheHit: false; inputHash: string });
}
