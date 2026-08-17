import { AdminNav } from "@/components/admin/admin-nav";
import { AiEndpointForm } from "@/components/admin/ai-endpoint-form";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { requireAuthorization } from "@/server/auth/authorization";
import { requirePermission } from "@/server/auth/permissions";
import { db } from "@/server/db";

export async function AiEndpointPage({ kind }: { kind: "CHAT" | "EMBEDDING" }) {
  const context = await requireAuthorization();
  await requirePermission(context, "provider.manage");
  const endpoints = await db.aiEndpointConfig.findMany({
    where: { organizationId: context.organizationId, kind },
    include: { credential: { select: { id: true } } },
    orderBy: [{ active: "desc" }, { name: "asc" }],
  });
  const embedding = kind === "EMBEDDING";
  return (
    <div className="space-y-6">
      <PageHeader
        title={embedding ? "Embedding endpoint" : "Chat AI endpoint"}
        description={
          embedding
            ? "Dedicated document, query, metadata, and topic-clustering embeddings. Changing the model contract marks existing sources for re-indexing."
            : "Dedicated completion endpoint for chat, tool selection, SQL generation, summarization, and business insight."
        }
      />
      <AdminNav />
      {endpoints.map((endpoint) => (
        <section
          key={endpoint.id}
          className="space-y-5 rounded-xl border bg-card p-5"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-semibold">{endpoint.name}</h2>
                <Badge tone={endpoint.active ? "success" : "neutral"}>
                  {endpoint.active ? "ACTIVE" : "INACTIVE"}
                </Badge>
                <Badge
                  tone={
                    endpoint.lastHealthStatus === "HEALTHY"
                      ? "success"
                      : endpoint.lastHealthStatus === "UNHEALTHY"
                        ? "danger"
                        : "neutral"
                  }
                >
                  {endpoint.lastHealthStatus}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {endpoint.providerType.replaceAll("_", " ")} · {endpoint.model}
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              Secret:{" "}
              {endpoint.credential ? "•••••••• configured" : "not configured"}
            </p>
          </div>
          {endpoint.lastHealthMessage ? (
            <p className="rounded-lg bg-muted p-3 text-sm">
              {endpoint.lastHealthMessage}
              {endpoint.lastLatencyMs ? ` · ${endpoint.lastLatencyMs} ms` : ""}
              {endpoint.lastDetectedDimension
                ? ` · ${endpoint.lastDetectedDimension} dimensions`
                : ""}
            </p>
          ) : null}
          <AiEndpointForm
            kind={kind}
            value={{
              id: endpoint.id,
              name: endpoint.name,
              kind: endpoint.kind,
              providerType: endpoint.providerType,
              baseUrl: endpoint.baseUrl,
              model: endpoint.model,
              temperature: endpoint.temperature,
              maxTokens: endpoint.maxTokens,
              batchSize: endpoint.batchSize,
              vectorDimension: endpoint.vectorDimension,
              timeoutMs: endpoint.timeoutMs,
              maxRetries: endpoint.maxRetries,
              active: endpoint.active,
              credentialPresent: Boolean(endpoint.credential),
            }}
          />
        </section>
      ))}
      <section className="space-y-5 rounded-xl border border-dashed bg-card p-5">
        <h2 className="font-semibold">
          Add {embedding ? "embedding" : "chat"} endpoint
        </h2>
        <AiEndpointForm kind={kind} />
      </section>
    </div>
  );
}
