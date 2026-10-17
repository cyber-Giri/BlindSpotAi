export type Severity = "Critical" | "High" | "Medium" | "Low";
export type FindingStatus = "Open" | "Investigating" | "Accepted" | "Resolved";
export type EvidenceAvailability = "Available" | "Partial" | "None";
export type FindingCategory =
  | "Missing Assumption"
  | "Missing Constraint"
  | "Dependency Risk"
  | "Contradiction"
  | "Unanswered Question"
  | "Data Quality Issue"
  | "Security Concern"
  | "Workflow Bottleneck"
  | "Scalability Risk"
  | "Missing Requirement";

export interface EvidenceReference {
  source: string;
  passage: string;
  /** Demo evidence is illustrative sample text, not extracted from an uploaded file. */
  origin: "demo-sample" | "uploaded-document";
}

export interface Comment {
  id: string;
  author: string;
  text: string;
  at: string;
}

export interface Finding {
  id: string;
  title: string;
  description: string;
  category: FindingCategory;
  severity: Severity;
  likelihood: number; // 1-5
  impact: number; // 1-10
  confidence: number; // 0-100
  evidence: EvidenceAvailability;
  recommendation: string;
  status: FindingStatus;
  detectedAt: string;
  owner?: string;
  overlooked: string;
  whyMatters: string;
  evidenceItems: EvidenceReference[];
  assumptionIds: string[];
  consequences: string[];
  verificationTest: string;
  uncertainty: string;
  nodeIds: string[];
  comments: Comment[];
  isDemo: boolean;
}

export type AssumptionStatus =
  | "Unverified"
  | "Partially Verified"
  | "Verified"
  | "Disproven"
  | "Accepted Risk";

export interface Assumption {
  id: string;
  text: string;
  category: string;
  evidence: string[];
  confidence: number;
  status: AssumptionStatus;
  riskIfFalse: Severity;
  owner: string;
  dueDate?: string;
  updatedAt: string;
  findingIds: string[];
  history: { status: AssumptionStatus; at: string; note?: string }[];
}

export type RecommendationStatus = "Not Started" | "Planned" | "In Progress" | "Completed";

export interface Recommendation {
  id: string;
  findingId: string;
  action: string;
  rationale: string;
  evidence: string;
  benefit: string;
  effort: "Low" | "Medium" | "High";
  priority: number;
  dependencies: string[];
  verification: string;
  status: RecommendationStatus;
  owner?: string;
  dueDate?: string;
}

export interface ActivityEvent {
  id: string;
  type: "analysis" | "risk" | "verified" | "completed" | "update";
  text: string;
  at: string;
}

export interface RippleNode {
  id: string;
  label: string;
  x: number;
  y: number;
  description: string;
  impact: string;
  mitigation: string;
  confidence: number;
  evidence: string;
}

export interface RippleEdge {
  from: string;
  to: string;
  kind: "confirmed" | "hypothesized";
}

export interface WhatIfInputs {
  budgetCut: number;
  deadlineCut: number;
  userGrowth: number;
  teamCut: number;
  apiAvailability: number;
  extraCost: number;
}

export interface WhatIfResult {
  schedulePressure: number;
  budgetPressure: number;
  affectedMilestones: string[];
  newRisks: string[];
  mitigations: string[];
}

export interface SavedScenario {
  id: string;
  name: string;
  inputs: WhatIfInputs;
  result: WhatIfResult;
  at: string;
}

export interface ChallengeQuestion {
  question: string;
  why: string;
  findingId?: string;
  impact: Severity;
  evidence: EvidenceAvailability;
  validation: string;
}
