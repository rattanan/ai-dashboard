import Link from "next/link";
import { AnalyticsNav } from "@/components/analytics/analytics-nav";
import { PageHeader } from "@/components/ui/page-header";
import { updateKnowledgeGapFormAction } from "@/features/insights/knowledge-gap-actions";
import { requireAuthorization } from "@/server/auth/authorization";
import { hasPermission, requirePermission } from "@/server/auth/permissions";
import { db } from "@/server/db";

export default async function KnowledgeGapsPage() {
  const context = await requireAuthorization();
  await requirePermission(context, "insight.manage");
  const [admin, canAudit, membership, users] = await Promise.all([
    hasPermission(context, "role.manage"),
    hasPermission(context, "chat.audit"),
    db.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: context.organizationId,
          userId: context.userId,
        },
      },
      include: { projects: true },
    }),
    db.organizationMember.findMany({
      where: {
        organizationId: context.organizationId,
        user: { status: "ACTIVE", deletedAt: null },
      },
      select: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { user: { name: "asc" } },
    }),
  ]);
  const projects = membership?.projects.map(({ projectId }) => projectId) ?? [];
  const allowedMessages = await db.chatMessage.findMany({
    where: {
      conversation: {
        organizationId: context.organizationId,
        deletedAt: null,
        ...(!canAudit
          ? { userId: context.userId }
          : !admin
            ? {
                OR: [
                  ...(membership?.organizationUnitId
                    ? [{ organizationUnitId: membership.organizationUnitId }]
                    : []),
                  ...(projects.length ? [{ projectId: { in: projects } }] : []),
                  { userId: context.userId },
                ],
              }
            : {}),
      },
    },
    select: { id: true },
    take: 10000,
  });
  const gaps = await db.knowledgeGap.findMany({
    where: {
      organizationId: context.organizationId,
      workspaceId: context.workspaceId,
      evidenceMessageIds: { hasSome: allowedMessages.map(({ id }) => id) },
    },
    include: { assignee: { select: { name: true, email: true } } },
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    take: 200,
  });
  return (
    <div className="space-y-6">
      <PageHeader
        title="Knowledge Gaps"
        description="Assign, resolve, and connect evidence-bound gaps to new or improved sources without weakening conversation ACL."
      />
      <AnalyticsNav />
      <div className="space-y-4">
        {gaps.map((gap) => (
          <article key={gap.id} className="rounded-xl border bg-card p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-amber-700">
                  {gap.priority} · {gap.status}
                </p>
                <h2 className="mt-1 font-semibold">{gap.title}</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  {gap.question}
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                {gap.evidenceMessageIds.length} evidence messages
              </p>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href={`/workspace/insights/chat-history?reason=${encodeURIComponent("Resolve knowledge gap")}&q=${encodeURIComponent(gap.question)}`}
                className="min-h-11 rounded-lg border px-3 py-2.5 text-sm font-medium"
              >
                Open evidence
              </Link>
              <Link
                href="/workspace/sources/copied-text/new"
                className="min-h-11 rounded-lg border px-3 py-2.5 text-sm font-medium"
              >
                Create copied text
              </Link>
              <Link
                href="/workspace/sources/file-upload"
                className="min-h-11 rounded-lg border px-3 py-2.5 text-sm font-medium"
              >
                Upload document
              </Link>
              <Link
                href="/workspace/sources"
                className="min-h-11 rounded-lg border px-3 py-2.5 text-sm font-medium"
              >
                Assign source to bot
              </Link>
            </div>
            <form
              action={updateKnowledgeGapFormAction}
              className="mt-4 grid gap-3 border-t pt-4 sm:grid-cols-[1fr_180px_auto]"
            >
              <input type="hidden" name="id" value={gap.id} />
              <label className="text-sm">
                <span className="mb-1 block font-medium">Assignee</span>
                <select
                  name="assigneeId"
                  defaultValue={gap.assigneeId ?? ""}
                  className="min-h-11 w-full rounded-lg border bg-background px-3"
                >
                  <option value="">Unassigned</option>
                  {users.map(({ user }) => (
                    <option key={user.id} value={user.id}>
                      {user.name ?? user.email}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm">
                <span className="mb-1 block font-medium">Status</span>
                <select
                  name="status"
                  defaultValue={gap.status}
                  className="min-h-11 w-full rounded-lg border bg-background px-3"
                >
                  <option value="OPEN">Open</option>
                  <option value="IN_PROGRESS">In progress</option>
                  <option value="RESOLVED">Resolved</option>
                </select>
              </label>
              <button className="min-h-11 self-end rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground">
                Save workflow
              </button>
            </form>
          </article>
        ))}
        {!gaps.length ? (
          <p className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
            No knowledge gaps have been created in your permitted scope.
          </p>
        ) : null}
      </div>
    </div>
  );
}
