import Link from "next/link";
import { KnowledgeRackForm } from "@/components/knowledge/phase2-forms";
import { KnowledgeStudioNav } from "@/components/knowledge/studio-nav";
import { PageHeader } from "@/components/ui/page-header";
import { requireAuthorization } from "@/server/auth/authorization";
import { requirePermission } from "@/server/auth/permissions";
import { db } from "@/server/db";

export default async function NewKnowledgeRackPage() {
  const context = await requireAuthorization();
  await requirePermission(context, "knowledge.manage");
  const roles = await db.role.findMany({
    where: { organizationId: context.organizationId },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Knowledge racks"
        title="Create knowledge rack"
        description="Create one access-controlled rack before adding documents and operational sources."
        action={
          <Link
            href="/workspace/admin/knowledge"
            className="inline-flex min-h-11 items-center rounded-lg border px-4 text-sm font-medium"
          >
            Back to racks
          </Link>
        }
      />
      <KnowledgeStudioNav />
      <section className="rounded-xl border bg-card p-5 sm:p-6">
        <KnowledgeRackForm roles={roles} />
      </section>
    </div>
  );
}
