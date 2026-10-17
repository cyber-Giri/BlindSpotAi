import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { Maximize, Minus, Plus, RotateCcw, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RIPPLE_EDGES, RIPPLE_NODES } from "@/lib/mock-data";
import { useStore } from "@/lib/store";
import { ConfidenceBar, PageHeader, SeverityBadge } from "@/components/bs/badges";
import { cn } from "@/lib/utils";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/ripple")({
  head: () => seo("Ripple Effect Engine", "Trace how one missing assumption cascades through project dependencies."),
  component: Ripple,
});

const W = 170, H = 52;
const byId = Object.fromEntries(RIPPLE_NODES.map((n) => [n.id, n]));

function downstream(id: string) {
  const seen = new Set<string>([id]);
  const q = [id];
  while (q.length) {
    const c = q.shift()!;
    RIPPLE_EDGES.filter((e) => e.from === c).forEach((e) => { if (!seen.has(e.to)) { seen.add(e.to); q.push(e.to); } });
  }
  return seen;
}

function Ripple() {
  const findings = useStore((s) => s.findings);
  const [sel, setSel] = useState("api");
  const [trace, setTrace] = useState<Set<string> | null>(downstream("api"));
  const [view, setView] = useState({ x: 0, y: 0, k: 1 });
  const drag = useRef<{ x: number; y: number } | null>(null);
  const node = byId[sel]!;
  const up = RIPPLE_EDGES.filter((e) => e.to === sel);
  const down = RIPPLE_EDGES.filter((e) => e.from === sel);
  const related = useMemo(() => findings.filter((f) => f.nodeIds.includes(sel)), [findings, sel]);
  const fit = () => setView({ x: 0, y: 0, k: 1 });

  return (
    <div>
      <PageHeader title="Ripple Effect Engine" subtitle="Hidden risk: Payment API failure handling is undefined. Select a node to trace its downstream consequences." />
      <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
        <div className="surface relative overflow-hidden">
          <div className="absolute left-3 top-3 z-10 flex gap-1">
            <Button size="icon" variant="outline" className="size-8" onClick={() => setView((v) => ({ ...v, k: Math.min(2, v.k + 0.15) }))} aria-label="Zoom in"><Plus className="size-4" /></Button>
            <Button size="icon" variant="outline" className="size-8" onClick={() => setView((v) => ({ ...v, k: Math.max(0.5, v.k - 0.15) }))} aria-label="Zoom out"><Minus className="size-4" /></Button>
            <Button size="icon" variant="outline" className="size-8" onClick={fit} aria-label="Fit to screen"><Maximize className="size-4" /></Button>
            <Button size="sm" variant="outline" className="h-8" onClick={() => { fit(); setSel("api"); setTrace(null); }}><RotateCcw className="size-3.5" />Reset</Button>
          </div>
          <div className="absolute bottom-3 left-3 z-10 flex flex-wrap gap-3 rounded-md border bg-card/90 px-3 py-2 text-[11px] backdrop-blur">
            <span className="flex items-center gap-1.5"><svg width="24" height="6"><line x1="0" y1="3" x2="24" y2="3" stroke="var(--foreground)" strokeWidth="2" /></svg>Confirmed dependency</span>
            <span className="flex items-center gap-1.5"><svg width="24" height="6"><line x1="0" y1="3" x2="24" y2="3" stroke="var(--muted-foreground)" strokeWidth="2" strokeDasharray="4 3" /></svg>Hypothesized</span>
            <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-critical" />Impacted by trace</span>
            <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-primary" />Selected</span>
          </div>
          <svg
            viewBox="0 0 1120 420"
            className="h-[460px] w-full cursor-grab touch-none select-none active:cursor-grabbing"
            onPointerDown={(e) => { drag.current = { x: e.clientX, y: e.clientY }; }}
            onPointerMove={(e) => { if (!drag.current) return; const dx = e.clientX - drag.current.x, dy = e.clientY - drag.current.y; drag.current = { x: e.clientX, y: e.clientY }; setView((v) => ({ ...v, x: v.x + dx, y: v.y + dy })); }}
            onPointerUp={() => (drag.current = null)}
            onPointerLeave={() => (drag.current = null)}
            onWheel={(e) => setView((v) => ({ ...v, k: Math.min(2, Math.max(0.5, v.k - e.deltaY * 0.001)) }))}
          >
            <defs>
              <marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="var(--muted-foreground)" /></marker>
              <marker id="arrHot" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="var(--critical)" /></marker>
            </defs>
            <g transform={`translate(${view.x} ${view.y}) scale(${view.k})`}>
              {RIPPLE_EDGES.map((e) => {
                const a = byId[e.from]!, b = byId[e.to]!;
                const hot = trace?.has(e.from) && trace?.has(e.to);
                const x1 = a.x + W, y1 = a.y + H / 2, x2 = b.x, y2 = b.y + H / 2, mx = (x1 + x2) / 2;
                return (
                  <path key={e.from + e.to} d={`M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2 - 4},${y2}`} fill="none"
                    stroke={hot ? "var(--critical)" : e.kind === "confirmed" ? "var(--foreground)" : "var(--muted-foreground)"}
                    strokeOpacity={hot ? 1 : 0.45} strokeWidth={hot ? 2.5 : 1.5}
                    strokeDasharray={e.kind === "hypothesized" ? "6 5" : hot ? "8 4" : undefined}
                    className={hot ? "edge-flow" : undefined}
                    markerEnd={hot ? "url(#arrHot)" : "url(#arr)"} />
                );
              })}
              {RIPPLE_NODES.map((n) => {
                const hot = trace?.has(n.id);
                const s = n.id === sel;
                return (
                  <g key={n.id} transform={`translate(${n.x} ${n.y})`} className="cursor-pointer" onPointerDown={(e) => e.stopPropagation()} onClick={() => setSel(n.id)}>
                    <rect width={W} height={H} rx={10} fill={s ? "var(--primary)" : hot ? "color-mix(in oklab, var(--critical) 12%, var(--card))" : "var(--card)"} stroke={s ? "var(--primary)" : hot ? "var(--critical)" : "var(--border)"} strokeWidth={1.5} />
                    <text x={W / 2} y={22} textAnchor="middle" fontSize="13" fontWeight="600" fill={s ? "var(--primary-foreground)" : "var(--foreground)"}>{n.label}</text>
                    <text x={W / 2} y={39} textAnchor="middle" fontSize="11" fill={s ? "var(--primary-foreground)" : "var(--muted-foreground)"}>confidence {n.confidence}%</text>
                  </g>
                );
              })}
            </g>
          </svg>
        </div>

        <aside className="surface space-y-4 p-5">
          <div>
            <div className="text-xs text-muted-foreground">Selected node</div>
            <h2 className="text-lg font-semibold">{node.label}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{node.description}</p>
          </div>
          <Button className="w-full" onClick={() => setTrace(downstream(sel))}><Zap className="size-4" />Trace Impact</Button>
          {trace && <p className="text-xs text-muted-foreground">Trace affects {trace.size - 1} downstream node(s). Dashed links are hypotheses, not confirmed facts.</p>}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div><div className="mb-1 font-semibold uppercase tracking-wide text-muted-foreground">Upstream</div>{up.length ? up.map((e) => <button key={e.from} onClick={() => setSel(e.from)} className="block text-left hover:text-primary">← {byId[e.from]!.label}{e.kind === "hypothesized" && " (hyp.)"}</button>) : <span className="text-muted-foreground">Root</span>}</div>
            <div><div className="mb-1 font-semibold uppercase tracking-wide text-muted-foreground">Downstream</div>{down.length ? down.map((e) => <button key={e.to} onClick={() => setSel(e.to)} className="block text-left hover:text-primary">→ {byId[e.to]!.label}{e.kind === "hypothesized" && " (hyp.)"}</button>) : <span className="text-muted-foreground">End of chain</span>}</div>
          </div>
          <div><div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Potential impact</div><p className="text-sm">{node.impact}</p></div>
          <div className="rounded-md border bg-muted/50 p-3"><div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Evidence for connection</div><p className="text-xs">{node.evidence}</p></div>
          <div><div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Confidence</div><ConfidenceBar v={node.confidence} /></div>
          <div><div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Suggested mitigation</div><p className="text-sm">{node.mitigation}</p></div>
          {related.length > 0 && (
            <div><div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Linked findings</div>
              <ul className="space-y-1.5">{related.map((f) => <li key={f.id} className={cn("flex items-center justify-between gap-2 text-xs")}><span>{f.title}</span><SeverityBadge s={f.severity} /></li>)}</ul>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
