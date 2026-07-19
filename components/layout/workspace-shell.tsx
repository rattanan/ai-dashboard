import Link from "next/link";
import { ChevronDown, LayoutDashboard, Menu } from "lucide-react";
import { WorkspaceNav } from "./workspace-nav";
import { logoutAction } from "@/features/auth/actions";

export function WorkspaceShell({
  children,
  workspace,
  user,
  navigation,
}: {
  children: React.ReactNode;
  workspace: { name: string; organizationName: string };
  user: { name?: string | null; email?: string | null };
  navigation: { administration: boolean; excel: boolean };
}) {
  const initials = (user.name || user.email || "U")
    .split(/\s|@/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
  return (
    <div className="min-h-dvh bg-background lg:grid lg:grid-cols-[256px_1fr]">
      <aside className="hidden border-r bg-card lg:fixed lg:inset-y-0 lg:block lg:w-64">
        <div className="flex h-18 items-center border-b px-5">
          <Link
            href="/workspace"
            className="flex items-center gap-2 font-semibold"
          >
            <span className="grid size-9 place-items-center rounded-lg bg-primary text-white">
              <LayoutDashboard size={18} />
            </span>
            AI Dashboard
          </Link>
        </div>
        <div className="p-4">
          <div className="mb-5 rounded-lg border bg-slate-50 p-3">
            <p className="truncate text-xs font-medium text-muted-foreground">
              {workspace.organizationName}
            </p>
            <p className="mt-1 truncate text-sm font-semibold">
              {workspace.name}
            </p>
          </div>
          <WorkspaceNav {...navigation} />
        </div>
      </aside>
      <div className="lg:col-start-2">
        <header className="sticky top-0 z-30 flex h-18 items-center justify-between border-b bg-white/95 px-4 backdrop-blur-sm sm:px-7">
          <details className="relative lg:hidden">
            <summary
              className="grid size-11 cursor-pointer list-none place-items-center rounded-lg border"
              aria-label="Open navigation"
            >
              <Menu size={20} />
            </summary>
            <div className="absolute left-0 top-13 w-72 rounded-xl border bg-card p-3 shadow-xl">
              <p className="px-3 pb-3 text-sm font-semibold">
                {workspace.name}
              </p>
              <WorkspaceNav mobile {...navigation} />
            </div>
          </details>
          <div className="hidden lg:block">
            <p className="text-xs text-muted-foreground">Workspace</p>
            <p className="text-sm font-semibold">{workspace.name}</p>
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
