import Link from "next/link";

export function KnowledgeStudioNav() {
  return (
    <nav aria-label="Knowledge studio" className="flex gap-2 border-b pb-3">
      <Link
        className="min-h-11 rounded-lg px-3 py-3 text-sm font-medium hover:bg-muted"
        href="/workspace/admin/bots"
      >
        Bots
      </Link>
      <Link
        className="min-h-11 rounded-lg px-3 py-3 text-sm font-medium hover:bg-muted"
        href="/workspace/admin/knowledge"
      >
        Knowledge racks
      </Link>
      <Link
        className="min-h-11 rounded-lg px-3 py-3 text-sm font-medium hover:bg-muted"
        href="/workspace/admin/knowledge/sources"
      >
        Sources
      </Link>
      <Link
        className="min-h-11 rounded-lg px-3 py-3 text-sm font-medium hover:bg-muted"
        href="/workspace/admin/knowledge/index-jobs"
      >
        Index operations
      </Link>
    </nav>
  );
}
