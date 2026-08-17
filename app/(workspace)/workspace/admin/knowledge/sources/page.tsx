import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { KnowledgeStudioNav } from "@/components/knowledge/studio-nav";
import {
  SharedFolderSourceForm,
  WebSourceForm,
} from "@/components/knowledge/phase4-forms";
import {
  refreshSourceAction,
  reindexSourceAction,
} from "@/features/knowledge/source-actions";
import { requireAuthorization } from "@/server/auth/authorization";
import { requirePermission } from "@/server/auth/permissions";
import { db } from "@/server/db";

function dateTime(value: Date | null | undefined) {
  return value
    ? new Intl.DateTimeFormat("en-GB", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(value)
    : "Never";
}

function statusTone(status: string | null | undefined) {
  if (status === "COMPLETED") return "success" as const;
  if (status === "FAILED" || status === "CANCELLED") return "danger" as const;
  if (status === "PARTIAL") return "warning" as const;
  return "neutral" as const;
}

function sourceDescription(source: {
  type: string;
  sharedFolderConfig: {
    rootPath: string;
    scheduleEnabled: boolean;
    intervalMinutes: number;
  } | null;
  webConfig: {
    url: string;
    allowedDomains: string[];
    scheduleEnabled: boolean;
    intervalMinutes: number;
  } | null;
}) {
  if (source.sharedFolderConfig)
    return `${source.sharedFolderConfig.rootPath} · ${source.sharedFolderConfig.scheduleEnabled ? `every ${source.sharedFolderConfig.intervalMinutes} min` : "manual refresh"}`;
  if (source.webConfig)
    return `${source.webConfig.url} · ${source.webConfig.scheduleEnabled ? `every ${source.webConfig.intervalMinutes} min` : "manual refresh"}`;
  return source.type;
}

export default async function KnowledgeSourcesPage() {
  const context = await requireAuthorization();
  await requirePermission(context, "knowledge.manage");
  const racks = await db.knowledgeRack.findMany({
    where: { organizationId: context.organizationId },
    select: {
      id: true,
      name: true,
      sources: {
        where: { type: { in: ["SHARED_FOLDER", "WEB"] } },
        include: {
          sharedFolderConfig: true,
          webConfig: true,
          refreshRuns: { orderBy: { createdAt: "desc" }, take: 1 },
          _count: { select: { documents: true, snapshots: true } },
        },
        orderBy: { name: "asc" },
      },
    },
    orderBy: { name: "asc" },
  });
  const sources = racks.flatMap((rack) =>
    rack.sources.map((source) => ({ ...source, rackName: rack.name })),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Operational knowledge sources"
        description="Ingest pre-mounted folders and public web pages incrementally through the worker. The application process never mounts or crawls sources itself."
      />
      <KnowledgeStudioNav />

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-xl border bg-card p-5">
          <h2 className="mb-1 font-semibold">Add shared folder</h2>
          <p className="mb-5 text-sm text-muted-foreground">
            Only allowlisted, canonical worker paths are accepted.
          </p>
          <SharedFolderSourceForm racks={racks} />
        </section>
        <section className="rounded-xl border bg-card p-5">
          <h2 className="mb-1 font-semibold">Add web page</h2>
          <p className="mb-5 text-sm text-muted-foreground">
            Public HTTP(S) only, with domain, redirect, DNS, size, and timeout
            controls.
          </p>
          <WebSourceForm racks={racks} />
        </section>
      </div>

      <section className="rounded-xl border bg-card p-5">
        <div className="mb-4">
          <h2 className="font-semibold">Configured sources</h2>
          <p className="text-sm text-muted-foreground">
            Last-scan counts are immutable per refresh run; removed folder files
            are soft-deactivated.
          </p>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {sources.map((source) => {
            const run = source.refreshRuns[0];
            return (
              <article
                key={source.id}
                className="space-y-4 rounded-xl border p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {source.rackName} · {source.type.replace("_", " ")}
                    </p>
                    <h3 className="font-semibold">{source.name}</h3>
                    <p className="mt-1 break-all text-sm text-muted-foreground">
                      {sourceDescription(source)}
                    </p>
                  </div>
                  <Badge tone={statusTone(source.lastRefreshStatus)}>
                    {source.lastRefreshStatus ?? "NOT RUN"}
                  </Badge>
                </div>
                <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                  <div>
                    <dt className="text-muted-foreground">New</dt>
                    <dd className="font-medium">{run?.newCount ?? 0}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Changed</dt>
                    <dd className="font-medium">{run?.changedCount ?? 0}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Deleted</dt>
                    <dd className="font-medium">{run?.deletedCount ?? 0}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Unchanged</dt>
                    <dd className="font-medium">{run?.unchangedCount ?? 0}</dd>
                  </div>
                </dl>
                <p className="text-xs text-muted-foreground">
                  Last refresh: {dateTime(source.lastRefreshAt)} ·{" "}
                  {source._count.documents} documents ·{" "}
                  {source._count.snapshots} snapshots
                </p>
                {source.lastRefreshMessage ? (
                  <p className="rounded-lg bg-muted p-3 text-sm">
                    {source.lastRefreshMessage}
                  </p>
                ) : null}
                {run?.errorCount ? (
                  <p className="text-sm text-destructive">
                    {run.errorCount} item(s) failed. Review Index operations for
                    details.
                  </p>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  <form action={refreshSourceAction}>
                    <input type="hidden" name="id" value={source.id} />
                    <button className="min-h-11 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground">
                      Refresh now
                    </button>
                  </form>
                  <form action={reindexSourceAction}>
                    <input type="hidden" name="id" value={source.id} />
                    <button className="min-h-11 rounded-lg border px-4 text-sm font-medium">
                      Re-index current documents
                    </button>
                  </form>
                </div>
              </article>
            );
          })}
          {!sources.length ? (
            <p className="text-sm text-muted-foreground">
              No operational sources configured yet.
            </p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
