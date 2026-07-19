"use client";

import { useState } from "react";
import { AlertTriangle, ArrowUpRight, Lightbulb, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Insight = {
  title: string;
  statement: string;
  confidence: number;
  caveats: string[];
};

function insightStyle(insight: Insight) {
  const text = `${insight.title} ${insight.statement}`.toLowerCase();
  if (/risk|warning|declin|drop|late|critical|overdue/.test(text))
    return { label: "Watch", icon: AlertTriangle, tone: "warning" as const, className: "from-amber-50 to-orange-50 border-amber-200 text-amber-800" };
  if (/opportun|growth|improv|increase|positive/.test(text))
    return { label: "Opportunity", icon: ArrowUpRight, tone: "success" as const, className: "from-emerald-50 to-teal-50 border-emerald-200 text-emerald-800" };
  if (/recommend|next step|action/.test(text))
    return { label: "Recommendation", icon: Lightbulb, tone: "info" as const, className: "from-cyan-50 to-blue-50 border-cyan-200 text-cyan-900" };
  return { label: "Key finding", icon: Sparkles, tone: "info" as const, className: "from-blue-50 to-indigo-50 border-blue-200 text-blue-950" };
}

export function InsightHighlights({ insights }: { insights: Insight[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  return (
    <section aria-labelledby="ai-highlights-heading" className="dashboard-section-enter mt-7">
      <div className="mb-3 flex items-end justify-between gap-3 px-1">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-700">AI business insight</p>
          <h2 id="ai-highlights-heading" className="mt-1 text-lg font-semibold tracking-tight">What needs attention</h2>
        </div>
        <Badge tone="info">Grounded findings</Badge>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {insights.map((insight) => {
          const style = insightStyle(insight);
          const Icon = style.icon;
          const isExpanded = expanded === insight.title;
          return (
            <article key={`${insight.title}-${insight.statement}`} className={`rounded-2xl border bg-gradient-to-br p-5 shadow-sm transition-transform duration-200 hover:-translate-y-0.5 motion-reduce:transition-none ${style.className}`}>
              <div className="flex items-start justify-between gap-3">
                <span className="grid size-10 place-items-center rounded-xl bg-white/75 shadow-sm"><Icon size={19} /></span>
                <Badge tone={style.tone}>{style.label}</Badge>
              </div>
              <h3 className="mt-4 truncate text-sm font-semibold">{insight.title}</h3>
              <p className={`mt-1.5 text-sm leading-6 opacity-85 ${isExpanded ? "" : "line-clamp-3"}`}>{insight.statement}</p>
              <div className="mt-4 flex items-center justify-between gap-2 border-t border-current/10 pt-3">
                <span className="text-xs font-medium">Confidence {Math.round(insight.confidence * 100)}%</span>
                <Button type="button" size="sm" variant="ghost" onClick={() => setExpanded(isExpanded ? null : insight.title)}>{isExpanded ? "Less" : "Explore"}</Button>
              </div>
              {isExpanded && insight.caveats.length ? <p className="mt-3 text-xs leading-5 opacity-75">Notes: {insight.caveats.slice(0, 3).join(" · ")}</p> : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}
