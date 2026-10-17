import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  SEED_ACTIVITY,
  SEED_ASSUMPTIONS,
  SEED_FINDINGS,
  SEED_RECOMMENDATIONS,
} from "./mock-data";
import type {
  ActivityEvent,
  Assumption,
  Finding,
  Recommendation,
  SavedScenario,
} from "./types";

interface State {
  findings: Finding[];
  assumptions: Assumption[];
  recommendations: Recommendation[];
  activity: ActivityEvent[];
  scenarios: SavedScenario[];
  theme: "light" | "dark";
  lastAnalysisAt?: string | undefined;
  updateFinding: (id: string, patch: Partial<Finding>) => void;
  setFindings: (findings: Finding[]) => void;
  setAssumptions: (assumptions: Assumption[]) => void;
  addComment: (id: string, text: string) => void;
  addFinding: (f: Finding) => void;
  upsertAssumption: (a: Assumption) => void;
  setAssumptionStatus: (id: string, status: Assumption["status"]) => void;
  deleteAssumption: (id: string) => void;
  updateRecommendation: (id: string, patch: Partial<Recommendation>) => void;
  log: (type: ActivityEvent["type"], text: string) => void;
  saveScenario: (s: SavedScenario) => void;
  clearScenarios: () => void;
  setTheme: (t: "light" | "dark") => void;
  markAnalysis: () => void;
  resetDemo: () => void;
}

const now = () => new Date().toISOString();
const uid = () => Math.random().toString(36).slice(2, 9);

const seed = () => ({
  findings: structuredClone(SEED_FINDINGS),
  assumptions: structuredClone(SEED_ASSUMPTIONS),
  recommendations: structuredClone(SEED_RECOMMENDATIONS),
  activity: structuredClone(SEED_ACTIVITY),
  scenarios: [] as SavedScenario[],
  lastAnalysisAt: undefined,
});

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      ...seed(),
      theme: "light",
      log: (type, text) =>
        set((s) => ({ activity: [{ id: uid(), type, text, at: now() }, ...s.activity].slice(0, 40) })),
      updateFinding: (id, patch) => {
        set((s) => ({ findings: s.findings.map((f) => (f.id === id ? { ...f, ...patch } : f)) }));
        const f = get().findings.find((x) => x.id === id);
        if (patch.status && f) get().log(patch.status === "Resolved" ? "completed" : "update", `${f.title} → ${patch.status}`);
        if (patch.owner && f) get().log("update", `${patch.owner} assigned to ${f.title}`);
      },
      setFindings: (findings) => set({ findings }),
      setAssumptions: (assumptions) => set({ assumptions }),
      addComment: (id, text) =>
        set((s) => ({
          findings: s.findings.map((f) =>
            f.id === id ? { ...f, comments: [...f.comments, { id: uid(), author: "You", text, at: now() }] } : f,
          ),
        })),
      addFinding: (f) => {
        set((s) => ({ findings: [f, ...s.findings] }));
        get().log("risk", `New finding added: ${f.title}`);
      },
      upsertAssumption: (a) =>
        set((s) => ({
          assumptions: s.assumptions.some((x) => x.id === a.id)
            ? s.assumptions.map((x) => (x.id === a.id ? { ...a, updatedAt: now().slice(0, 10) } : x))
            : [{ ...a, updatedAt: now().slice(0, 10) }, ...s.assumptions],
        })),
      setAssumptionStatus: (id, status) => {
        set((s) => ({
          assumptions: s.assumptions.map((a) =>
            a.id === id
              ? { ...a, status, updatedAt: now().slice(0, 10), history: [...a.history, { status, at: now().slice(0, 10) }] }
              : a,
          ),
        }));
        const a = get().assumptions.find((x) => x.id === id);
        if (a) get().log(status === "Verified" ? "verified" : "update", `Assumption ${status.toLowerCase()}: ${a.text}`);
      },
      deleteAssumption: (id) => set((s) => ({ assumptions: s.assumptions.filter((a) => a.id !== id) })),
      updateRecommendation: (id, patch) => {
        set((s) => ({ recommendations: s.recommendations.map((r) => (r.id === id ? { ...r, ...patch } : r)) }));
        const r = get().recommendations.find((x) => x.id === id);
        if (patch.status === "Completed" && r) get().log("completed", `Recommendation completed: ${r.action}`);
      },
      saveScenario: (sc) => set((s) => ({ scenarios: [sc, ...s.scenarios].slice(0, 10) })),
      clearScenarios: () => set({ scenarios: [] }),
      setTheme: (theme) => set({ theme }),
      markAnalysis: () => {
        set({ lastAnalysisAt: now() });
        get().log("analysis", "Demo analysis run on Campus Food Ordering System");
      },
      resetDemo: () => set({ ...seed() }),
    }),
    {
      name: "blindspot-demo",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
    },
  ),
);

export function useMetrics() {
  const findings = useStore((s) => s.findings);
  const assumptions = useStore((s) => s.assumptions);
  return {
    total: findings.length,
    critical: findings.filter((f) => f.severity === "Critical" && f.status !== "Resolved").length,
    unverified: assumptions.filter((a) => a.status === "Unverified").length,
    resolved: findings.filter((f) => f.status === "Resolved").length,
  };
}

export { uid };
