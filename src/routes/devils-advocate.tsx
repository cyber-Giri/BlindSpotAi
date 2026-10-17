import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, RefreshCw, Swords } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SCENARIO_TYPES } from "@/lib/mock-data";
import { getChallenges } from "@/lib/services";
import { uid, useStore } from "@/lib/store";
import { EvidenceBadge, PageHeader, SeverityBadge } from "@/components/bs/badges";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { seo } from "@/lib/seo";
import type { ChallengeQuestion } from "@/lib/types";

export const Route = createFileRoute("/devils-advocate")({
  head: () => seo("Devil's Advocate", "Challenge your project plan with stress scenarios and hard questions."),
  component: Devil,
});

function Devil() {
  const [type, setType] = useState<string>("Sudden user growth");
  const [custom, setCustom] = useState("");
  const [round, setRound] = useState(0);
  const [converted, setConverted] = useState<Set<string>>(new Set());
  const findings = useStore((s) => s.findings);
  const addFinding = useStore((s) => s.addFinding);
  const upsertAssumption = useStore((s) => s.upsertAssumption);
  const qs = getChallenges(type, round);
  const label = type === "Custom scenario" ? custom || "Describe a scenario above" : type === "Sudden user growth" ? "User traffic increases by 5×" : type;

  const convert = (q: ChallengeQuestion) => {
    const fid = `F-${String(findings.length + 1).padStart(2, "0")}-${uid().slice(0, 3)}`;
    const aid = `A-${uid().slice(0, 4)}`;
    addFinding({
      id: fid, title: q.question, description: q.why, category: "Unanswered Question", severity: q.impact, status: "Open",
      likelihood: 3, impact: q.impact === "Critical" ? 9 : q.impact === "High" ? 7 : 5, confidence: 50, evidence: q.evidence,
      recommendation: q.validation, detectedAt: new Date().toISOString().slice(0, 10), overlooked: q.question, whyMatters: q.why,
      evidenceItems: [], assumptionIds: [aid], consequences: [], verificationTest: q.validation,
      uncertainty: "Generated from a Devil's Advocate demo scenario; not derived from documents.", nodeIds: [], comments: [], isDemo: true,
    });
    upsertAssumption({ id: aid, text: `Answer known: ${q.question}`, category: "Scenario", evidence: [], confidence: 30, status: "Unverified", riskIfFalse: q.impact, owner: "You", updatedAt: "", findingIds: [fid], history: [{ status: "Unverified", at: new Date().toISOString().slice(0, 10) }] });
    setConverted((s) => new Set(s).add(q.question));
    toast.success("Added to Findings and Assumption Ledger");
  };

  return (
    <div>
      <PageHeader title="Challenge Your Assumptions" subtitle="Discover what could go wrong before it does." />
      <div className="surface mb-4 p-4">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Scenario type</div>
        <div className="flex flex-wrap gap-1.5">
          {SCENARIO_TYPES.map((s) => (
            <button key={s} onClick={() => { setType(s); setRound(0); }} className={cn("rounded-full border px-3 py-1 text-xs", type === s ? "border-primary bg-primary text-primary-foreground" : "hover:border-primary/40")}>{s}</button>
          ))}
        </div>
        {type === "Custom scenario" && <Input className="mt-3" value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="e.g. The main canteen closes for renovation in week 2" />}
      </div>

      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold"><Swords className="size-4 text-primary" />Scenario: {label}</h2>
        <Button variant="outline" size="sm" onClick={() => { setRound((r) => r + 1); toast("New demo challenge set generated"); }}><RefreshCw className="size-3.5" />Challenge Again</Button>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {qs.map((q) => {
          const rel = findings.find((f) => f.id === q.findingId);
          return (
            <div key={q.question} className="surface flex flex-col gap-3 p-4">
              <div className="flex items-start justify-between gap-3"><h3 className="font-medium">{q.question}</h3><SeverityBadge s={q.impact} /></div>
              <p className="text-sm text-muted-foreground"><b className="text-foreground">Why it matters:</b> {q.why}</p>
              <div className="flex flex-wrap items-center gap-3 text-xs">
                <EvidenceBadge e={q.evidence} />
                {rel && <span className="text-muted-foreground">Related: <span className="font-mono">{rel.id}</span> {rel.title}</span>}
              </div>
              <div className="rounded-md bg-muted/60 p-2.5 text-xs"><b>Validate by:</b> {q.validation}</div>
              <Button size="sm" variant={converted.has(q.question) ? "secondary" : "outline"} className="self-start" disabled={converted.has(q.question)} onClick={() => convert(q)}>
                <Plus className="size-3.5" />{converted.has(q.question) ? "Added" : "Convert to finding + ledger"}
              </Button>
            </div>
          );
        })}
      </div>
      <p className="mt-4 text-xs text-muted-foreground">Questions come from a fixed demo question bank, not a live language model.</p>
    </div>
  );
}
