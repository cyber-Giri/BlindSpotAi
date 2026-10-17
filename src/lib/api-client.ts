/**
 * BlindSpot AI Backend API Client
 * Seamlessly interfaces with the FastAPI backend.
 */

import type {
  Finding,
  Assumption,
  Recommendation,
  RippleNode,
  RippleEdge,
  WhatIfInputs,
  WhatIfResult,
  ChallengeQuestion
} from "./types";

// Fallback candidate URLs for local dev environments
const CANDIDATE_URLS = [
  import.meta.env.VITE_API_BASE_URL,
  "http://localhost:8000/api",
  "http://127.0.0.1:8000/api"
].filter(Boolean) as string[];

let activeApiBase = CANDIDATE_URLS[0] || "http://127.0.0.1:8000/api";

export function getApiBase() {
  return activeApiBase;
}

export async function checkBackendHealth() {
  for (const url of CANDIDATE_URLS) {
    try {
      const res = await fetch(`${url}/health`, { mode: "cors" });
      if (res.ok) {
        const data = await res.json();
        activeApiBase = url;
        return data;
      }
    } catch {
      // try next candidate
    }
  }
  return null;
}

export async function analyzeDocumentsBackend(
  files: File[],
  options: {
    projectName?: string;
    projectDescription?: string;
    depth?: string;
    focusAreas?: string[];
    riskSensitivity?: string;
  }
): Promise<{
  projectId: string;
  projectName: string;
  findings: Finding[];
  assumptions: Assumption[];
  summary?: string;
}> {
  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));
  if (options.projectName) formData.append("projectName", options.projectName);
  if (options.projectDescription) formData.append("projectDescription", options.projectDescription);
  if (options.depth) formData.append("depth", options.depth);
  if (options.focusAreas?.length) formData.append("focusAreas", options.focusAreas.join(","));
  if (options.riskSensitivity) formData.append("riskSensitivity", options.riskSensitivity);

  const res = await fetch(`${activeApiBase}/analyze`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Analysis failed" }));
    throw new Error(err.detail || "Document analysis failed");
  }

  return await res.json();
}

export async function analyzeDatasetBackend(
  file: File,
  options: {
    datasetPurpose?: string;
    importantColumns?: string;
    targetColumn?: string;
    missingTolerancePct?: number;
    projectName?: string;
  }
) {
  const formData = new FormData();
  formData.append("file", file);
  if (options.datasetPurpose) formData.append("datasetPurpose", options.datasetPurpose);
  if (options.importantColumns) formData.append("importantColumns", options.importantColumns);
  if (options.targetColumn) formData.append("targetColumn", options.targetColumn);
  if (options.missingTolerancePct) formData.append("missingTolerancePct", String(options.missingTolerancePct));
  if (options.projectName) formData.append("projectName", options.projectName);

  const res = await fetch(`${activeApiBase}/analyze/dataset`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Dataset analysis failed" }));
    throw new Error(err.detail || "Dataset analysis failed");
  }

  return await res.json();
}

export async function analyzeWorkflowBackend(workflowText: string, projectId?: string) {
  const res = await fetch(`${activeApiBase}/analyze/workflow`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ workflow: workflowText, projectId }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Workflow analysis failed" }));
    throw new Error(err.detail || "Workflow analysis failed");
  }

  return await res.json();
}

export async function updateFindingBackend(findingId: string, patch: Partial<Finding>) {
  const res = await fetch(`${activeApiBase}/findings/${findingId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error("Failed to update finding");
  return await res.json();
}

export async function fetchRippleGraphBackend(projectId: string): Promise<{
  nodes: RippleNode[];
  edges: RippleEdge[];
  downstreamTraces: Record<string, string[]>;
}> {
  const res = await fetch(`${activeApiBase}/projects/${projectId}/ripple`);
  if (!res.ok) throw new Error("Failed to fetch ripple graph");
  return await res.json();
}

export async function simulateWhatIfBackend(inputs: WhatIfInputs): Promise<WhatIfResult> {
  const res = await fetch(`${activeApiBase}/simulate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(inputs),
  });
  if (!res.ok) throw new Error("Simulation failed");
  return await res.json();
}

export async function fetchDevilsAdvocateBackend(
  scenarioType?: string,
  projectId?: string
): Promise<{ scenario: string; challenges: ChallengeQuestion[] }> {
  const res = await fetch(`${activeApiBase}/devils-advocate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scenarioType, projectId }),
  });
  if (!res.ok) throw new Error("Failed to fetch challenge questions");
  return await res.json();
}

export async function fetchProjectReportBackend(projectId: string) {
  const res = await fetch(`${activeApiBase}/projects/${projectId}/report`);
  if (!res.ok) throw new Error("Failed to fetch project report");
  return await res.json();
}
