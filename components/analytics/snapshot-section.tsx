import Link from "next/link";
import { AnalyticsNav } from "@/components/analytics/analytics-nav";
import { PageHeader } from "@/components/ui/page-header";
import { requireAuthorization } from "@/server/auth/authorization";
import { hasPermission } from "@/server/auth/permissions";
import { db } from "@/server/db";

function array(value: unknown) {
  return Array.isArray(value) ? value : [];
}
function object(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export async function SnapshotSection({
  section,
}: {
  section:
    | "topics"
    | "unanswered"
    | "knowledge-gaps"
    | "bot-performance"
    | "source-performance"
    | "reports";
}) {
  const context = await requireAuthorization();
  const admin = await hasPermission(context, "role.manage");
  const jobs = await db.businessInsightJob.findMany({
    where: {
      organizationId: context.organizationId,
      workspaceId: context.workspaceId,
      ...(!admin ? { requestedById: context.userId } : {}),
    },
    include: {
      snapshots: { orderBy: { version: "desc" }, take: 1 },
      bot: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: section === "reports" ? 50 : 1,
  });
  const snapshot = jobs[0]?.snapshots[0];
  const gaps = object(snapshot?.knowledgeGaps);
  const title = (
    {
      topics: "Topics & Trends",
      unanswered: "Unanswered Questions",
      "knowledge-gaps": "Knowledge Gaps",
      "bot-performance": "Bot Performance",
      "source-performance": "Source Performance",
      reports: "Reports",
    } as const
  )[section];
  let items: unknown[] = [];
  if (section === "topics") items = array(snapshot?.topics);
  if (section === "unanswered")
    items = array(object(snapshot?.metrics).unansweredQuestions);
  if (section === "knowledge-gaps") items = array(gaps.items);
  if (section === "bot-performance")
    items = array(object(snapshot?.metrics).bots);
  if (section === "source-performance")
    items = array(object(snapshot?.metrics).sources);
  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        description={
          section === "reports"
            ? "Evidence-bound insight snapshot history. Open a report to inspect its exact filters, metrics, limitations, and evidence aggregates."
            : "This view reads the latest permitted evidence-bound snapshot. Generate a new snapshot when the period or scope changes."
        }
      />
      <AnalyticsNav />
      {section === "reports" ? (
        <div className="grid gap-4">
          {jobs.map((job) => (
            <article
              key={job.id}
              className="flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-card p-5"
            >
              <div>
                <h2 className="font-semibold">
                  {job.dateFrom.toLocaleDateString()} –{" "}
                  {job.dateTo.toLocaleDateString()}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {job.bot?.name ?? "All permitted bots"} ·{" "}
                  {job.conversationCount} conversations · {job.status}
                </p>
              </div>
              <Link
                href={`/workspace/insights?id=${job.id}`}
                className="min-h-11 rounded-lg border px-4 py-2.5 text-sm font-medium"
              >
                Open report
              </Link>
            </article>
          ))}
          {!jobs.length ? (
            <p className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
              No reports yet.
            </p>
          ) : null}
        </div>
      ) : (
        <section className="rounded-xl border bg-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-semibold">Latest permitted snapshot</h2>
            <Link
              href="/workspace/insights"
              className="min-h-11 rounded-lg border px-4 py-2.5 text-sm font-medium"
            >
              Generate / inspect snapshot
            </Link>
          </div>
          {snapshot ? (
            <>
              <p className="mt-2 text-sm text-muted-foreground">
                Generated {snapshot.createdAt.toLocaleString()} from{" "}
                {snapshot.conversationCount} conversations and{" "}
                {snapshot.messageCount} messages.
              </p>
              <div className="mt-5 grid gap-3 lg:grid-cols-2">
                {items.map((item, index) => (
                  <pre
                    key={index}
                    className="overflow-auto rounded-lg bg-muted p-4 text-xs whitespace-pre-wrap"
                  >
                    {JSON.stringify(item, null, 2)}
                  </pre>
                ))}
                {!items.length ? (
                  <p className="text-sm text-muted-foreground">
                    No stable evidence signal for this section in the latest
                    snapshot.
                  </p>
                ) : null}
              </div>
            </>
          ) : (
            <p className="mt-5 text-sm text-muted-foreground">
              No snapshot is available in your permitted scope.
            </p>
          )}
        </section>
      )}
    </div>
  );
}
