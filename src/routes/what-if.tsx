import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Bar, BarChart, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { RotateCcw, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { simulateWhatIf } from "@/lib/services";
import { uid, useStore } from "@/lib/store";
import { PageHeader } from "@/components/bs/badges";
import { toast } from "sonner";
import { seo } from "@/lib/seo";
import type { WhatIfInputs } from "@/lib/types";

export const Route = createFileRoute("/what-if")({
  head: () => seo("What-If Simulator", "Explore how changes to budget, deadline and load could affect your project."),
  component: WhatIf,
});

const BASE: WhatIfInputs = { budgetCut: 0, deadlineCut: 0, userGrowth: 1, teamCut: 0, apiAvailability: 99.9, extraCost: 0 };
const CTRL: { k: keyof WhatIfInputs; label: string; min: number; max: number; step: number; unit: string }[] = [
  { k: "budgetCut", label: "Budget reduction", min: 0, max: 50, step: 1, unit: "%" },
  { k: "deadlineCut", label: "Deadline reduction", min: 0, max: 30, step: 1, unit: "days" },
  { k: "userGrowth", label: "User growth multiplier", min: 1, max: 10, step: 0.5, unit: "×" },
  { k: "teamCut", label: "Team capacity reduction", min: 0, max: 60, step: 5, unit: "%" },
  { k: "apiAvailability", label: "API availability", min: 90, max: 100, step: 0.1, unit: "%" },
  { k: "extraCost", label: "Unexpected dev cost", min: 0, max: 20000, step: 500, unit: "₹" },
];

function WhatIf() {
  const [inp, setInp] = useState<WhatIfInputs>(BASE);
  const scenarios = useStore((s) => s.scenarios);
  const save = useStore((s) => s.saveScenario);
  const clear = useStore((s) => s.clearScenarios);
  const res = useMemo(() => simulateWhatIf(inp), [inp]);
  const base = useMemo(() => simulateWhatIf(BASE), []);
  const chart = [
    { name: "Schedule pressure", Baseline: base.schedulePressure, Scenario: res.schedulePressure },
    { name: "Budget pressure", Baseline: base.budgetPressure, Scenario: res.budgetPressure },
  ];

  return (
    <div>
      <PageHeader title="What-If Simulator" subtitle="Illustrative estimates from demo assumptions — not a predictive model." actions={<>
        <Button variant="outline" size="sm" onClick={() => setInp(BASE)}><RotateCcw className="size-3.5" />Reset</Button>
        <Button size="sm" onClick={() => { save({ id: uid(), name: `Scenario ${scenarios.length + 1}`, inputs: inp, result: res, at: new Date().toISOString() }); toast.success("Scenario saved"); }}><Save className="size-3.5" />Save Scenario</Button>
      </>} />
      <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
        <div className="surface space-y-5 p-5">
          {CTRL.map((c) => (
            <div key={c.k}>
              <div className="mb-2 flex items-center justify-between gap-2">
                <label className="text-sm">{c.label}</label>
                <div className="flex items-center gap-1">
                  <Input type="number" className="h-7 w-20 text-right text-xs" value={inp[c.k]} min={c.min} max={c.max} step={c.step}
                    onChange={(e) => { const v = Math.min(c.max, Math.max(c.min, Number(e.target.value) || 0)); setInp((p) => ({ ...p, [c.k]: v })); }} />
                  <span className="w-8 text-xs text-muted-foreground">{c.unit}</span>
                </div>
              </div>
              <Slider value={[inp[c.k]]} min={c.min} max={c.max} step={c.step} onValueChange={([v]) => setInp((p) => ({ ...p, [c.k]: v }))} />
            </div>
          ))}
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {[["Schedule pressure", res.schedulePressure, base.schedulePressure], ["Budget pressure", res.budgetPressure, base.budgetPressure]].map(([l, v, b]) => (
              <div key={l as string} className="surface p-4">
                <div className="text-xs text-muted-foreground">{l} (est.)</div>
                <div className={`mt-1 text-3xl font-semibold tabular-nums ${(v as number) > 60 ? "text-critical" : (v as number) > 30 ? "text-high" : "text-success"}`}>{v}<span className="text-base text-muted-foreground">/100</span></div>
                <div className="text-xs text-muted-foreground">Baseline {b}</div>
              </div>
            ))}
          </div>
          <div className="surface p-5">
            <h2 className="text-sm font-semibold">Compare with baseline</h2>
            <div className="mt-3 h-56">
              <ResponsiveContainer>
                <BarChart data={chart}>
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} />
                  <Tooltip cursor={{ fill: "var(--muted)" }} contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="Baseline" fill="var(--muted-foreground)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Scenario" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {[["Affected milestones", res.affectedMilestones, "None affected"], ["Newly exposed risks", res.newRisks, "No new risks at these settings"], ["Mitigation actions", res.mitigations, ""]].map(([t, items, empty]) => (
              <div key={t as string} className="surface p-4">
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t as string}</h3>
                {(items as string[]).length ? <ul className="list-disc space-y-1 pl-4 text-sm">{(items as string[]).map((i) => <li key={i}>{i}</li>)}</ul> : <p className="text-sm text-muted-foreground">{empty as string}</p>}
              </div>
            ))}
          </div>
          <div className="surface p-4">
            <div className="mb-2 flex items-center justify-between"><h3 className="text-sm font-semibold">Scenario history</h3>{scenarios.length > 0 && <Button size="sm" variant="ghost" onClick={clear}><Trash2 className="size-3.5" />Clear</Button>}</div>
            {scenarios.length === 0 ? <p className="text-sm text-muted-foreground">No saved scenarios yet.</p> : (
              <ul className="divide-y text-sm">
                {scenarios.map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-3 py-2">
                    <span className="font-medium">{s.name}</span>
                    <span className="text-xs text-muted-foreground">Schedule {s.result.schedulePressure} · Budget {s.result.budgetPressure}</span>
                    <Button size="sm" variant="outline" onClick={() => setInp(s.inputs)}>Load</Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
