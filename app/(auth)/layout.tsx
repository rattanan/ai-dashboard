import Link from "next/link";
import { LayoutDashboard } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main
      id="main-content"
      className="grid min-h-dvh place-items-center bg-background px-4 py-10"
    >
      <div className="w-full max-w-md">
        <Link
          href="/"
          className="mb-8 flex items-center justify-center gap-2 font-semibold text-slate-950"
        >
          <span className="grid size-9 place-items-center rounded-lg bg-primary text-white">
            <LayoutDashboard size={19} aria-hidden="true" />
          </span>
          AI Dashboard
        </Link>
        {children}
      </div>
    </main>
  );
}
