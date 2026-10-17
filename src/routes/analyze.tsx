import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Database, FileText, Loader2, Trash2, UploadCloud, Workflow, Info, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ANALYSIS_STAGES, ACCEPTED_TYPES, MAX_FILE_MB, runMockAnalysis, validateFile } from "@/lib/services";
import { useStore } from "@/lib/store";
import { PageHeader } from "@/components/bs/badges";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { seo } from "@/lib/seo";
import {
  checkBackendHealth,
  getApiBase,
  analyzeDocumentsBackend,
  analyzeDatasetBackend,
  analyzeWorkflowBackend
} from "@/lib/api-client";

export const Route = createFileRoute("/analyze")({
  head: () => seo("Analyze Project", "Upload documents, datasets or workflows and run a blind spot analysis."),
  component: Analyze,
});

const AREAS = ["Technical", "Business", "Budget", "Security", "Data Quality", "Operations", "User Experience"];

function Seg<T extends string>({ value, options, onChange }: { value: T; options: T[]; onChange: (v: T) => void }) {
  return (
    <div className="inline-flex rounded-md border p-0.5">
      {options.map((o) => (
        <button key={o} type="button" onClick={() => onChange(o)} className={cn("rounded px-3 py-1 text-xs font-medium", value === o ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>{o}</button>
      ))}
    </div>
  );
}

function Analyze() {
  const navigate = useNavigate();
  const markAnalysis = useStore((s) => s.markAnalysis);
  const setFindings = useStore((s) => s.setFindings);
  const setAssumptions = useStore((s) => s.setAssumptions);
  const [backendStatus, setBackendStatus] = useState<{ connected: boolean; aiConfigured: boolean } | null>(null);
  const [mode, setMode] = useState("documents");
  const [files, setFiles] = useState<File[]>([]);
  const [drag, setDrag] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [workflow, setWorkflow] = useState("");
  const [depth, setDepth] = useState<"Quick" | "Standard" | "Comprehensive">("Standard");
  const [sens, setSens] = useState<"Conservative" | "Balanced" | "Aggressive">("Balanced");
  const [areas, setAreas] = useState<string[]>(["Technical", "Business", "Security"]);
  const [useDemo, setUseDemo] = useState(false);
  const [stage, setStage] = useState(-1);
  const [done, setDone] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    const verify = () => {
      checkBackendHealth().then((health) => {
        if (!active) return;
        if (health && health.status === "healthy") {
          setBackendStatus({ connected: true, aiConfigured: Boolean(health.ai_configured) });
        } else {
          setBackendStatus({ connected: false, aiConfigured: false });
        }
      });
    };

    verify();
    const interval = setInterval(verify, 3000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    const errs: string[] = [];
    const ok: File[] = [];
    Array.from(list).forEach((f) => { const e = validateFile(f); e ? errs.push(e) : ok.push(f); });
    setErrors(errs);
    setFiles((p) => [...p, ...ok]);
    if (ok.length) toast.success(`${ok.length} file(s) added`);
  };

  const run = async () => {
    const hasInput = mode === "workflows" ? workflow.trim().length > 20 : files.length > 0;
    if (!hasInput && !useDemo) {
      toast.error(mode === "workflows" ? "Describe the workflow (at least 20 characters) or enable demo mode." : "Add at least one file or enable demo mode.");
      return;
    }
    if (areas.length === 0) {
      toast.error("Select at least one area of concern.");
      return;
    }

    setDone(false);

    // If demo mode is explicitly enabled or backend is not connected, use mock analysis
    if (useDemo || !backendStatus?.connected) {
      await runMockAnalysis(setStage);
      setStage(ANALYSIS_STAGES.length);
      setDone(true);
      markAnalysis();
      toast.success("Demo analysis complete — showing sample findings");
      setTimeout(() => navigate({ to: "/findings" }), 1200);
      return;
    }

    // REAL BACKEND PIPELINE
    try {
      setStage(0);
      if (mode === "documents") {
        setStage(1);
        const result = await analyzeDocumentsBackend(files, {
          depth,
          focusAreas: areas,
          riskSensitivity: sens,
        });
        setStage(3);
        if (result.findings?.length) {
          setFindings(result.findings);
        }
        if (result.assumptions?.length) {
          setAssumptions(result.assumptions);
        }
        setStage(ANALYSIS_STAGES.length);
        setDone(true);
        markAnalysis();
        toast.success(`Analysis complete: ${result.findings?.length || 0} blind spot(s) found!`);
        setTimeout(() => navigate({ to: "/findings" }), 1200);
      } else if (mode === "datasets") {
        setStage(1);
        const result = await analyzeDatasetBackend(files[0]!, {});
        setStage(3);
        if (result.findings?.length) {
          setFindings(result.findings);
        }
        setStage(ANALYSIS_STAGES.length);
        setDone(true);
        markAnalysis();
        toast.success(`Dataset profiling complete: ${result.findings?.length || 0} issue(s) detected!`);
        setTimeout(() => navigate({ to: "/findings" }), 1200);
      } else if (mode === "workflows") {
        setStage(1);
        const result = await analyzeWorkflowBackend(workflow);
        setStage(3);
        if (result.findings?.length) {
          setFindings(result.findings);
        }
        setStage(ANALYSIS_STAGES.length);
        setDone(true);
        markAnalysis();
        toast.success(`Workflow analysis complete: ${result.findings?.length || 0} risk(s) identified!`);
        setTimeout(() => navigate({ to: "/findings" }), 1200);
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Analysis failed";
      toast.error(errorMsg);
      setStage(-1);
    }
  };

  const running = stage >= 0 && !done;

  return (
    <div>
      <PageHeader title="Analyze Project" subtitle="Provide project material and configure what to look for." />
      {backendStatus?.connected ? (
        <div className="mb-4 flex items-center justify-between gap-2 rounded-md border border-success/40 bg-success/10 p-3 text-xs text-foreground">
          <div className="flex items-center gap-2">
            <CheckCircle className="size-4 shrink-0 text-success" />
            <span>
              <strong>FastAPI Backend Connected</strong> ({getApiBase()}).{" "}
              {backendStatus.aiConfigured
                ? "Google Gemini AI provider is active."
                : "Deterministic engines active (configure GOOGLE_API_KEY in backend/.env for live LLM parsing)."}
            </span>
          </div>
          <span className="rounded bg-success/20 px-2 py-0.5 text-[10px] font-semibold uppercase text-success">Live API</span>
        </div>
      ) : (
        <div className="mb-4 flex items-center justify-between gap-2 rounded-md border border-dashed border-primary/40 bg-primary-soft p-3 text-xs text-foreground">
          <div className="flex items-center gap-2">
            <Info className="size-4 shrink-0 text-primary" />
            <span>
              Backend not detected on port 8000. Start it with <code>uvicorn app.main:app --reload</code> or double-click <code>backend/run.bat</code>.
            </span>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            onClick={async () => {
              const h = await checkBackendHealth();
              if (h && h.status === "healthy") {
                setBackendStatus({ connected: true, aiConfigured: Boolean(h.ai_configured) });
                toast.success("Connected to FastAPI Backend!");
              } else {
                toast.error("Could not reach backend on http://127.0.0.1:8000");
              }
            }}
          >
            Check Connection
          </Button>
        </div>
      )}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="surface p-5 lg:col-span-2">
          <Tabs value={mode} onValueChange={setMode}>
            <TabsList>
              <TabsTrigger value="documents"><FileText className="mr-1.5 size-3.5" />Documents</TabsTrigger>
              <TabsTrigger value="datasets"><Database className="mr-1.5 size-3.5" />Datasets</TabsTrigger>
              <TabsTrigger value="workflows"><Workflow className="mr-1.5 size-3.5" />Workflows</TabsTrigger>
            </TabsList>
            {(["documents", "datasets"] as const).map((m) => (
              <TabsContent key={m} value={m} className="space-y-4">
                <div
                  onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
                  onDragLeave={() => setDrag(false)}
                  onDrop={(e) => { e.preventDefault(); setDrag(false); addFiles(e.dataTransfer.files); }}
                  onClick={() => inputRef.current?.click()}
                  className={cn("flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed p-10 text-center transition-colors", drag ? "border-primary bg-primary-soft" : "hover:border-primary/40")}>
                  <UploadCloud className="size-8 text-primary" />
                  <div className="text-sm font-medium">Drop files here or click to browse</div>
                  <div className="text-xs text-muted-foreground">{m === "datasets" ? "CSV, XLSX" : ACCEPTED_TYPES.map((t) => t.toUpperCase()).join(", ")} · up to {MAX_FILE_MB} MB each</div>
                  <input ref={inputRef} type="file" multiple hidden accept={ACCEPTED_TYPES.map((t) => "." + t).join(",")} onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
                </div>
                {errors.map((e) => <p key={e} className="text-xs text-destructive">{e}</p>)}
                {files.length > 0 && (
                  <ul className="divide-y rounded-md border">
                    {files.map((f, i) => (
                      <li key={i} className="flex items-center gap-3 px-3 py-2 text-sm">
                        <FileText className="size-4 text-muted-foreground" />
                        <span className="flex-1 truncate">{f.name}</span>
                        <span className="text-xs uppercase text-muted-foreground">{f.name.split(".").pop()}</span>
                        <span className="w-16 text-right text-xs tabular-nums text-muted-foreground">{(f.size / 1024).toFixed(0)} KB</span>
                        <span className="text-xs text-success">Ready</span>
                        <button onClick={() => setFiles((p) => p.filter((_, j) => j !== i))} aria-label="Remove"><Trash2 className="size-4 text-muted-foreground hover:text-destructive" /></button>
                      </li>
                    ))}
                  </ul>
                )}
                {m === "datasets" && (
                  <div className="space-y-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div><Label className="text-xs">Dataset purpose</Label><Input placeholder="e.g. Menu pricing across canteens" /></div>
                      <div><Label className="text-xs">Important columns</Label><Input placeholder="item_id, price, canteen" /></div>
                      <div><Label className="text-xs">Expected data types</Label><Input placeholder="string, decimal, string" /></div>
                      <div><Label className="text-xs">Missing-value tolerance (%)</Label><Input type="number" defaultValue={5} min={0} max={100} /></div>
                    </div>
                    <label className="flex items-center gap-2 text-sm"><Checkbox defaultChecked /> Check for potential data leakage</label>
                    <div>
                      <div className="mb-2 text-xs font-medium text-muted-foreground">Sample preview (demo menu.csv)</div>
                      <div className="overflow-x-auto rounded-md border">
                        <table className="w-full text-xs">
                          <thead className="bg-muted/60 text-left"><tr>{["Column", "Type", "Missing", "Duplicates", "Outliers"].map((h) => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}</tr></thead>
                          <tbody className="divide-y">
                            {[["item_id", "string", "0%", "14", "—"], ["price", "decimal", "2.1%", "—", "3"], ["canteen", "string", "0%", "—", "—"], ["allergens", "string", "38%", "—", "—"]].map((r) => (
                              <tr key={r[0]}>{r.map((c, i) => <td key={i} className={cn("px-3 py-2", (c === "38%" || c === "14") && "font-medium text-critical")}>{c}</td>)}</tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </TabsContent>
            ))}
            <TabsContent value="workflows" className="space-y-3">
              <Label className="text-xs">Describe steps, owners, dependencies, approvals, external services, time and budget constraints</Label>
              <Textarea rows={10} value={workflow} onChange={(e) => setWorkflow(e.target.value)} placeholder={"1. Student places order (owner: app)\n2. Payment via external gateway — depends on provider API\n3. Kitchen receives order (owner: canteen staff)\n4. Notification sent via push service\nBudget: ₹4L · Launch: Nov 20"} className="font-mono text-xs" />
              <p className="text-xs text-muted-foreground">{workflow.length} characters</p>
            </TabsContent>
          </Tabs>
        </div>

        <div className="surface space-y-5 p-5">
          <div><div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Analysis depth</div><Seg value={depth} options={["Quick", "Standard", "Comprehensive"]} onChange={setDepth} /></div>
          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Areas of concern</div>
            <div className="flex flex-wrap gap-1.5">
              {AREAS.map((a) => (
                <button key={a} onClick={() => setAreas((p) => (p.includes(a) ? p.filter((x) => x !== a) : [...p, a]))} className={cn("rounded-full border px-2.5 py-1 text-xs", areas.includes(a) ? "border-primary bg-primary-soft text-primary" : "text-muted-foreground")}>{a}</button>
              ))}
            </div>
          </div>
          <div><div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Risk sensitivity</div><Seg value={sens} options={["Conservative", "Balanced", "Aggressive"]} onChange={setSens} /></div>
          <label className="flex items-center justify-between gap-2 text-sm">Use demo project data<Switch checked={useDemo} onCheckedChange={setUseDemo} /></label>
          <Button className="w-full" size="lg" onClick={run} disabled={running}>
            {running ? <Loader2 className="size-4 animate-spin" /> : null}Run Blind Spot Analysis
          </Button>
          {stage >= 0 && (
            <ol className="space-y-2">
              {ANALYSIS_STAGES.map((s, i) => (
                <li key={s} className={cn("flex items-center gap-2 text-sm", i > stage && "text-muted-foreground")}>
                  {i < stage || done ? <CheckCircle2 className="size-4 text-success" /> : i === stage ? <Loader2 className="size-4 animate-spin text-primary" /> : <span className="size-4 rounded-full border" />}
                  {s}
                </li>
              ))}
              {done && <li className="rounded-md bg-success/10 p-2 text-xs text-success">Complete — opening demo findings…</li>}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}
