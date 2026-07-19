import Link from "next/link";
import { redirect } from "next/navigation";
import { Bot, Database, LayoutDashboard, LockKeyhole } from "lucide-react";
import { auth } from "@/auth";
import { Button } from "@/components/ui/button";

export default async function HomePage() {
  if ((await auth())?.user?.id) redirect("/workspace");
  return (
    <main id="main-content" className="min-h-dvh bg-white">
      <nav
        className="mx-auto flex h-18 max-w-7xl items-center justify-between px-5 sm:px-8"
        aria-label="Primary navigation"
      >
        <Link
          href="/"
          className="flex items-center gap-2 font-semibold text-slate-950"
        >
          <span className="grid size-9 place-items-center rounded-lg bg-primary text-white">
            <LayoutDashboard size={19} aria-hidden="true" />
          </span>
          AI Dashboard
        </Link>
        <Button asChild variant="ghost">
          <Link href="/login">Sign in</Link>
        </Button>
      </nav>
      <section className="border-y bg-background">
        <div className="mx-auto grid max-w-7xl items-center gap-14 px-5 py-20 sm:px-8 lg:grid-cols-[1.05fr_.95fr] lg:py-28">
          <div>
            <p className="mb-4 text-sm font-semibold text-primary">
              Business intelligence, prepared by AI
            </p>
            <h1 className="max-w-3xl text-4xl font-semibold leading-tight tracking-[-0.035em] text-slate-950 sm:text-6xl">
              Turn operational data into decision-ready dashboards.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
              Connect a trusted data source, define the questions that matter,
              and prepare a governed dashboard workspace for AI-assisted
              analysis.
            </p>
            <div className="mt-8">
              <Button asChild size="lg" variant="outline">
                <Link href="/login">Sign in to your workspace</Link>
              </Button>
            </div>
          </div>
          <div
            className="relative rounded-2xl border bg-card p-4 shadow-[0_24px_70px_rgba(15,23,42,0.12)] sm:p-6"
            aria-label="AI Dashboard product preview"
          >
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  Executive workspace
                </p>
                <p className="mt-1 font-semibold">Revenue operations</p>
              </div>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                Data connected
              </span>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <PreviewMetric label="Pipeline" value="$12.4M" />
              <PreviewMetric label="Forecast" value="$8.7M" />
              <div className="col-span-2 h-48 rounded-xl border bg-[linear-gradient(to_right,#eef2f7_1px,transparent_1px),linear-gradient(to_bottom,#eef2f7_1px,transparent_1px)] bg-[size:28px_28px] p-5">
                <div className="flex h-full items-end gap-3" aria-hidden="true">
                  {[38, 55, 43, 67, 60, 79, 72, 88].map((height, i) => (
                    <span
                      key={i}
                      className="flex-1 rounded-t bg-blue-700/90"
                      style={{ height: `${height}%` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className="mx-auto grid max-w-7xl gap-5 px-5 py-16 sm:px-8 md:grid-cols-3">
        <Feature
          icon={<Database />}
          title="Governed connections"
          text="Encrypted credentials, server-only testing, and tenant-scoped metadata discovery."
        />
        <Feature
          icon={<Bot />}
          title="AI-ready context"
          text="Capture business goals, desired KPIs, reporting periods, and critical filters."
        />
        <Feature
          icon={<LockKeyhole />}
          title="Built for trust"
          text="Role-aware authorization, read-only SQL controls, version history, and audit events."
        />
      </section>
    </main>
  );
}

function PreviewMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}
function Feature({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-6">
      <div className="mb-4 grid size-10 place-items-center rounded-lg bg-secondary text-primary">
        {icon}
      </div>
      <h2 className="font-semibold">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p>
    </div>
  );
}
