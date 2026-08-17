import Link from "next/link";
import {
  SharedFolderSourceForm,
  WebSourceForm,
} from "@/components/knowledge/phase4-forms";
import { PageHeader } from "@/components/ui/page-header";
import { requireAuthorization } from "@/server/auth/authorization";
import { requirePermission } from "@/server/auth/permissions";
import { db } from "@/server/db";

export default async function NewOperationalSourcePage() {
  const context = await requireAuthorization();
  await requirePermission(context, "knowledge.manage");
  const racks = await db.knowledgeRack.findMany({
    where: { organizationId: context.organizationId, active: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Operational knowledge sources"
        title="Add operational source"
        description="Choose one source type and configure it without mixing creation forms into the source list."
        action={
          <Link
            href="/workspace/admin/knowledge/sources"
            className="inline-flex min-h-11 items-center rounded-lg border px-4 text-sm font-medium"
          >
            Back to sources
          </Link>
        }
      />
      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-xl border bg-card p-5 sm:p-6">
          <h2 className="mb-1 font-semibold">Add shared folder</h2>
          <p className="mb-5 text-sm text-muted-foreground">
            Only allowlisted, canonical worker paths are accepted.
          </p>
          <SharedFolderSourceForm racks={racks} />
        </section>
        <section className="rounded-xl border bg-card p-5 sm:p-6">
          <h2 className="mb-1 font-semibold">Add web page</h2>
          <p className="mb-5 text-sm text-muted-foreground">
            Public HTTP(S) only, with domain, redirect, DNS, size, and timeout
            controls.
          </p>
          <WebSourceForm racks={racks} />
        </section>
      </div>
    </div>
  );
}
