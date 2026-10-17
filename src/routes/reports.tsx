import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Download, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import { downloadCSV } from "@/lib/services";
import { DEMO_PROJECT } from "@/lib/mock-data";
import { PageHeader, SeverityBadge } from "@/components/bs/badges";
import { seo } from "@/lib/seo";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/reports")({
  head: () => seo("Reports", "Generate executive summaries, risk assessments and assumption audits."),
  component: Reports,
});

const TYPES = ["Executive Summary", "Detailed Risk Assessment", "Assumption Audit", "Technical Review", "Dataset Quality Report", "Recommended Action Plan"];

function Reports() {
  const [type, setType] = useState(TYPES[0]!);
  const findings = useStore((s) => s.findings);
  const assumptions = useStore((s) => s.assumptions);
  const recs = useStore((s) => s.recommendations);
  const open = findings.filter((f) => f.status !== "Resolved");
  return (
    <div>
      <div className="no-print">
        <PageHeader title="Reports" actions={<>
          <Button size="sm" variant="outline" onClick={() => downloadCSV("findings-demo.csv", findings.map(({ id, title, severity, status, category }) => ({ id, title, severity, status, category })))}><Download className="size-3.5" />Findings CSV</Button>
          <Button size="sm" variant="outline" onClick={() => downloadCSV("assumptions-demo.csv", assumptions.map(({ id, text, status, confidence, riskIfFalse, owner }) => ({ id, text, status, confidence, riskIfFalse, owner })))}><Download className="size-3.5" />Assumptions CSV</Button>
          <Button size="sm" onClick={() => window.print()}><Printer className="size-3.5" />Print / PDF</Button>
        </>} />
        <div className="mb-4 flex flex-wrap gap-1.5">
          {TYPES.map((t) => <button key={t} onClick={() => setType(t)} className={cn("rounded-full border px-3 py-1 text-xs", type === t && "border-primary bg-primary text-primary-foreground")}>{t}</button>)}
        </div>
      </div>
      <article className="surface space-y-5 p-8 text-sm">
        <p className="rounded-md border border-dashed p-2 text-center text-xs font-medium text-primary">DEMONSTRATION DATA — not actual project findings</p>
        <header><h2 className="text-xl font-semibold">{type}</h2><p className="text-muted-foreground">{DEMO_PROJECT.name} · {new Date().toLocaleDateString()}</p></header>
        <section><h3 className="font-semibold">Project overview</h3><p>{DEMO_PROJECT.description}</p></section>
        <section><h3 className="font-semibold">Key findings ({open.length} open)</h3>
          <ul className="mt-2 space-y-1">{open.slice(0, 8).map((f) => <li key={f.id} className="flex justify-between gap-2"><span>{f.id} — {f.title}</span><SeverityBadge s={f.severity} /></li>)}</ul></section>
        <section><h3 className="font-semibold">Unverified assumptions</h3>
          <ul className="mt-2 list-disc pl-5">{assumptions.filter((a) => a.status === "Unverified").map((a) => <li key={a.id}>{a.text}</li>)}</ul></section>
        <section><h3 className="font-semibold">Ripple-effect scenario</h3><p>Payment API failure → payment processing → order confirmation → kitchen → customer satisfaction & revenue reporting (partly hypothesized).</p></section>
        <section><h3 className="font-semibold">Recommendations</h3>
          <ol className="mt-2 list-decimal pl-5">{recs.map((r) => <li key={r.id}>{r.action} <span className="text-muted-foreground">({r.status})</span></li>)}</ol></section>
      </article>
    </div>
  );
}
