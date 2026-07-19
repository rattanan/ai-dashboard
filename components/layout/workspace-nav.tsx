"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Database,
  FileSpreadsheet,
  LayoutDashboard,
  Settings,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/workspace", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/workspace/data-sources", label: "Data sources", icon: Database },
  { href: "/workspace/dashboards", label: "Dashboards", icon: Sparkles },
  { href: "/workspace/settings", label: "Settings", icon: Settings },
];

export function WorkspaceNav({
  mobile = false,
  administration = false,
  excel = false,
}: {
  mobile?: boolean;
  administration?: boolean;
  excel?: boolean;
}) {
  const pathname = usePathname();
  const visibleItems = [
    ...items,
    ...(excel
      ? [
          {
            href: "/workspace/excel",
            label: "Excel uploads",
            icon: FileSpreadsheet,
          },
        ]
      : []),
    ...(administration
      ? [
          {
            href: "/workspace/admin/users",
            label: "Administration",
            icon: ShieldCheck,
          },
        ]
      : []),
  ];
  return (
    <nav
      aria-label="Workspace navigation"
      className={cn("space-y-1", mobile && "grid grid-cols-2 gap-2 space-y-0")}
    >
      {visibleItems.map(({ href, label, icon: Icon, exact }) => {
        const active = exact ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",
              active
                ? "bg-secondary text-secondary-foreground"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-950",
            )}
          >
            <Icon size={18} aria-hidden="true" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
