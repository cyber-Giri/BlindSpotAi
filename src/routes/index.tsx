import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle, ArrowRight, CheckCircle2, FileSearch, Network, ShieldAlert, Swords, Upload, Play, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMetrics, useStore } from "@/lib/store";
import { readinessScore, severityRank } from "@/lib/services";
import { ConfidenceBar, DemoTag, EvidenceBadge, SeverityBadge } from "@/components/bs/badges";
import { FindingDrawer } from "@/components/bs/finding-drawer";
import { seo } from "@/lib/seo";
import type { Severity } from "@/lib/types";

export const Route = createFileRoute("/")({
  head: () => seo("Overview", "Project intelligence overview: findings, critical risks, unverified assumptions and readiness."),
  component: Overview,
});

const SEV: Severity[] = ["Critical", "High", "Medium", "Low"];
const SEV_COLOR = ["var(--critical)", "var(--high)", "var(--medium)", "var(--low)"];

function Overview() {
  const m = useMetrics();
  const findings = useStore((s) => s.findings);
  const activity = useStore((s) => s.activity);
  const navigate = useNavigate();
  const [drawer, setDrawer] = useState<string | null>(null);
  const open = findings.filter((f) => f.status !== "Resolved");
  const dist = SEV.map((s) => ({ name: s, value: open.filter((f) => f.severity === s).length }));
  const score = readinessScore(findings);
  const top = [...open].sort((a, b) => severityRank(b.severity) - severityRank(a.severity) || b.impact - a.impact).slice(0, 5);

  const cards = [
    { label: "Total Findings", value: m.total, icon: FileSearch, to: "/findings" as const, search: {} },
    { label: "Critical Risks", value: m.critical, icon: ShieldAlert, to: "/findings" as const, search: { severity: "Critical" }, tone: "text-critical" },
    { label: "Unverified Assumptions", value: m.unverified, icon: HelpCircle, to: "/ledger" as const, search: { status: "Unverified" }, tone: "text-high" },
    { label: "Resolved Issues", value: m.resolved, icon: CheckCircle2, to: "/findings" as const, search: { status: "Resolved" }, tone: "text-success" },
  ];

  return (
    <div className="space-y-6">
      <section className="surface flex flex-col gap-5 p-6 md:flex-row md:items-center md:justify-between">
        <div>
          <DemoTag>Demo project · Campus Food Ordering System</DemoTag>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight md:text-3xl">See What Your Project Is Missing.</h1>
          <p className="mt-1.5 max-w-xl text-sm text-muted-foreground">Find hidden risks, challenge assumptions, and make better decisions before problems happen.</p>
        </div>
        <div className="flex gap-2">
          <Button asChild><Link to="/analyze">Analyze a Project <ArrowRight className="size-4" /></Link></Button>
          <Button asChild variant="outline"><Link to="/findings">Explore Demo Project</Link></Button>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((c) => (
          <button key={c.label} onClick={() => navigate({ to: c.to, search: c.search as never })} className="surface group p-4 text-left transition-colors hover:border-primary/40">
            <div className="flex items-center justify-between text-xs text-muted-foreground">{c.label}<c.icon className={`size-4 ${c.tone ?? ""}`} /></div>
            <div className="mt-2 text-3xl font-semibold tabular-nums">{c.value}</div>
            <div className="mt-1 text-xs text-muted-foreground group-hover:text-primary">View →</div>
          </button>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="surface p-5 lg:col-span-2">
          <h2 className="text-sm font-semibold">Open risk distribution</h2>
          <div className="mt-4 h-52">
            <ResponsiveContainer>
              <BarChart data={dist} layout="vertical" margin={{ left: 10 }}>
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} width={64} />
                <Tooltip cursor={{ fill: "var(--muted)" }} contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={22}>
                  {dist.map((_, i) => <Cell key={i} fill={SEV_COLOR[i]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="surface p-5">
          <div className="flex items-center justify-between"><h2 className="text-sm font-semibold">Project readiness</h2><span className="text-[11px] text-muted-foreground">Demo heuristic</span></div>
          <div className="mt-4 flex items-end gap-2"><span className="text-4xl font-semibold tabular-nums">{score}%</span></div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${score}%` }} /></div>
          <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
            Calculated from open findings weighted by severity — an illustrative, configurable heuristic, not a validated score.
            Main blockers: {open.filter((f) => f.severity === "Critical").map((f) => f.title.toLowerCase()).join("; ") || "none critical"}.
          </p>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="surface lg:col-span-2">
          <div className="flex items-center justify-between border-b px-5 py-3"><h2 className="text-sm font-semibold">Most important findings</h2><Link to="/findings" className="text-xs text-primary">View all</Link></div>
          <ul className="divide-y">
            {top.map((f) => (
              <li key={f.id} className="flex flex-col gap-2 px-5 py-3 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{f.title}</div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground"><span>{f.category}</span><EvidenceBadge e={f.evidence} /><span>{f.detectedAt}</span></div>
                </div>
                <div className="flex items-center gap-3"><ConfidenceBar v={f.confidence} /><SeverityBadge s={f.severity} /><Button size="sm" variant="ghost" onClick={() => setDrawer(f.id)}>Details</Button></div>
              </li>
            ))}
            {top.length === 0 && <li className="px-5 py-8 text-center text-sm text-muted-foreground">All findings resolved. 🎉</li>}
          </ul>
        </div>
        <div className="space-y-4">
          <div className="surface p-5">
            <h2 className="text-sm font-semibold">Quick actions</h2>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {[
                { l: "Upload Documents", i: Upload, to: "/analyze" as const },
                { l: "Run New Analysis", i: Play, to: "/analyze" as const },
                { l: "Challenge My Plan", i: Swords, to: "/devils-advocate" as const },
                { l: "Explore Ripple Effects", i: Network, to: "/ripple" as const },
              ].map((a) => (
                <Link key={a.l} to={a.to} className="flex flex-col gap-2 rounded-md border p-3 text-xs font-medium transition-colors hover:border-primary/40 hover:bg-accent"><a.i className="size-4 text-primary" />{a.l}</Link>
              ))}
            </div>
          </div>
          <div className="surface p-5">
            <h2 className="text-sm font-semibold">Recent activity</h2>
            <ol className="mt-3 space-y-3 border-l pl-4">
              {activity.slice(0, 6).map((a) => (
                <li key={a.id} className="relative text-xs">
                  <span className={`absolute -left-[21px] top-1 size-2 rounded-full ${a.type === "risk" ? "bg-critical" : a.type === "verified" || a.type === "completed" ? "bg-success" : "bg-primary"}`} />
                  <div>{a.text}</div>
                  <div className="text-muted-foreground">{new Date(a.at).toLocaleString()}</div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>
      {m.critical > 0 && (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><AlertTriangle className="size-3.5" />All figures come from the demo project and are illustrative.</p>
      )}
      <FindingDrawer id={drawer} onClose={() => setDrawer(null)} />
    </div>
  );
}
