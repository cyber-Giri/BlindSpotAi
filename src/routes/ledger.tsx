import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { uid, useStore } from "@/lib/store";
import { ConfidenceBar, PageHeader, SeverityBadge, StatusBadge } from "@/components/bs/badges";
import { seo } from "@/lib/seo";
import { toast } from "sonner";
import type { AssumptionStatus } from "@/lib/types";

const STATUSES: AssumptionStatus[] = ["Unverified", "Partially Verified", "Verified", "Disproven", "Accepted Risk"];

export const Route = createFileRoute("/ledger")({
  validateSearch: (s: Record<string, unknown>): { status?: string | undefined } => ({
    status: typeof s["status"] === "string" ? (s["status"] as string) : undefined,
  }),
  head: () => seo("Assumption Ledger", "A living register of project assumptions and their verification status."),
  component: Ledger,
});

function Ledger() {
  const search = Route.useSearch();
  const assumptions = useStore((s) => s.assumptions);
  const setStatus = useStore((s) => s.setAssumptionStatus);
  const upsert = useStore((s) => s.upsertAssumption);
  const [q, setQ] = useState("");
  const [status, setStatusFilter] = useState(search.status ?? "all");
  const [text, setText] = useState("");
  const list = assumptions.filter((a) => (status === "all" || a.status === status) && a.text.toLowerCase().includes(q.toLowerCase()));

  return (
    <div>
      <PageHeader title="Assumption Ledger" subtitle="Confidence = how sure we are. Risk if false = how bad it would be. They are different." />
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {STATUSES.map((s) => (
          <button key={s} onClick={() => setStatusFilter(s)} className="surface p-3 text-left">
            <div className="text-xs text-muted-foreground">{s}</div>
            <div className="text-2xl font-semibold">{assumptions.filter((a) => a.status === s).length}</div>
          </button>
        ))}
      </div>
      <div className="surface mb-4 flex flex-wrap gap-2 p-3">
        <Input className="h-9 max-w-xs" placeholder="Search assumptions…" value={q} onChange={(e) => setQ(e.target.value)} />
        <Select value={status} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-9 w-44 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">All statuses</SelectItem>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
        </Select>
        <form className="ml-auto flex gap-2" onSubmit={(e) => { e.preventDefault(); if (text.trim().length < 5) return toast.error("Enter at least 5 characters"); upsert({ id: `A-${uid().slice(0, 4)}`, text: text.trim(), category: "General", evidence: [], confidence: 30, status: "Unverified", riskIfFalse: "Medium", owner: "You", updatedAt: "", findingIds: [], history: [{ status: "Unverified", at: new Date().toISOString().slice(0, 10) }] }); setText(""); toast.success("Assumption added"); }}>
          <Input className="h-9 w-64" placeholder="New assumption…" value={text} onChange={(e) => setText(e.target.value)} />
          <Button size="sm" type="submit"><Plus className="size-3.5" />Add</Button>
        </form>
      </div>
      <div className="surface overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b text-left text-xs text-muted-foreground"><tr>{["Assumption", "Category", "Evidence", "Confidence", "Status", "Risk if false", "Owner", "Updated"].map((h) => <th key={h} className="px-4 py-2.5 font-medium">{h}</th>)}</tr></thead>
          <tbody className="divide-y">
            {list.map((a) => (
              <tr key={a.id} className={a.status === "Unverified" && (a.riskIfFalse === "Critical" || a.riskIfFalse === "High") ? "bg-critical/5" : ""}>
                <td className="max-w-xs px-4 py-3"><div className="font-medium">{a.text}</div>{a.findingIds.length > 1 && <div className="text-xs text-high">Affects {a.findingIds.length} findings</div>}</td>
                <td className="px-4 py-3 text-xs">{a.category}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{a.evidence.join(", ") || "None"}</td>
                <td className="px-4 py-3"><ConfidenceBar v={a.confidence} /></td>
                <td className="px-4 py-3">
                  <Select value={a.status} onValueChange={(v) => { setStatus(a.id, v as AssumptionStatus); toast.success(`Status: ${v}`); }}>
                    <SelectTrigger className="h-8 w-40 border-0 p-0 shadow-none"><StatusBadge s={a.status} /></SelectTrigger>
                    <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </td>
                <td className="px-4 py-3"><SeverityBadge s={a.riskIfFalse} /></td>
                <td className="px-4 py-3 text-xs">{a.owner}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{a.updatedAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {list.length === 0 && <p className="p-8 text-center text-sm text-muted-foreground">No assumptions match.</p>}
      </div>
    </div>
  );
}
