"use client";

import { useId } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bot,
  ChartNoAxesCombined,
  DatabaseZap,
  FileSpreadsheet,
  House,
  LayoutDashboard,
  LibraryBig,
  MessagesSquare,
  PlugZap,
  Settings2,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

type NavigationAccess = {
  administration: boolean;
  bots: boolean;
  knowledgeManagement: boolean;
  dataConnections: boolean;
  excel: boolean;
  legacyApis: boolean;
  dashboards: boolean;
  insights: boolean;
  chatAudit: boolean;
};

type NavigationItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  show?: keyof NavigationAccess;
  exact?: boolean;
  activePrefixes?: string[];
};

const groups: Array<{ label: string; items: NavigationItem[] }> = [
  {
    label: "Workspace",
    items: [
      {
        href: "/workspace",
        label: "Overview",
        icon: House,
        exact: true,
      },
      {
        href: "/workspace/bots",
        label: "Ask InsightKM",
        icon: Bot,
        show: "bots",
        activePrefixes: ["/workspace/bots", "/workspace/chat"],
      },
    ],
  },
  {
    label: "Knowledge",
    items: [
      {
        href: "/workspace/admin/bots",
        label: "Knowledge studio",
        icon: LibraryBig,
        show: "knowledgeManagement",
        activePrefixes: ["/workspace/admin/bots", "/workspace/admin/knowledge"],
      },
    ],
  },
  {
    label: "Connected intelligence",
    items: [
      {
        href: "/workspace/data-sources",
        label: "Data connections",
        icon: DatabaseZap,
        show: "dataConnections",
      },
      {
        href: "/workspace/excel",
        label: "Excel library",
        icon: FileSpreadsheet,
        show: "excel",
      },
      {
        href: "/workspace/admin/legacy-apis",
        label: "Legacy API registry",
        icon: PlugZap,
        show: "legacyApis",
        exact: true,
      },
    ],
  },
  {
    label: "Analytics",
    items: [
      {
        href: "/workspace/dashboards",
        label: "Insight dashboards",
        icon: LayoutDashboard,
        show: "dashboards",
      },
      {
        href: "/workspace/insights",
        label: "Business insights",
        icon: ChartNoAxesCombined,
        show: "insights",
        exact: true,
      },
      {
        href: "/workspace/insights/chat-history",
        label: "Governed chat history",
        icon: MessagesSquare,
        show: "chatAudit",
        exact: true,
      },
    ],
  },
  {
    label: "Governance",
    items: [
      {
        href: "/workspace/admin",
        label: "Administration",
        icon: ShieldCheck,
        show: "administration",
        activePrefixes: [
          "/workspace/admin/users",
          "/workspace/admin/roles",
          "/workspace/admin/scopes",
          "/workspace/admin/authentication",
          "/workspace/admin/access-simulator",
          "/workspace/admin/providers",
          "/workspace/admin/privacy",
          "/workspace/admin/system-health",
          "/workspace/admin/login-history",
          "/workspace/admin/audit-logs",
        ],
      },
      {
        href: "/workspace/settings",
        label: "Workspace settings",
        icon: Settings2,
        exact: true,
      },
    ],
  },
];

function matchesPath(pathname: string, item: NavigationItem) {
  if (pathname === item.href) return true;
  if (item.exact) return false;
  const prefixes = item.activePrefixes ?? [item.href];
  return prefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function WorkspaceNav({
  mobile = false,
  ...access
}: NavigationAccess & { mobile?: boolean }) {
  const pathname = usePathname();
  const navigationId = useId().replaceAll(":", "");
  const visibleGroups = groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => !item.show || access[item.show]),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <nav aria-label="Main navigation" className="space-y-5">
      {visibleGroups.map((group, groupIndex) => {
        const headingId = `${navigationId}-nav-group-${groupIndex}`;
        return (
          <section key={group.label} aria-labelledby={headingId}>
            <h2
              id={headingId}
              className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400"
            >
              {group.label}
            </h2>
            <div
              className={cn(
                "space-y-1",
                mobile && "grid grid-cols-2 gap-1.5 space-y-0",
              )}
            >
              {group.items.map((item) => {
                const active = matchesPath(pathname, item);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "group flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium leading-5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 motion-reduce:transition-none",
                      active
                        ? "bg-indigo-50 text-indigo-950 shadow-[inset_3px_0_0_#4f46e5]"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-950",
                    )}
                  >
                    <Icon
                      size={18}
                      className={cn(
                        "shrink-0 text-slate-400 transition-colors group-hover:text-slate-700",
                        active && "text-indigo-600 group-hover:text-indigo-600",
                      )}
                      aria-hidden="true"
                    />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </section>
        );
      })}
    </nav>
  );
}

export type { NavigationAccess };
