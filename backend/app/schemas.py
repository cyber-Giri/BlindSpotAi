from enum import Enum
from typing import List, Optional, Any, Dict
from datetime import datetime
from pydantic import BaseModel, Field


class SeverityEnum(str, Enum):
    Critical = "Critical"
    High = "High"
    Medium = "Medium"
    Low = "Low"


class FindingStatusEnum(str, Enum):
    Open = "Open"
    Investigating = "Investigating"
    Accepted = "Accepted"
    Resolved = "Resolved"


class EvidenceAvailabilityEnum(str, Enum):
    Available = "Available"
    Partial = "Partial"
    None_ = "None"


class FindingCategoryEnum(str, Enum):
    MissingAssumption = "Missing Assumption"
    MissingConstraint = "Missing Constraint"
    DependencyRisk = "Dependency Risk"
    Contradiction = "Contradiction"
    UnansweredQuestion = "Unanswered Question"
    DataQualityIssue = "Data Quality Issue"
    SecurityConcern = "Security Concern"
    WorkflowBottleneck = "Workflow Bottleneck"
    ScalabilityRisk = "Scalability Risk"
    MissingRequirement = "Missing Requirement"
    OperationalRisk = "Operational Risk"


class AssumptionStatusEnum(str, Enum):
    Unverified = "Unverified"
    PartiallyVerified = "Partially Verified"
    Verified = "Verified"
    Disproven = "Disproven"
    AcceptedRisk = "Accepted Risk"


class RecommendationStatusEnum(str, Enum):
    NotStarted = "Not Started"
    Planned = "Planned"
    InProgress = "In Progress"
    Completed = "Completed"


# --- Sub-schemas ---

class EvidenceReference(BaseModel):
    source: str
    passage: str
    origin: str = "uploaded-document"  # or demo-sample


class Comment(BaseModel):
    id: str
    author: str
    text: str
    at: str


class AssumptionHistory(BaseModel):
    status: str
    at: str
    note: Optional[str] = None


# --- Findings ---

class FindingBase(BaseModel):
    title: str
    description: str
    category: str
    severity: str
    likelihood: int = Field(default=3, ge=1, le=5)
    impact: int = Field(default=5, ge=1, le=10)
    confidence: int = Field(default=70, ge=0, le=100)
    evidence: str = "Available"
    recommendation: Optional[str] = None
    status: str = "Open"
    owner: Optional[str] = None
    overlooked: Optional[str] = None
    whyMatters: Optional[str] = None
    evidenceItems: List[EvidenceReference] = Field(default_factory=list)
    assumptionIds: List[str] = Field(default_factory=list)
    consequences: List[str] = Field(default_factory=list)
    verificationTest: Optional[str] = None
    uncertainty: Optional[str] = None
    nodeIds: List[str] = Field(default_factory=list)
    comments: List[Comment] = Field(default_factory=list)
    isDemo: bool = False


class FindingCreate(FindingBase):
    pass


class FindingUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    severity: Optional[str] = None
    likelihood: Optional[int] = None
    impact: Optional[int] = None
    confidence: Optional[int] = None
    evidence: Optional[str] = None
    recommendation: Optional[str] = None
    status: Optional[str] = None
    owner: Optional[str] = None
    overlooked: Optional[str] = None
    whyMatters: Optional[str] = None
    evidenceItems: Optional[List[EvidenceReference]] = None
    consequences: Optional[List[str]] = None
    verificationTest: Optional[str] = None
    uncertainty: Optional[str] = None


class FindingResponse(FindingBase):
    id: str
    projectId: str = Field(alias="project_id", default="")
    detectedAt: str = Field(default="")
    riskScore: Optional[int] = None

    class Config:
        populate_by_name = True


# --- Assumptions ---

class AssumptionBase(BaseModel):
    text: str
    category: str = "Technical"
    evidence: List[str] = Field(default_factory=list)
    confidence: int = 70
    status: str = "Unverified"
    riskIfFalse: str = "High"
    owner: str = "Unassigned"
    dueDate: Optional[str] = None
    findingIds: List[str] = Field(default_factory=list)
    history: List[AssumptionHistory] = Field(default_factory=list)


class AssumptionCreate(AssumptionBase):
    projectId: Optional[str] = None


