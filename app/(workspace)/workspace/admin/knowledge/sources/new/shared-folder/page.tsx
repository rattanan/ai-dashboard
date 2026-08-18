import Link from "next/link";
import { SharedFolderSourceForm } from "@/components/knowledge/phase4-forms";
import { PageHeader } from "@/components/ui/page-header";
import { requireAuthorization } from "@/server/auth/authorization";
import { requirePermission } from "@/server/auth/permissions";
import { db } from "@/server/db";
import { configuredSharedRoots } from "@/packages/knowledge/source-security";
import { env } from "@/schemas/env";

export default async function NewSharedFolderSourcePage() {
  const context = await requireAuthorization();
  await requirePermission(context, "knowledge.manage");
  const racks = await db.knowledgeRack.findMany({
    where: { organizationId: context.organizationId, active: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  const sharedFolderRoots = configuredSharedRoots(
    env().KNOWLEDGE_SHARED_FOLDER_ROOTS,
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Shared folder sources"
        title="Add shared folder"
        description="Connect an allowlisted, pre-mounted folder for incremental worker ingestion."
        action={
          <Link
            href="/workspace/admin/knowledge/sources?type=SHARED_FOLDER"
            className="inline-flex min-h-11 items-center rounded-lg border px-4 text-sm font-medium"
          >
            Back to shared folders
          </Link>
        }
      />
      <section className="max-w-4xl rounded-xl border bg-card p-5 sm:p-6">
        <SharedFolderSourceForm
          racks={racks}
          allowedRoots={sharedFolderRoots}
        />
      </section>
    </div>
  );
}
