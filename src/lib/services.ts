/**
 * Service layer. Every function here is a MOCK implementation.
 * Replace with real API calls (server functions) when an AI backend exists.
 */
import { CHALLENGE_BANK, GENERIC_CHALLENGES } from "./mock-data";
import type { ChallengeQuestion, Finding, Severity, WhatIfInputs, WhatIfResult } from "./types";

export const ANALYSIS_STAGES = [
  "Extracting Information",
  "Detecting Assumptions",
  "Checking Constraints",
  "Evaluating Risks",
  "Generating Recommendations",
];

export const ACCEPTED_TYPES = ["pdf", "docx", "txt", "csv", "xlsx"];
export const MAX_FILE_MB = 20;

export function validateFile(file: { name: string; size: number }): string | null {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!ACCEPTED_TYPES.includes(ext)) return `${file.name}: unsupported type .${ext}`;
  if (file.size > MAX_FILE_MB * 1024 * 1024) return `${file.name}: exceeds ${MAX_FILE_MB} MB`;
  return null;
}

/** Mock analysis: runs staged progress and returns no real parsing. */
export async function runMockAnalysis(onStage: (i: number) => void): Promise<{ mode: "demo" }> {
  for (let i = 0; i < ANALYSIS_STAGES.length; i++) {
    onStage(i);
    await new Promise((r) => setTimeout(r, 700));
  }
  return { mode: "demo" };
}

const SEV_RANK: Record<Severity, number> = { Critical: 4, High: 3, Medium: 2, Low: 1 };
export const severityRank = (s: Severity) => SEV_RANK[s];

/** Demo heuristic: readiness falls with open critical/high findings. Not a validated score. */
export function readinessScore(findings: Finding[]): number {
  const penalty = findings
    .filter((f) => f.status === "Open" || f.status === "Investigating")
    .reduce((s, f) => s + ({ Critical: 12, High: 6, Medium: 2.5, Low: 1 }[f.severity]), 0);
  return Math.max(0, Math.min(100, Math.round(100 - penalty)));
}

export function getChallenges(type: string, round: number): ChallengeQuestion[] {
  const sets = CHALLENGE_BANK[type] ?? GENERIC_CHALLENGES;
  return sets[round % sets.length] ?? [];
}

/** Illustrative deterministic model, based on demo assumptions only. */
export function simulateWhatIf(i: WhatIfInputs): WhatIfResult {
  const schedulePressure = Math.min(
    100,
    Math.round(i.deadlineCut * 1.6 + i.teamCut * 0.9 + (i.userGrowth - 1) * 4 + (100 - i.apiAvailability) * 1.5),
  );
  const budgetPressure = Math.min(
    100,
    Math.round(i.budgetCut * 1.3 + (i.extraCost / 1000) * 2 + (i.userGrowth - 1) * 5 + i.teamCut * 0.3),
  );
  const affectedMilestones: string[] = [];
  if (i.deadlineCut > 5 || i.teamCut > 20) affectedMilestones.push("Pilot launch (Nov 20)");
  if (i.deadlineCut > 12 || schedulePressure > 55) affectedMilestones.push("Load testing complete");
  if (i.budgetCut > 15 || budgetPressure > 50) affectedMilestones.push("Second canteen onboarding");
  if (i.apiAvailability < 98) affectedMilestones.push("Payment integration sign-off");
  const newRisks: string[] = [];
  if (i.userGrowth >= 3) newRisks.push("Peak-hour capacity likely exceeded (F-02)");
  if (i.apiAvailability < 99) newRisks.push("Payment failures more frequent (F-01)");
  if (i.teamCut >= 25) newRisks.push("Deployment single point of failure (F-16)");
  if (i.budgetCut >= 20) newRisks.push("Load testing may be cut from scope");
  if (i.extraCost > 5000) newRisks.push("Contingency reserve exhausted");
  const mitigations: string[] = [];
  if (schedulePressure > 40) mitigations.push("Defer non-critical features (favorites, ratings)");
  if (i.apiAvailability < 99) mitigations.push("Prioritize payment failure recovery (R-01)");
  if (i.userGrowth >= 3) mitigations.push("Introduce per-slot order caps (R-04)");
  if (budgetPressure > 40) mitigations.push("Negotiate payment fees; reuse university SMS gateway");
  if (mitigations.length === 0) mitigations.push("Current plan appears to have sufficient slack (demo estimate)");
  return { schedulePressure: Math.max(0, schedulePressure), budgetPressure: Math.max(0, budgetPressure), affectedMilestones, newRisks, mitigations };
}

export function toCSV(rows: Record<string, unknown>[]): string {
  if (!rows.length) return "";
  const keys = Object.keys(rows[0]!);
  const esc = (v: unknown) => `"${String(Array.isArray(v) ? v.join("; ") : (v ?? "")).replace(/"/g, '""')}"`;
  return [keys.join(","), ...rows.map((r) => keys.map((k) => esc(r[k])).join(","))].join("\n");
}

export function downloadCSV(name: string, rows: Record<string, unknown>[]) {
  const blob = new Blob(["# DEMO DATA — not actual project findings\n" + toCSV(rows)], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
