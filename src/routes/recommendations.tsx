import { createFileRoute } from "@tanstack/react-router";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useStore } from "@/lib/store";
import { PageHeader, StatusBadge } from "@/components/bs/badges";
import { OWNERS } from "@/components/bs/finding-drawer";
import { seo } from "@/lib/seo";
import { toast } from "sonner";
import type { RecommendationStatus } from "@/lib/types";

export const Route = createFileRoute("/recommendations")({
  head: () => seo("Recommendations", "A prioritized, evidence-based action plan built from findings."),
  component: Recs,
});

const ST: RecommendationStatus[] = ["Not Started", "Planned", "In Progress", "Completed"];

function Recs() {
  const recs = useStore((s) => s.recommendations);
  const findings = useStore((s) => s.findings);
  const update = useStore((s) => s.updateRecommendation);
  return (
    <div>
      <PageHeader title="Recommendations" subtitle="Benefits and effort are estimates, not measured results." />
      <div className="space-y-3">
        {[...recs].sort((a, b) => a.priority - b.priority).map((r) => {
          const f = findings.find((x) => x.id === r.findingId);
          return (
            <div key={r.id} className="surface p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-xs text-muted-foreground">#{r.priority} · Addresses {f?.id} {f?.title}</div>
                  <h3 className="font-medium">{r.action}</h3>
                </div>
                <div className="flex gap-2">
                  <Select value={r.status} onValueChange={(v) => { update(r.id, { status: v as RecommendationStatus }); toast.success(v); }}>
                    <SelectTrigger className="h-8 w-36"><StatusBadge s={r.status} /></SelectTrigger>
                    <SelectContent>{ST.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                  <Select value={r.owner ?? ""} onValueChange={(v) => update(r.id, { owner: v })}>
                    <SelectTrigger className="h-8 w-32 text-xs"><SelectValue placeholder="Owner" /></SelectTrigger>
                    <SelectContent>{OWNERS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                  </Select>
                  <input type="date" className="h-8 rounded-md border bg-background px-2 text-xs" value={r.dueDate ?? ""} onChange={(e) => update(r.id, { dueDate: e.target.value })} />
                </div>
              </div>
              <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2 lg:grid-cols-4">
                <p><b>Why:</b> {r.rationale}</p>
                <p><b>Evidence:</b> {r.evidence}</p>
                <p><b>Benefit:</b> {r.benefit} · <b>Effort:</b> {r.effort}</p>
                <p><b>Verify:</b> {r.verification}{r.dependencies.length > 0 && <> · <b>Depends on:</b> {r.dependencies.join(", ")}</>}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
