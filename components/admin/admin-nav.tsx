"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const links = [
  ["Overview", "/workspace/admin", true],
  ["Chat AI Endpoint", "/workspace/admin/chat-endpoint", true],
  ["Embedding Endpoint", "/workspace/admin/embedding-endpoint", true],
  ["Authentication", "/workspace/admin/authentication", true],
  ["Users", "/workspace/admin/users", false],
  ["Roles", "/workspace/admin/roles", false],
  ["Storage", "/workspace/admin/storage", true],
  ["Worker & Queue", "/workspace/admin/knowledge/index-jobs", true],
  ["PDPA & Masking", "/workspace/admin/privacy", true],
  ["Logs & Audit", "/workspace/admin/audit-logs", true],
  ["System Health", "/workspace/admin/system-health", true],
  ["Scopes", "/workspace/admin/scopes", false],
  ["Access Simulator", "/workspace/admin/access-simulator", true],
  ["Provider Compatibility", "/workspace/admin/providers", true],
  ["Login History", "/workspace/admin/login-history", true],
  ["Knowledge Racks", "/workspace/admin/knowledge", false],
] as const;

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Administration"
      className="flex gap-2 overflow-x-auto border-b pb-3"
    >
      {links.map(([label, href, exact]) => {
        const active = exact
          ? pathname === href
          : pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "min-h-11 shrink-0 rounded-lg px-3 py-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 motion-reduce:transition-none",
              active
                ? "bg-indigo-50 text-indigo-950"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-950",
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
