import { cn } from "@/lib/utils";
import type { AssumptionStatus, EvidenceAvailability, FindingStatus, Severity } from "@/lib/types";
import { FlaskConical } from "lucide-react";
import type { ReactNode } from "react";

const sevCls: Record<Severity, string> = {
  Critical: "bg-critical/10 text-critical border-critical/25",
  High: "bg-high/10 text-high border-high/25",
  Medium: "bg-medium/15 text-foreground border-medium/40",
  Low: "bg-low/10 text-low border-low/25",
};

export function SeverityBadge({ s }: { s: Severity }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium", sevCls[s])}>
      <span className={cn("size-1.5 rounded-full", { Critical: "bg-critical", High: "bg-high", Medium: "bg-medium", Low: "bg-low" }[s])} />
      {s}
    </span>
  );
}

const statusCls: Record<string, string> = {
  Open: "bg-muted text-foreground",
  Investigating: "bg-primary-soft text-primary",
  Accepted: "bg-medium/15 text-foreground",
  Resolved: "bg-success/12 text-success",
  Unverified: "bg-critical/10 text-critical",
  "Partially Verified": "bg-medium/15 text-foreground",
  Verified: "bg-success/12 text-success",
  Disproven: "bg-muted text-muted-foreground line-through",
  "Accepted Risk": "bg-high/10 text-high",
  "Not Started": "bg-muted text-muted-foreground",
  Planned: "bg-primary-soft text-primary",
  "In Progress": "bg-medium/15 text-foreground",
  Completed: "bg-success/12 text-success",
};

export function StatusBadge({ s }: { s: FindingStatus | AssumptionStatus | string }) {
  return <span className={cn("inline-flex rounded-md px-2 py-0.5 text-xs font-medium", statusCls[s])}>{s}</span>;
}

export function EvidenceBadge({ e }: { e: EvidenceAvailability }) {
  const c = { Available: "text-success", Partial: "text-high", None: "text-muted-foreground" }[e];
  return <span className={cn("text-xs font-medium", c)}>{e === "None" ? "No evidence" : `Evidence: ${e}`}</span>;
}

export function ConfidenceBar({ v, className }: { v: number; className?: string }) {
  return (
    <div className={cn("flex items-center gap-2", className)} title={`Confidence ${v}% — how sure the analysis is, not how severe the risk is`}>
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary" style={{ width: `${v}%` }} />
      </div>
      <span className="text-xs tabular-nums text-muted-foreground">{v}%</span>
    </div>
  );
}

export function DemoTag({ children = "Demo data" }: { children?: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-dashed border-primary/40 bg-primary-soft px-2 py-0.5 text-[11px] font-medium text-primary">
      <FlaskConical className="size-3" />
      {children}
    </span>
  );
}

export function PageHeader({ title, subtitle, actions, demo = true }: { title: string; subtitle?: string; actions?: ReactNode; demo?: boolean }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {demo && <DemoTag />}
        </div>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
