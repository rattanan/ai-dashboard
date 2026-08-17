import Link from "next/link";
import { ChevronDown, Menu, ShieldCheck } from "lucide-react";
import { WorkspaceNav } from "./workspace-nav";
import { logoutAction } from "@/features/auth/actions";
import {
  InsightKmMark,
  InsightKmWordmark,
} from "@/components/brand/insightkm-mark";
import type { NavigationAccess } from "./workspace-nav";

export function WorkspaceShell({
  children,
  workspace,
  user,
  navigation,
}: {
  children: React.ReactNode;
  workspace: { name: string; organizationName: string };
  user: { name?: string | null; email?: string | null };
  navigation: NavigationAccess;
}) {
  const initials = (user.name || user.email || "U")
    .split(/\s|@/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
  return (
    <div className="min-h-dvh bg-background lg:grid lg:grid-cols-[272px_1fr]">
      <a
        href="#main-content"
        className="sr-only fixed left-4 top-4 z-50 rounded-lg bg-slate-950 px-4 py-3 text-sm font-medium text-white focus:not-sr-only"
      >
        Skip to main content
      </a>
      <aside className="hidden border-r bg-card lg:fixed lg:inset-y-0 lg:flex lg:w-[272px] lg:flex-col">
        <div className="flex h-20 shrink-0 items-center border-b px-5">
          <Link href="/workspace" className="flex items-center gap-3">
            <InsightKmMark />
            <InsightKmWordmark />
          </Link>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4 [scrollbar-gutter:stable]">
          <div className="mb-5 rounded-xl border bg-[linear-gradient(135deg,#fafaff,#f4f3ff)] p-3.5">
            <p className="truncate text-xs font-medium text-muted-foreground">
              {workspace.organizationName}
            </p>
            <p className="mt-1 truncate text-sm font-semibold">
              {workspace.name}
            </p>
            <div className="mt-3 flex items-center gap-1.5 text-[11px] font-medium text-emerald-700">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              Knowledge workspace active
            </div>
          </div>
          <WorkspaceNav {...navigation} />
        </div>
      </aside>
      <div className="lg:col-start-2">
        <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b bg-white/90 px-4 backdrop-blur-xl sm:px-7">
          <details className="relative lg:hidden">
            <summary
              className="grid size-11 cursor-pointer list-none place-items-center rounded-lg border"
              aria-label="Open navigation"
            >
              <Menu size={20} />
            </summary>
            <div className="absolute left-0 top-13 max-h-[calc(100dvh-6rem)] w-[min(22rem,calc(100vw-2rem))] overflow-y-auto rounded-xl border bg-card p-3 shadow-xl">
              <p className="px-3 pb-3 text-sm font-semibold">
                {workspace.name}
              </p>
              <WorkspaceNav mobile {...navigation} />
            </div>
          </details>
          <div className="hidden lg:block">
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
              Knowledge workspace
            </p>
            <p className="mt-0.5 text-sm font-semibold">{workspace.name}</p>
          </div>
          <details className="relative">
            <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-lg px-2 hover:bg-muted">
              <span className="grid size-8 place-items-center rounded-full bg-slate-900 text-xs font-semibold text-white">
                {initials}
              </span>
              <span className="hidden max-w-40 truncate text-sm font-medium sm:block">
                {user.name || user.email}
              </span>
              <ChevronDown size={15} />
            </summary>
            <div className="absolute right-0 top-12 w-56 rounded-xl border bg-card p-2 shadow-xl">
              <div className="border-b px-3 py-2">
                <p className="truncate text-sm font-medium">{user.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {user.email}
                </p>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
                <ShieldCheck size={14} /> Governed access
              </div>
              <Link
                href="/workspace/profile"
                className="block min-h-10 rounded-lg px-3 py-2.5 text-sm hover:bg-muted"
              >
                Profile & security
              </Link>
              <form action={logoutAction} className="mt-2">
                <button className="min-h-10 w-full cursor-pointer rounded-lg px-3 text-left text-sm hover:bg-muted">
                  Sign out
                </button>
              </form>
            </div>
          </details>
        </header>
        <main
          id="main-content"
          className="mx-auto w-full max-w-[1500px] p-5 sm:p-7 lg:p-9"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
