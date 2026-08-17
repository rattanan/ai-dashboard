"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpenText,
  Bot,
  FileSpreadsheet,
  House,
  Lightbulb,
  ShieldCheck,
  MessageCircle,
  LibraryBig,
} from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/workspace", label: "Home", icon: House, exact: true },
  {
    href: "/workspace/data-sources",
    label: "Knowledge sources",
    icon: BookOpenText,
  },
  {
    href: "/workspace/dashboards",
    label: "Business insights",
    icon: Lightbulb,
  },
  { href: "/workspace/settings", label: "AI settings", icon: Bot },
];

export function WorkspaceNav({
  mobile = false,
  administration = false,
  excel = false,
  bots = false,
  knowledgeManagement = false,
  insights = false,
}: {
  mobile?: boolean;
  administration?: boolean;
  excel?: boolean;
  bots?: boolean;
  knowledgeManagement?: boolean;
  insights?: boolean;
}) {
  const pathname = usePathname();
  const visibleItems = [
    ...items,
    ...(bots
      ? [
          {
            href: "/workspace/bots",
            label: "Ask InsightKM",
            icon: MessageCircle,
          },
        ]
      : []),
    ...(knowledgeManagement
      ? [
          {
            href: "/workspace/admin/bots",
            label: "Knowledge studio",
            icon: LibraryBig,
          },
        ]
      : []),
    ...(insights
      ? [
          {
            href: "/workspace/insights",
            label: "Conversation insights",
            icon: Lightbulb,
          },
        ]
      : []),
    ...(excel
      ? [
          {
            href: "/workspace/excel",
            label: "File imports",
            icon: FileSpreadsheet,
          },
        ]
      : []),
    ...(administration
      ? [
          {
            href: "/workspace/admin",
            label: "Administration",
            icon: ShieldCheck,
          },
        ]
      : []),
  ];
  return (
    <nav
      aria-label="Workspace navigation"
      className={cn(
        "space-y-1.5",
        mobile && "grid grid-cols-2 gap-2 space-y-0",
      )}
    >
      {visibleItems.map(({ href, label, icon: Icon, exact }) => {
        const active = exact ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors",
              active
                ? "bg-secondary text-secondary-foreground shadow-[inset_0_0_0_1px_rgba(79,70,229,0.08)]"
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
