import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { DocumentUploadForm } from "@/components/knowledge/phase2-forms";
import { retryDocumentIndexAction } from "@/features/knowledge/actions";
import { requireAuthorization } from "@/server/auth/authorization";
import { requirePermission } from "@/server/auth/permissions";
import { db } from "@/server/db";

export default async function KnowledgeRackAdministrationPage() {
  const context = await requireAuthorization();
  await requirePermission(context, "knowledge.manage");
  const racks = await db.knowledgeRack.findMany({
    where: { organizationId: context.organizationId },
    include: {
      sources: {
        include: {
          webConfig: { select: { url: true } },
          documents: {
            include: {
              currentVersion: { select: { id: true } },
              versions: {
                orderBy: { version: "desc" },
                take: 1,
                include: {
                  indexJobs: { orderBy: { createdAt: "desc" }, take: 1 },
                  _count: { select: { chunks: true } },
                },
              },
            },
            orderBy: { updatedAt: "desc" },
          },
        },
      },
      _count: { select: { bots: true, access: true } },
    },
    orderBy: { name: "asc" },
  });
  return (
    <div className="space-y-6">
      <PageHeader
        title="Knowledge racks"
        description="Upload governed documents and monitor parsing, chunking, embedding, retries, and index versions."
        action={
          <Link
            href="/workspace/admin/knowledge/new"
            className="inline-flex min-h-11 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground"
          >
            Create knowledge rack
          </Link>
        }
      />
      {racks.map((rack) => {
        const hasRows = rack.sources.some(
          (source) =>
            source.type === "WEB" || source.documents.length > 0,
        );
        return (
          <section
            key={rack.id}
            className="space-y-5 rounded-xl border bg-card p-5"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold">{rack.name}</h2>
                <p className="text-sm text-muted-foreground">
                  {rack.description ?? "File knowledge source"} ·{" "}
                  {rack._count.bots} bots · {rack._count.access} ACL entries
                </p>
              </div>
              <Badge tone={rack.active ? "success" : "neutral"}>
                {rack.active ? "ACTIVE" : "INACTIVE"}
              </Badge>
            </div>
            <DocumentUploadForm rackId={rack.id} />
            <div className="overflow-x-auto border-t pt-4">
              <table className="w-full text-left text-sm">
                <thead className="text-muted-foreground">
                  <tr>
                    <th className="py-2 pr-4">Document / source</th>
                    <th className="py-2 pr-4">Pages / version</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4">Chunks</th>
                    <th className="py-2">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {rack.sources.map((source) => {
                    if (source.type === "WEB") {
                      const documents = source.documents.filter(
                        (document) => document.active,
                      );
                      const versions = documents.flatMap((document) =>
                        document.versions.slice(0, 1),
                      );
                      const status = versions.some(
                        (version) => version.status === "FAILED",
                      )
                        ? "FAILED"
                        : documents.length > 0 &&
                            versions.length === documents.length &&
                            versions.every(
                              (version) => version.status === "INDEXED",
                            )
                          ? "INDEXED"
                          : documents.length
                            ? "PROCESSING"
                            : "EMPTY";
                      const chunks = versions.reduce(
                        (total, version) => total + version._count.chunks,
                        0,
                      );
                      return (
                        <tr key={`web-${source.id}`}>
                          <td className="py-3 pr-4">
                            <p className="font-medium">{source.name}</p>
                            <a
                              href={source.webConfig?.url ?? "#"}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-1 block max-w-xl break-all text-xs text-indigo-700 underline"
                            >
                              {source.webConfig?.url ?? "Web source"}
                            </a>
                          </td>
                          <td className="py-3 pr-4 font-medium">
                            {documents.length.toLocaleString()} pages
                          </td>
                          <td className="py-3 pr-4">
                            <Badge
                              tone={
                                status === "INDEXED"
                                  ? "success"
                                  : status === "FAILED"
                                    ? "danger"
                                    : "warning"
                              }
                            >
                              {status}
                            </Badge>
                          </td>
                          <td className="py-3 pr-4">{chunks}</td>
                          <td className="py-3">
                            <Link
                              className="text-indigo-700 underline"
                              href="/workspace/admin/knowledge/sources"
                            >
                              Manage source
                            </Link>
                          </td>
                        </tr>
                      );
                    }
                    return source.documents.map((document) => {
                      const version = document.versions[0];
                      const job = version?.indexJobs[0];
                      return (
                        <tr key={document.id}>
                          <td className="py-3 pr-4 font-medium">
                            {document.name}
                          </td>
                          <td className="py-3 pr-4">
                            {version?.version ?? "—"}
                          </td>
                          <td className="py-3 pr-4">
                            <Badge
                              tone={
                                version?.status === "INDEXED"
                                  ? "success"
                                  : version?.status === "FAILED"
                                    ? "danger"
                                    : "warning"
                              }
                            >
                              {version?.status ?? "UNKNOWN"}
                            </Badge>
                            {version?.errorMessage ? (
                              <p className="mt-1 max-w-md text-xs text-red-700">
                                {version.errorMessage}
                              </p>
                            ) : null}
                          </td>
                          <td className="py-3 pr-4">
                            {version?._count.chunks ?? 0}
                          </td>
                          <td className="py-3">
                            {version?.status === "FAILED" && job ? (
                              <form action={retryDocumentIndexAction}>
                                <input
                                  type="hidden"
                                  name="id"
                                  value={document.id}
                                />
                                <button className="min-h-10 rounded-lg border px-3">
                                  Retry index
                                </button>
                              </form>
                            ) : document.currentVersion ? (
                              <a
                                className="text-indigo-700 underline"
                                href={`/api/documents/${document.id}/download`}
                              >
                                Open source
                              </a>
                            ) : (
                              "—"
                            )}
                          </td>
                        </tr>
                      );
                    });
                  })}
                  {!hasRows ? (
                    <tr>
                      <td className="py-5 text-muted-foreground" colSpan={5}>
                        No documents uploaded.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}
    </div>
  );
}