class AssumptionUpdate(BaseModel):
    text: Optional[str] = None
    category: Optional[str] = None
    status: Optional[str] = None
    confidence: Optional[int] = None
    riskIfFalse: Optional[str] = None
    owner: Optional[str] = None
    dueDate: Optional[str] = None
    findingIds: Optional[List[str]] = None


class AssumptionResponse(AssumptionBase):
    id: str
    projectId: str = Field(alias="project_id", default="")
    updatedAt: str = Field(default="")

    class Config:
        populate_by_name = True


# --- Recommendations ---

class RecommendationBase(BaseModel):
    findingId: Optional[str] = None
    action: str
    rationale: Optional[str] = None
    evidence: Optional[str] = None
    benefit: Optional[str] = None
    effort: str = "Medium"
    priority: int = 1
    dependencies: List[str] = Field(default_factory=list)
    verification: Optional[str] = None
    status: str = "Not Started"
    owner: Optional[str] = None
    dueDate: Optional[str] = None


class RecommendationCreate(RecommendationBase):
    projectId: Optional[str] = None


class RecommendationUpdate(BaseModel):
    action: Optional[str] = None
    status: Optional[str] = None
    owner: Optional[str] = None
    dueDate: Optional[str] = None
    effort: Optional[str] = None
    priority: Optional[int] = None


class RecommendationResponse(RecommendationBase):
    id: str
    projectId: str = Field(alias="project_id", default="")

    class Config:
        populate_by_name = True


# --- Projects ---

class ProjectBase(BaseModel):
    name: str
    description: Optional[str] = None


class ProjectCreate(ProjectBase):
    pass


class ProjectResponse(ProjectBase):
    id: str
    createdAt: str
    updatedAt: str

    class Config:
        populate_by_name = True


# --- Ripple Graph ---

class RippleNodeResponse(BaseModel):
    id: str
    label: str
    x: float
    y: float
    description: str
    impact: str
    mitigation: str
    confidence: int
    evidence: str


class RippleEdgeResponse(BaseModel):
    from_: str = Field(alias="from")
    to: str
    kind: str  # confirmed or hypothesized

    class Config:
        populate_by_name = True


class RippleGraphResponse(BaseModel):
    nodes: List[RippleNodeResponse]
    edges: List[RippleEdgeResponse]
    downstreamTraces: Dict[str, List[str]] = Field(default_factory=dict)


# --- Simulation / What-If ---

class WhatIfInputs(BaseModel):
    budgetCut: float = 0.0
    deadlineCut: float = 0.0
    userGrowth: float = 1.0
    teamCut: float = 0.0
    apiAvailability: float = 100.0
    extraCost: float = 0.0


class WhatIfResult(BaseModel):
    schedulePressure: int
    budgetPressure: int
    affectedMilestones: List[str]
    newRisks: List[str]
    mitigations: List[str]
    assumptionsUsed: List[str] = Field(default_factory=list)
    isDeterministic: bool = True


class SavedScenarioResponse(BaseModel):
    id: str
    name: str
    inputs: WhatIfInputs
    result: WhatIfResult
    at: str


# --- Devil's Advocate ---

class ChallengeQuestion(BaseModel):
    question: str
    why: str
    findingId: Optional[str] = None
    impact: str  # Severity
    evidence: str  # Available, Partial, None
    validation: str


class DevilsAdvocateRequest(BaseModel):
    projectId: Optional[str] = None
    projectDescription: Optional[str] = None
    scenarioType: Optional[str] = None
    customScenario: Optional[str] = None


class DevilsAdvocateResponse(BaseModel):
    scenario: str
    challenges: List[ChallengeQuestion]
    explanation: Optional[str] = None


# --- Workflow Analysis ---

class WorkflowAnalysisRequest(BaseModel):
    workflow: str
    projectId: Optional[str] = None
    depth: Optional[str] = "Standard"


# --- Dataset Profile ---

class DatasetProfileResponse(BaseModel):
    fileName: str
    rowCount: int
    columnCount: int
    columns: List[str]
    dtypes: Dict[str, str]
    missingSummary: Dict[str, Dict[str, Any]]  # col -> {count, percentage}
    duplicateRowsCount: int
    constantColumns: List[str]
    outlierSummary: Dict[str, int]
    targetLeakageRisks: List[str]
    findings: List[FindingResponse]


# --- Health & General Responses ---

class HealthResponse(BaseModel):
    status: str
    version: str
    ai_configured: bool
    ai_model: str
    database: str
