import { db } from "@/server/db";
import { env } from "@/schemas/env";
import { getProviderSecret } from "@/server/services/llm-provider-config";

export async function embedKnowledgeQuery(
  organizationId: string,
  input: string,
  providerId?: string | null,
) {
  const provider = providerId
    ? await db.llmProvider.findFirst({
        where: { id: providerId, organizationId },
      })
    : await db.llmProvider.findFirst({
        where: { organizationId, active: true },
        orderBy: { updatedAt: "desc" },
      });
  const configuration = env();
  const url = provider
    ? `${provider.baseUrl.replace(/\/$/, "")}/embeddings`
    : configuration.EMBEDDING_BASE_URL;
  const model = provider?.embeddingModel ?? configuration.EMBEDDING_MODEL;
  const apiKey = provider ? await getProviderSecret(provider.id) : undefined;
  const ollama = /\/api\/embed\/?$/.test(url);
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify({ model, input }),
    signal: AbortSignal.timeout(configuration.EMBEDDING_TIMEOUT_MS),
  });
  if (!response.ok)
    throw new Error(`Embedding provider returned HTTP ${response.status}`);
  const payload = (await response.json()) as {
    embeddings?: number[][];
    data?: Array<{ embedding?: number[] }>;
  };
  const embedding = ollama
    ? payload.embeddings?.[0]
    : payload.data?.[0]?.embedding;
  if (!embedding?.length || embedding.some((value) => !Number.isFinite(value)))
    throw new Error("Embedding provider returned an invalid vector");
  return { embedding, model };
}
