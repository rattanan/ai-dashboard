import { AdminNav } from "@/components/admin/admin-nav";
import {
  LlmProviderForm,
  ProviderTestButton,
} from "@/components/admin/phase1-forms";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { deleteLlmProviderAction } from "@/features/admin/config-actions";
import { requireAuthorization } from "@/server/auth/authorization";
import { requirePermission } from "@/server/auth/permissions";
import { db } from "@/server/db";

export default async function LlmProvidersPage() {
  const context = await requireAuthorization();
  await requirePermission(context, "provider.manage");
  const providers = await db.llmProvider.findMany({
    where: { organizationId: context.organizationId },
    include: { credential: { select: { id: true } } },
    orderBy: [{ active: "desc" }, { name: "asc" }],
  });
  return (
    <div className="space-y-6">
      <PageHeader
        title="LLM providers"
        description="Configure chat and embedding models. API keys are encrypted at rest and never returned to the browser."
      />
      <AdminNav />
      {providers.map((provider) => (
        <section
          key={provider.id}
          className="space-y-5 rounded-xl border bg-card p-5"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <h2 className="font-semibold">{provider.name}</h2>
              <Badge tone={provider.active ? "success" : "neutral"}>
                {provider.active ? "ACTIVE" : "INACTIVE"}
              </Badge>
              <Badge
                tone={
                  provider.lastHealthStatus === "HEALTHY"
                    ? "success"
                    : provider.lastHealthStatus === "UNHEALTHY"
                      ? "danger"
                      : "neutral"
                }
              >
                {provider.lastHealthStatus}
              </Badge>
            </div>
            <span className="text-xs text-muted-foreground">
              Key:{" "}
              {provider.credential ? "•••••••• configured" : "not configured"}
            </span>
          </div>
          <LlmProviderForm
            provider={{
              id: provider.id,
              name: provider.name,
              baseUrl: provider.baseUrl,
              chatModel: provider.chatModel,
              embeddingModel: provider.embeddingModel,
              temperature: provider.temperature,
              timeoutMs: provider.timeoutMs,
              maxTokens: provider.maxTokens,
              active: provider.active,
              supportsJsonSchema: provider.supportsJsonSchema,
              fallbackEnabled: provider.fallbackEnabled,
              hasApiKey: Boolean(provider.credential),
            }}
          />
          <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
            <ProviderTestButton providerId={provider.id} />
            <form action={deleteLlmProviderAction}>
              <input type="hidden" name="providerId" value={provider.id} />
              <button className="min-h-10 rounded-lg border border-red-200 px-3 text-sm text-red-700">
                Delete
              </button>
            </form>
          </div>
          {provider.lastHealthMessage ? (
            <p className="text-sm text-muted-foreground">
              Last test: Chat {provider.lastChatHealthStatus} · Embedding{" "}
              {provider.lastEmbeddingHealthStatus} ·{" "}
              {provider.lastHealthMessage}{" "}
              {provider.lastTestedAt
                ? `· ${provider.lastTestedAt.toLocaleString()}`
                : ""}
            </p>
          ) : null}
        </section>
      ))}
      <section className="space-y-5 rounded-xl border border-dashed bg-card p-5">
        <h2 className="font-semibold">Add provider</h2>
        <LlmProviderForm />
      </section>
    </div>
  );
}
