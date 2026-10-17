import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Download, LayoutGrid, List, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useStore } from "@/lib/store";
import { downloadCSV, severityRank } from "@/lib/services";
import { ConfidenceBar, EvidenceBadge, PageHeader, SeverityBadge, StatusBadge } from "@/components/bs/badges";
import { FindingDrawer } from "@/components/bs/finding-drawer";
import { seo } from "@/lib/seo";

type S = { severity?: string | undefined; status?: string | undefined; category?: string | undefined; confidence?: string | undefined; evidence?: string | undefined };

export const Route = createFileRoute("/findings")({
  validateSearch: (s: Record<string, unknown>): S => ({
    severity: typeof s["severity"] === "string" ? (s["severity"] as string) : undefined,
    status: typeof s["status"] === "string" ? (s["status"] as string) : undefined,
    category: typeof s["category"] === "string" ? (s["category"] as string) : undefined,
    confidence: typeof s["confidence"] === "string" ? (s["confidence"] as string) : undefined,
    evidence: typeof s["evidence"] === "string" ? (s["evidence"] as string) : undefined,
  }),
  head: () => seo("Findings", "Searchable, filterable list of detected project blind spots."),
  component: Findings,
});

const CATS = ["Missing Assumption", "Missing Constraint", "Dependency Risk", "Contradiction", "Unanswered Question", "Data Quality Issue", "Security Concern", "Workflow Bottleneck", "Scalability Risk", "Missing Requirement"];

function FilterSelect({ label, value, options, onChange }: { label: string; value?: string | undefined; options: string[]; onChange: (v?: string) => void }) {
  return (
    <Select value={value ?? "all"} onValueChange={(v) => onChange(v === "all" ? undefined : v)}>
      <SelectTrigger className="h-9 w-[150px] text-xs"><SelectValue placeholder={label} /></SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All {label.toLowerCase()}</SelectItem>
        {options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

function Findings() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/findings" });
  const findings = useStore((s) => s.findings);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("impact");
  const [view, setView] = useState<"table" | "cards">("table");
  const [drawer, setDrawer] = useState<string | null>(null);
  const set = (k: keyof S, v?: string) => navigate({ search: (p: S) => ({ ...p, [k]: v }) });

  const list = useMemo(() => {
    let l = findings.filter((f) =>
      (!search.severity || f.severity === search.severity) &&
      (!search.status || f.status === search.status) &&
      (!search.category || f.category === search.category) &&
      (!search.evidence || f.evidence === search.evidence) &&
      (!search.confidence || (search.confidence === "High (≥75)" ? f.confidence >= 75 : search.confidence === "Medium (50–74)" ? f.confidence >= 50 && f.confidence < 75 : f.confidence < 50)) &&
      (!q || `${f.title} ${f.description} ${f.id}`.toLowerCase().includes(q.toLowerCase())),
    );
    l = [...l].sort((a, b) =>
      sort === "impact" ? b.impact - a.impact : sort === "severity" ? severityRank(b.severity) - severityRank(a.severity) : sort === "confidence" ? a.confidence - b.confidence : b.detectedAt.localeCompare(a.detectedAt),
    );
    return l;
  }, [findings, search, q, sort]);

  const active = Object.values(search).some(Boolean) || q;

  return (
    <div>
      <PageHeader title="Findings" subtitle={`${list.length} of ${findings.length} blind spots`} actions={
        <Button variant="outline" size="sm" onClick={() => downloadCSV("findings-demo.csv", list.map(({ id, title, category, severity, status, likelihood, impact, confidence, evidence, recommendation, owner }) => ({ id, title, category, severity, status, likelihood, impact, confidence, evidence, recommendation, owner })))}>
          <Download className="size-3.5" /> Export CSV
        </Button>
      } />

      <div className="surface mb-4 flex flex-wrap items-center gap-2 p-3">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search findings…" className="h-9 pl-8" />
        </div>
        <FilterSelect label="Severity" value={search.severity} options={["Critical", "High", "Medium", "Low"]} onChange={(v) => set("severity", v)} />
        <FilterSelect label="Category" value={search.category} options={CATS} onChange={(v) => set("category", v)} />
        <FilterSelect label="Status" value={search.status} options={["Open", "Investigating", "Accepted", "Resolved"]} onChange={(v) => set("status", v)} />
        <FilterSelect label="Confidence" value={search.confidence} options={["High (≥75)", "Medium (50–74)", "Low (<50)"]} onChange={(v) => set("confidence", v)} />
        <FilterSelect label="Evidence" value={search.evidence} options={["Available", "Partial", "None"]} onChange={(v) => set("evidence", v)} />
        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger className="h-9 w-[160px] text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="impact">Highest impact</SelectItem>
            <SelectItem value="severity">Highest severity</SelectItem>
            <SelectItem value="confidence">Lowest confidence</SelectItem>
            <SelectItem value="recent">Recently detected</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex rounded-md border">
          <Button size="icon" variant={view === "table" ? "secondary" : "ghost"} className="h-8 w-8" onClick={() => setView("table")} aria-label="Table view"><List className="size-4" /></Button>
          <Button size="icon" variant={view === "cards" ? "secondary" : "ghost"} className="h-8 w-8" onClick={() => setView("cards")} aria-label="Card view"><LayoutGrid className="size-4" /></Button>
        </div>
        {active && <Button size="sm" variant="ghost" onClick={() => { setQ(""); navigate({ search: {} }); }}><X className="size-3.5" /> Clear</Button>}
      </div>

      {list.length === 0 ? (
        <div className="surface p-12 text-center text-sm text-muted-foreground">No findings match these filters.</div>
      ) : view === "table" ? (
        <div className="surface overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b text-left text-xs text-muted-foreground">
              <tr>{["ID", "Finding", "Category", "Severity", "L × I", "Confidence", "Evidence", "Status"].map((h) => <th key={h} className="px-4 py-2.5 font-medium">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y">
              {list.map((f) => (
                <tr key={f.id} onClick={() => setDrawer(f.id)} className="cursor-pointer hover:bg-muted/50">
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{f.id}</td>
                  <td className="max-w-xs px-4 py-3"><div className="font-medium">{f.title}</div><div className="truncate text-xs text-muted-foreground">{f.recommendation}</div></td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs">{f.category}</td>
                  <td className="px-4 py-3"><SeverityBadge s={f.severity} /></td>
                  <td className="px-4 py-3 text-xs tabular-nums">{f.likelihood} × {f.impact}</td>
                  <td className="px-4 py-3"><ConfidenceBar v={f.confidence} /></td>
                  <td className="whitespace-nowrap px-4 py-3"><EvidenceBadge e={f.evidence} /></td>
                  <td className="px-4 py-3"><StatusBadge s={f.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((f) => (
            <button key={f.id} onClick={() => setDrawer(f.id)} className="surface flex flex-col gap-3 p-4 text-left hover:border-primary/40">
              <div className="flex items-center justify-between"><SeverityBadge s={f.severity} /><StatusBadge s={f.status} /></div>
              <div><div className="font-medium">{f.title}</div><p className="mt-1 text-xs text-muted-foreground">{f.description}</p></div>
              <div className="mt-auto flex items-center justify-between text-xs"><span className="text-muted-foreground">{f.category}</span><ConfidenceBar v={f.confidence} /></div>
            </button>
          ))}
        </div>
      )}
      <FindingDrawer id={drawer} onClose={() => setDrawer(null)} />
    </div>
  );
}
