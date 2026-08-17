import { AdminNav } from "@/components/admin/admin-nav";
import { LegacyApiRegistryForm } from "@/components/admin/legacy-api-registry-form";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { requireAuthorization } from "@/server/auth/authorization";
import { requirePermission } from "@/server/auth/permissions";
import { db } from "@/server/db";

function prettyJson(value: unknown, fallback: unknown) {
  return JSON.stringify(value ?? fallback, null, 2);
}

export default async function LegacyApiRegistryPage() {
  const context = await requireAuthorization();
  await requirePermission(context, "legacy_api.manage");
  const apis = await db.legacyApi.findMany({
    where: {
      organizationId: context.organizationId,
      workspaceId: context.workspaceId,
    },
    include: {
      credential: { select: { id: true } },
      _count: { select: { bots: true, invocations: true } },
    },
    orderBy: [{ enabled: "desc" }, { name: "asc" }],
  });
  return (
    <div className="space-y-6">
      <PageHeader
        title="Legacy API Registry"
        description="Register bounded read-only JSON operations as bot tools. Credentials stay encrypted server-side; DNS, IP, redirects, headers, response size, schema, bot assignment, and actor ACL are enforced for every call."
      />
      <AdminNav />
      {apis.map((api) => (
        <details key={api.id} className="rounded-xl border bg-card p-5">
          <summary className="flex min-h-11 cursor-pointer list-none flex-wrap items-center justify-between gap-3">
            <span>
              <span className="font-semibold">{api.name}</span>
              <span className="ml-3 text-sm text-muted-foreground">
                {api.method} {api.endpointPath} · {api._count.bots} bots ·{" "}
                {api._count.invocations} calls
              </span>
            </span>
            <span className="flex flex-wrap gap-2">
              <Badge tone={api.enabled ? "success" : "neutral"}>
                {api.enabled ? "ENABLED" : "DISABLED"}
              </Badge>
              <Badge
                tone={
                  api.lastTestStatus === "COMPLETED"
                    ? "success"
                    : api.lastTestStatus === "FAILED"
                      ? "danger"
                      : "neutral"
                }
              >
                {api.lastTestStatus ?? "NOT TESTED"}
              </Badge>
              <Badge tone={api.credential ? "success" : "neutral"}>
                {api.authType === "NONE"
                  ? "NO AUTH"
                  : api.credential
                    ? "CREDENTIAL ENCRYPTED"
                    : "CREDENTIAL MISSING"}
              </Badge>
            </span>
          </summary>
          <div className="mt-5 border-t pt-5">
            {api.lastTestedAt ? (
              <p className="mb-4 text-sm text-muted-foreground">
                Last safe test: {api.lastTestedAt.toLocaleString()} ·{" "}
                {api.lastTestLatencyMs ?? "—"} ms ·{" "}
                {api.lastTestMessage ?? "No message"}
              </p>
            ) : null}
            <p className="mb-4 break-all text-xs text-muted-foreground">
              ACL resource ID: <code>{api.id}</code> · grant resource type{" "}
              <code>LEGACY_API</code> with <code>USE</code> access in Access
              simulator.
            </p>
            <LegacyApiRegistryForm
              value={{
                id: api.id,
                name: api.name,
                description: api.description,
                baseUrl: api.baseUrl,
                endpointPath: api.endpointPath,
                method: api.method,
                readOnlyConfirmed: api.readOnlyConfirmed,
                enabled: api.enabled,
                allowedDomains: api.allowedDomains,
                timeoutMs: api.timeoutMs,
                maxResponseBytes: api.maxResponseBytes,
                maxRedirects: api.maxRedirects,
                requestHeadersJson: prettyJson(api.requestHeaders, {}),
                parametersJson: prettyJson(api.parameterDefinitions, []),
                bodyTemplateJson: prettyJson(api.bodyTemplate, null),
                responseSchemaJson: prettyJson(api.responseSchema, {}),
                responseMappingJson: prettyJson(api.responseMapping, {}),
                authType: api.authType,
                credentialPresent: Boolean(api.credential),
              }}
            />
          </div>
        </details>
      ))}
      <section className="space-y-5 rounded-xl border border-dashed bg-card p-5">
        <div>
          <h2 className="font-semibold">Register API operation</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Register one fixed endpoint per tool. Secrets entered here are never
            returned to the browser.
          </p>
        </div>
        <LegacyApiRegistryForm />
      </section>
    </div>
  );
}
