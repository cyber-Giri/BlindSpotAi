import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useStore } from "@/lib/store";
import { toast } from "sonner";
import { ConfidenceBar, DemoTag, EvidenceBadge, SeverityBadge, StatusBadge } from "./badges";
import { Copy, FileText, Sparkles } from "lucide-react";

export const OWNERS = ["Ravi Menon", "Anika Shah", "Lena Ortiz", "You"];

function Section({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="border-t py-4">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {n}. {title}
      </h3>
      <div className="text-sm leading-relaxed">{children}</div>
    </section>
  );
}

export function FindingDrawer({ id, onClose }: { id: string | null; onClose: () => void }) {
  const f = useStore((s) => s.findings.find((x) => x.id === id));
  const assumptions = useStore((s) => s.assumptions);
  const update = useStore((s) => s.updateFinding);
  const addComment = useStore((s) => s.addComment);
  const [comment, setComment] = useState("");

  return (
    <Sheet open={!!f} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        {f && (
          <>
            <SheetHeader className="text-left">
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="font-mono">{f.id}</span> · {f.category}
                {f.isDemo && <DemoTag />}
              </div>
              <SheetTitle className="text-lg">{f.title}</SheetTitle>
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <SeverityBadge s={f.severity} />
                <StatusBadge s={f.status} />
                <ConfidenceBar v={f.confidence} />
              </div>
            </SheetHeader>

            <div className="my-4 flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => { update(f.id, { status: "Investigating" }); toast.success("Marked as investigating"); }}>Investigating</Button>
              <Button size="sm" onClick={() => { update(f.id, { status: "Resolved" }); toast.success("Marked as resolved"); }}>Resolve</Button>
              <Button size="sm" variant="outline" onClick={() => { update(f.id, { status: "Accepted" }); toast("Risk accepted"); }}>Accept Risk</Button>
              <Select value={f.owner ?? ""} onValueChange={(v) => { update(f.id, { owner: v }); toast.success(`Assigned to ${v}`); }}>
                <SelectTrigger className="h-8 w-36 text-xs"><SelectValue placeholder="Assign owner" /></SelectTrigger>
                <SelectContent>{OWNERS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
              </Select>
              <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard?.writeText(`[DEMO] ${f.id} ${f.title} (${f.severity})\n${f.description}\nAction: ${f.recommendation}`); toast.success("Finding copied"); }}>
                <Copy className="size-3.5" /> Copy
              </Button>
            </div>

            <Section n={1} title="What was overlooked?">{f.overlooked}</Section>
            <Section n={2} title="Why does it matter?">{f.whyMatters}</Section>
            <Section n={3} title="Supporting evidence">
              <EvidenceBadge e={f.evidence} />
              <p className="mt-1 text-xs text-muted-foreground">Evidence excerpts are shown separately from AI interpretation.</p>
            </Section>
            <Section n={4} title="Source document & passage">
              {f.evidenceItems.length === 0 ? (
                <p className="text-muted-foreground">No source passage available. Treat as an inference to verify.</p>
              ) : (
                <div className="space-y-2">
                  {f.evidenceItems.map((e, i) => (
                    <div key={i} className="rounded-md border bg-muted/50 p-3">
                      <div className="mb-1 flex items-center gap-1.5 text-xs font-medium"><FileText className="size-3.5" />{e.source}</div>
                      <blockquote className="font-mono text-xs text-muted-foreground">{e.passage}</blockquote>
                    </div>
                  ))}
                  <p className="text-xs text-muted-foreground">Sample passages written for the demo — not extracted from uploaded files.</p>
                </div>
              )}
            </Section>
            <Section n={5} title="Assumption or dependency involved">
              {f.assumptionIds.length === 0 ? <span className="text-muted-foreground">None linked</span> : (
                <ul className="space-y-1">
                  {f.assumptionIds.map((aid) => {
                    const a = assumptions.find((x) => x.id === aid);
                    return a ? <li key={aid} className="flex items-center justify-between gap-2"><span>{a.text}</span><StatusBadge s={a.status} /></li> : null;
                  })}
                </ul>
              )}
            </Section>
            <Section n={6} title="Likelihood and impact">
              Likelihood <b>{f.likelihood}/5</b> · Impact <b>{f.impact}/10</b>
            </Section>
            <Section n={7} title="Potential consequences">
              {f.consequences.length ? <ul className="list-disc pl-5">{f.consequences.map((c) => <li key={c}>{c}</li>)}</ul> : <span className="text-muted-foreground">Not yet traced</span>}
            </Section>
            <Section n={8} title="Recommended corrective action">
              <div className="flex gap-2 rounded-md bg-primary-soft p-3"><Sparkles className="mt-0.5 size-4 shrink-0 text-primary" />{f.recommendation}</div>
            </Section>
            <Section n={9} title="Suggested verification test">{f.verificationTest}</Section>
            <Section n={10} title="Confidence and uncertainty">
              <ConfidenceBar v={f.confidence} className="mb-2" />
              {f.uncertainty}
            </Section>

            <section className="border-t py-4">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Comments ({f.comments.length})</h3>
              <div className="space-y-2">
                {f.comments.map((c) => (
                  <div key={c.id} className="rounded-md border p-2 text-sm"><b className="text-xs">{c.author}</b> <span className="text-xs text-muted-foreground">{new Date(c.at).toLocaleString()}</span><p>{c.text}</p></div>
                ))}
              </div>
              <form className="mt-2 flex flex-col gap-2" onSubmit={(e) => { e.preventDefault(); if (!comment.trim()) return; addComment(f.id, comment.trim()); setComment(""); toast.success("Comment added"); }}>
                <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Add a comment…" rows={2} />
                <Button size="sm" type="submit" className="self-end" disabled={!comment.trim()}>Add comment</Button>
              </form>
            </section>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
