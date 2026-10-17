import type {
  ActivityEvent,
  Assumption,
  ChallengeQuestion,
  Finding,
  Recommendation,
  RippleEdge,
  RippleNode,
} from "./types";

export const DEMO_PROJECT = {
  id: "campus-food",
  name: "Campus Food Ordering System",
  description:
    "A web application that allows college students to order food from campus canteens, pay online, track orders, and receive notifications.",
  workspace: "Demo Workspace",
};

const SRC_SPEC = "Product Spec v2.pdf (demo sample)";
const SRC_ARCH = "Architecture Notes.docx (demo sample)";
const SRC_PLAN = "Launch Plan.xlsx (demo sample)";

type Seed = Partial<Finding> &
  Pick<Finding, "id" | "title" | "description" | "category" | "severity" | "status">;

function f(s: Seed): Finding {
  return {
    likelihood: 3,
    impact: 5,
    confidence: 70,
    evidence: "Partial",
    recommendation: "Define the missing rule and add it to the specification.",
    detectedAt: "2026-10-12",
    overlooked: s.description,
    whyMatters: "Left unaddressed, this gap can cause rework late in delivery.",
    evidenceItems: [],
    assumptionIds: [],
    consequences: [],
    verificationTest: "Review with the owning team and document the decision.",
    uncertainty: "Based on demo sample text only; real documents may address this elsewhere.",
    nodeIds: [],
    comments: [],
    isDemo: true,
    ...s,
  };
}

export const SEED_FINDINGS: Finding[] = [
  f({
    id: "F-01",
    title: "Payment failure recovery is undefined",
    description: "No behavior is specified for when the external payment API times out or declines.",
    category: "Missing Requirement",
    severity: "Critical",
    status: "Open",
    likelihood: 4,
    impact: 10,
    confidence: 88,
    evidence: "Available",
    detectedAt: "2026-10-16",
    recommendation: "Define retry, timeout and idempotent order-state rules for payment failures.",
    overlooked: "The spec describes the happy path for payment but never says what happens if the gateway fails mid-transaction.",
    whyMatters: "Students may be charged without an order, or orders may reach the kitchen unpaid. Both damage trust and revenue reporting.",
    evidenceItems: [
      { source: SRC_SPEC, passage: "§4.2 — “On checkout, the app redirects to the payment provider and returns to the confirmation screen.”", origin: "demo-sample" },
      { source: SRC_ARCH, passage: "“Payment provider: third-party API (SLA not yet reviewed).”", origin: "demo-sample" },
    ],
    assumptionIds: ["A-01", "A-02"],
    consequences: ["Double charges", "Orphaned orders in kitchen queue", "Refund backlog", "Revenue reports out of sync"],
    verificationTest: "Simulate gateway timeouts (5s, 30s) and declines in staging; confirm order state and student messaging.",
    uncertainty: "High confidence the gap exists in the sample spec; the payment provider may offer built-in recovery not yet documented.",
    nodeIds: ["api", "proc", "confirm", "revenue"],
  }),
  f({
    id: "F-02",
    title: "Peak-hour capacity has not been tested",
    description: "Lunch rush (12:00–13:30) traffic is assumed but no load test exists.",
    category: "Scalability Risk",
    severity: "Critical",
    status: "Investigating",
    likelihood: 4,
    impact: 9,
    confidence: 76,
    evidence: "Partial",
    detectedAt: "2026-10-15",
    owner: "Ravi Menon",
    recommendation: "Run a load test at 3× expected lunch traffic before launch.",
    overlooked: "Expected concurrency during lunch is not stated, and no performance targets are defined.",
    whyMatters: "The whole value of the app is concentrated in a 90-minute window. A slowdown then is effectively an outage.",
    evidenceItems: [{ source: SRC_PLAN, passage: "Row 14 — “Expected users: ~4,000 students” (no concurrency figure).", origin: "demo-sample" }],
    assumptionIds: ["A-03"],
    consequences: ["Checkout timeouts", "Abandoned carts", "Kitchen idle then overloaded"],
    verificationTest: "Load test with 800 concurrent sessions; p95 checkout < 2s.",
    nodeIds: ["proc", "confirm"],
  }),
  f({
    id: "F-03",
    title: "Menu availability sync is unspecified",
    description: "How sold-out items propagate from canteen to the app is not defined.",
    category: "Dependency Risk",
    severity: "High",
    status: "Open",
    likelihood: 4,
    impact: 7,
    confidence: 72,
    detectedAt: "2026-10-14",
    recommendation: "Specify a sync mechanism and maximum staleness for menu availability.",
    overlooked: "Canteens update stock manually; the app has no defined refresh interval.",
    whyMatters: "Students can order items that no longer exist, forcing cancellations and refunds.",
    evidenceItems: [{ source: SRC_SPEC, passage: "§3.1 — “Canteen staff manage the menu from the admin panel.”", origin: "demo-sample" }],
    assumptionIds: ["A-04"],
    consequences: ["Orders for unavailable items", "Manual refunds", "Staff frustration"],
    nodeIds: ["kitchen"],
  }),
  f({
    id: "F-04",
    title: "Order cancellation and refund policy is missing",
    description: "No rules exist for who can cancel, until when, and how refunds are issued.",
    category: "Missing Requirement",
    severity: "Critical",
    status: "Open",
    likelihood: 5,
    impact: 8,
    confidence: 84,
    evidence: "Available",
    detectedAt: "2026-10-16",
    recommendation: "Write a cancellation window and refund policy, reviewed by finance.",
    overlooked: "Cancellation is mentioned as a button in mockups but has no policy behind it.",
    whyMatters: "Refund disputes create support load and may conflict with payment provider terms.",
    evidenceItems: [{ source: SRC_SPEC, passage: "Mockup 7 — “Cancel order” button; no accompanying text.", origin: "demo-sample" }],
    assumptionIds: ["A-05"],
    consequences: ["Chargebacks", "Inconsistent staff decisions", "Food waste"],
    nodeIds: ["proc", "kitchen", "revenue"],
  }),
  f({
    id: "F-05",
    title: "Personal data retention rules are unclear",
    description: "Student IDs and order history are stored with no retention period.",
    category: "Security Concern",
    severity: "High",
    status: "Open",
    likelihood: 3,
    impact: 8,
    confidence: 68,
    detectedAt: "2026-10-13",
    recommendation: "Define retention periods and deletion process; review with the university data office.",
    whyMatters: "Universities often have strict data policies; non-compliance can block launch.",
    evidenceItems: [{ source: SRC_ARCH, passage: "“Store student_id, email, phone, full order history.”", origin: "demo-sample" }],
    assumptionIds: ["A-06"],
    consequences: ["Compliance review delay", "Data breach exposure"],
  }),
  f({
    id: "F-06",
    title: "Notification service failure handling is undefined",
    description: "If SMS/push provider fails, students never learn their order is ready.",
    category: "Dependency Risk",
    severity: "High",
    status: "Open",
    likelihood: 3,
    impact: 7,
    confidence: 71,
    detectedAt: "2026-10-15",
    recommendation: "Add an in-app fallback status and retry queue for notifications.",
    evidenceItems: [{ source: SRC_ARCH, passage: "“Notifications via third-party push service.”", origin: "demo-sample" }],
    assumptionIds: ["A-07"],
    consequences: ["Cold food", "Crowding at pickup counter"],
    nodeIds: ["notify"],
  }),
  f({
    id: "F-07",
    title: "Kitchen capacity during rush hours is unknown",
    description: "No limit on orders per time slot; kitchens may receive more than they can prepare.",
    category: "Workflow Bottleneck",
    severity: "High",
    status: "Investigating",
    likelihood: 4,
    impact: 7,
    confidence: 65,
    detectedAt: "2026-10-14",
    owner: "Anika Shah",
    recommendation: "Introduce per-slot order caps configurable by each canteen.",
    assumptionIds: ["A-08"],
    consequences: ["Long waits", "Order errors", "Staff burnout"],
    nodeIds: ["kitchen"],
  }),
  f({ id: "F-08", title: "Two conflicting pickup-time definitions", description: "Spec says 'ready time' is estimated; plan says it's guaranteed.", category: "Contradiction", severity: "Medium", status: "Open", impact: 5, confidence: 80, evidence: "Available", detectedAt: "2026-10-11", assumptionIds: ["A-09"] }),
  f({ id: "F-09", title: "Who approves new canteen onboarding?", description: "No owner defined for adding canteens to the platform.", category: "Unanswered Question", severity: "Medium", status: "Open", impact: 4, confidence: 62, evidence: "None", detectedAt: "2026-10-10" }),
  f({ id: "F-10", title: "Menu price data has duplicate entries", description: "Sample menu CSV contains 14 duplicate item rows with different prices.", category: "Data Quality Issue", severity: "Medium", status: "Resolved", impact: 5, confidence: 92, evidence: "Available", detectedAt: "2026-10-08" }),
  f({ id: "F-11", title: "Admin panel lacks role separation", description: "All canteen staff share one admin role.", category: "Security Concern", severity: "Medium", status: "Open", impact: 6, confidence: 74, detectedAt: "2026-10-12", assumptionIds: ["A-10"] }),
  f({ id: "F-12", title: "No accessibility requirement stated", description: "Screen reader and contrast requirements are absent.", category: "Missing Requirement", severity: "Low", status: "Resolved", impact: 3, confidence: 85, evidence: "Available", detectedAt: "2026-10-07" }),
  f({ id: "F-13", title: "Offline behavior on campus Wi-Fi gaps", description: "No guidance for intermittent connectivity in basement canteens.", category: "Missing Constraint", severity: "Medium", status: "Open", impact: 5, confidence: 58, evidence: "None", detectedAt: "2026-10-13" }),
  f({ id: "F-14", title: "Budget excludes payment provider fees", description: "Per-transaction fees are not in the cost model.", category: "Missing Assumption", severity: "Medium", status: "Accepted", impact: 4, confidence: 79, evidence: "Partial", detectedAt: "2026-10-09", assumptionIds: ["A-11"] }),
  f({ id: "F-15", title: "Allergen information source undefined", description: "Unclear who maintains allergen data per dish.", category: "Unanswered Question", severity: "High", status: "Resolved", impact: 7, confidence: 77, detectedAt: "2026-10-06" }),
  f({ id: "F-16", title: "Single developer owns deployment", description: "Only one person can deploy to production.", category: "Workflow Bottleneck", severity: "Low", status: "Resolved", impact: 4, confidence: 70, detectedAt: "2026-10-05" }),
  f({ id: "F-17", title: "Timezone handling for scheduled orders", description: "Server timezone vs. campus local time is not specified.", category: "Missing Constraint", severity: "Low", status: "Resolved", impact: 3, confidence: 66, detectedAt: "2026-10-04" }),
  f({ id: "F-18", title: "Revenue report reconciliation not defined", description: "No process to reconcile payment provider payouts with order records.", category: "Missing Requirement", severity: "Medium", status: "Open", impact: 6, confidence: 69, detectedAt: "2026-10-15", nodeIds: ["revenue"], assumptionIds: ["A-12"] }),
];

const h = (status: Assumption["status"], at: string) => [{ status, at }];

export const SEED_ASSUMPTIONS: Assumption[] = [
  { id: "A-01", text: "The payment API is always available during lunch hours", category: "Technical", evidence: [], confidence: 35, status: "Unverified", riskIfFalse: "Critical", owner: "Ravi Menon", updatedAt: "2026-10-16", findingIds: ["F-01"], history: h("Unverified", "2026-10-16") },
  { id: "A-02", text: "Payment provider retries failed webhooks automatically", category: "Technical", evidence: ["Provider docs (link pending)"], confidence: 50, status: "Unverified", riskIfFalse: "High", owner: "Ravi Menon", updatedAt: "2026-10-15", findingIds: ["F-01"], history: h("Unverified", "2026-10-15") },
  { id: "A-03", text: "Peak load will not exceed 300 concurrent users", category: "Technical", evidence: [], confidence: 30, status: "Unverified", riskIfFalse: "Critical", owner: "Ravi Menon", updatedAt: "2026-10-15", findingIds: ["F-02"], history: h("Unverified", "2026-10-15") },
  { id: "A-04", text: "Canteen staff update menus in real time", category: "Operations", evidence: [], confidence: 25, status: "Unverified", riskIfFalse: "High", owner: "Anika Shah", updatedAt: "2026-10-14", findingIds: ["F-03"], history: h("Unverified", "2026-10-14") },
  { id: "A-05", text: "Students rarely cancel orders", category: "Business", evidence: [], confidence: 40, status: "Unverified", riskIfFalse: "High", owner: "Lena Ortiz", updatedAt: "2026-10-16", findingIds: ["F-04"], history: h("Unverified", "2026-10-16") },
  { id: "A-06", text: "University data policy allows indefinite retention", category: "Security", evidence: [], confidence: 20, status: "Unverified", riskIfFalse: "High", owner: "Lena Ortiz", updatedAt: "2026-10-13", findingIds: ["F-05"], history: h("Unverified", "2026-10-13") },
  { id: "A-07", text: "Push notifications reach > 95% of students", category: "Technical", evidence: [], confidence: 45, status: "Unverified", riskIfFalse: "Medium", owner: "Ravi Menon", updatedAt: "2026-10-15", findingIds: ["F-06"], history: h("Unverified", "2026-10-15") },
  { id: "A-08", text: "Each kitchen can prepare 60 orders per 15 minutes", category: "Operations", evidence: ["Canteen manager interview (demo)"], confidence: 55, status: "Partially Verified", riskIfFalse: "High", owner: "Anika Shah", updatedAt: "2026-10-14", findingIds: ["F-07", "F-02"], history: h("Partially Verified", "2026-10-14") },
  { id: "A-09", text: "Pickup times are estimates, not guarantees", category: "Business", evidence: ["Spec §5.3 (demo)"], confidence: 82, status: "Verified", riskIfFalse: "Medium", owner: "Lena Ortiz", updatedAt: "2026-10-11", findingIds: ["F-08"], history: h("Verified", "2026-10-11") },
  { id: "A-10", text: "Canteen staff do not need separate permissions", category: "Security", evidence: ["Staff survey (demo)"], confidence: 15, status: "Disproven", riskIfFalse: "Medium", owner: "Anika Shah", updatedAt: "2026-10-12", findingIds: ["F-11"], history: h("Disproven", "2026-10-12") },
  { id: "A-11", text: "Transaction fees are absorbed by canteens", category: "Budget", evidence: ["Finance email (demo)"], confidence: 60, status: "Accepted Risk", riskIfFalse: "Low", owner: "Lena Ortiz", updatedAt: "2026-10-09", findingIds: ["F-14"], history: h("Accepted Risk", "2026-10-09") },
  { id: "A-12", text: "Provider payouts match order totals daily", category: "Budget", evidence: [], confidence: 40, status: "Verified", riskIfFalse: "Medium", owner: "Lena Ortiz", updatedAt: "2026-10-15", findingIds: ["F-18", "F-01"], history: h("Verified", "2026-10-15") },
];

export const SEED_RECOMMENDATIONS: Recommendation[] = [
  { id: "R-01", findingId: "F-01", action: "Define payment failure state machine with retries and idempotency keys", rationale: "Prevents double charges and orphaned orders.", evidence: "Spec §4.2 describes only the success path (demo sample).", benefit: "Expected to reduce payment-related support tickets (estimate).", effort: "Medium", priority: 1, dependencies: ["Payment provider SLA review"], verification: "Staging chaos test passes with zero orphaned orders.", status: "Planned" },
  { id: "R-02", findingId: "F-04", action: "Publish cancellation window (2 min) and refund policy", rationale: "Gives staff consistent rules and students clear expectations.", evidence: "Mockup 7 cancel button without policy (demo sample).", benefit: "Fewer disputes (estimate).", effort: "Low", priority: 2, dependencies: ["Finance approval"], verification: "Policy reviewed and shown in-app at checkout.", status: "Not Started" },
  { id: "R-03", findingId: "F-02", action: "Load test at 3× expected lunch traffic", rationale: "Lunch window concentrates all demand.", evidence: "No concurrency figure in launch plan (demo sample).", benefit: "Identifies bottlenecks before launch.", effort: "Medium", priority: 3, dependencies: ["Staging environment"], verification: "p95 checkout under 2s at 800 sessions.", status: "In Progress", owner: "Ravi Menon" },
  { id: "R-04", findingId: "F-07", action: "Add per-slot order caps for each canteen", rationale: "Matches demand to real preparation capacity.", evidence: "Canteen interview suggests ~60 orders / 15 min (demo).", benefit: "Shorter, more predictable waits (estimate).", effort: "Medium", priority: 4, dependencies: ["R-03"], verification: "Caps configurable in admin; tested during pilot.", status: "Not Started" },
  { id: "R-05", findingId: "F-03", action: "Real-time sold-out toggle with 30s max staleness", rationale: "Prevents orders for unavailable items.", evidence: "Admin panel section §3.1 (demo sample).", benefit: "Fewer cancellations.", effort: "Low", priority: 5, dependencies: [], verification: "Toggle reflected in app within 30s.", status: "Not Started" },
  { id: "R-06", findingId: "F-06", action: "In-app order status fallback + notification retry queue", rationale: "Students still see readiness if push fails.", evidence: "Single push provider (demo sample).", benefit: "More reliable pickup.", effort: "Low", priority: 6, dependencies: [], verification: "Disable push in staging; status still updates.", status: "Not Started" },
  { id: "R-07", findingId: "F-05", action: "Define 12-month retention and deletion job", rationale: "Aligns with typical university policy.", evidence: "Architecture lists full order history (demo sample).", benefit: "Smoother compliance review.", effort: "Medium", priority: 7, dependencies: ["Data office review"], verification: "Policy signed off; job runs nightly.", status: "Not Started" },
  { id: "R-08", findingId: "F-10", action: "Deduplicate menu price data", rationale: "Conflicting prices confuse checkout.", evidence: "14 duplicate rows in sample CSV.", benefit: "Consistent pricing.", effort: "Low", priority: 8, dependencies: [], verification: "Zero duplicates in validation script.", status: "Completed" },
];

export const SEED_ACTIVITY: ActivityEvent[] = [
  { id: "E1", type: "risk", text: "Critical risk discovered: Payment failure recovery is undefined", at: "2026-10-16T09:12:00Z" },
  { id: "E2", type: "analysis", text: "Product Spec v2.pdf analyzed (demo)", at: "2026-10-16T09:10:00Z" },
  { id: "E3", type: "verified", text: "Assumption verified: Provider payouts match order totals daily", at: "2026-10-15T15:40:00Z" },
  { id: "E4", type: "completed", text: "Recommendation completed: Deduplicate menu price data", at: "2026-10-14T11:05:00Z" },
  { id: "E5", type: "update", text: "Ravi Menon started investigating peak-hour capacity", at: "2026-10-15T10:20:00Z" },
];

export const RIPPLE_NODES: RippleNode[] = [
  { id: "api", label: "External Payment API", x: 80, y: 200, description: "Third-party gateway processing card and UPI payments.", impact: "Root of failure chain; outage blocks all paid orders.", mitigation: "Timeouts, retries, circuit breaker, status page monitoring.", confidence: 85, evidence: "Architecture Notes lists the provider; SLA not reviewed (demo sample)." },
  { id: "proc", label: "Payment Processing", x: 300, y: 200, description: "Internal service mapping gateway responses to order payment state.", impact: "Failed or delayed payments leave orders in an unknown state.", mitigation: "Idempotency keys and explicit 'payment pending' state.", confidence: 80, evidence: "Spec §4.2 success path only (demo sample)." },
  { id: "confirm", label: "Order Confirmation", x: 520, y: 110, description: "Confirms order to the student and pushes it to the kitchen.", impact: "Missing confirmation causes duplicate orders.", mitigation: "Confirm only after definitive payment state.", confidence: 72, evidence: "Flow diagram links confirmation directly to payment redirect (demo)." },
  { id: "kitchen", label: "Kitchen Preparation", x: 740, y: 110, description: "Canteen queue of orders to prepare.", impact: "Kitchen prepares unpaid or misses paid orders.", mitigation: "Kitchen sees only confirmed orders; reconcile every 15 min.", confidence: 60, evidence: "Hypothesized from flow — no kitchen-side spec exists." },
  { id: "notify", label: "User Notifications", x: 520, y: 300, description: "Push/SMS updates on order status.", impact: "Students not told about failures or readiness.", mitigation: "In-app status fallback and retry queue.", confidence: 65, evidence: "Single push provider listed (demo sample)." },
  { id: "satisfaction", label: "Customer Satisfaction", x: 740, y: 300, description: "Student experience and trust.", impact: "Complaints, app abandonment.", mitigation: "Clear failure messaging and quick refunds.", confidence: 55, evidence: "Hypothesized consequence; no user research yet." },
  { id: "revenue", label: "Revenue Reporting", x: 940, y: 200, description: "Daily totals reconciled with payouts.", impact: "Reports diverge from actual money received.", mitigation: "Daily reconciliation job and alerting.", confidence: 58, evidence: "No reconciliation process documented (demo sample)." },
];

export const RIPPLE_EDGES: RippleEdge[] = [
  { from: "api", to: "proc", kind: "confirmed" },
  { from: "proc", to: "confirm", kind: "confirmed" },
  { from: "proc", to: "notify", kind: "confirmed" },
  { from: "confirm", to: "kitchen", kind: "confirmed" },
  { from: "notify", to: "satisfaction", kind: "hypothesized" },
  { from: "kitchen", to: "satisfaction", kind: "hypothesized" },
  { from: "kitchen", to: "revenue", kind: "hypothesized" },
  { from: "proc", to: "revenue", kind: "confirmed" },
];

export const SCENARIO_TYPES = [
  "Budget reduction",
  "Deadline moved forward",
  "Sudden user growth",
  "External API failure",
  "Team member unavailable",
  "Security incident",
  "Data corruption",
  "Unexpected regulation",
  "Infrastructure outage",
  "Custom scenario",
] as const;

export const CHALLENGE_BANK: Record<string, ChallengeQuestion[][]> = {
  "Sudden user growth": [
    [
      { question: "Can the database handle 5× the expected load?", why: "Lunch traffic is already concentrated in 90 minutes.", findingId: "F-02", impact: "Critical", evidence: "None", validation: "Run a load test at 5× baseline." },
      { question: "Is there a defined rate limit?", why: "Without limits, one burst can degrade everyone.", impact: "High", evidence: "None", validation: "Document rate limits per user and per canteen." },
      { question: "What happens when the payment API hits its quota?", why: "Quota errors look like failures with no recovery path.", findingId: "F-01", impact: "Critical", evidence: "Partial", validation: "Check provider quota tiers and test quota errors." },
      { question: "Is there a load-testing report?", why: "Capacity is currently an assumption.", findingId: "F-02", impact: "High", evidence: "None", validation: "Produce and review a load report." },
    ],
    [
      { question: "Can kitchens physically keep up?", why: "Software scaling doesn't scale cooks.", findingId: "F-07", impact: "High", evidence: "Partial", validation: "Pilot with order caps for one week." },
      { question: "Will notification costs scale linearly?", why: "SMS is billed per message.", findingId: "F-06", impact: "Medium", evidence: "None", validation: "Model notification cost at 5× volume." },
    ],
  ],
  "External API failure": [
    [
      { question: "What does the student see if payment never returns?", why: "Undefined state leads to duplicate attempts.", findingId: "F-01", impact: "Critical", evidence: "Available", validation: "Design and test the 'payment pending' screen." },
      { question: "Do kitchens receive unpaid orders?", why: "Food waste and revenue loss.", findingId: "F-01", impact: "High", evidence: "Partial", validation: "Trace order state in staging during outage." },
      { question: "Is there a fallback when push notifications fail?", why: "Students may never collect food.", findingId: "F-06", impact: "High", evidence: "None", validation: "Disable push provider in staging." },
    ],
  ],
};

export const GENERIC_CHALLENGES: ChallengeQuestion[][] = [
  [
    { question: "Which feature would you cut first, and who decides?", why: "Without a priority order, cuts are made under pressure.", impact: "High", evidence: "None", validation: "Agree a ranked feature list." },
    { question: "Is the refund policy needed before launch?", why: "Cancellations happen from day one.", findingId: "F-04", impact: "Critical", evidence: "Available", validation: "Confirm policy owner and deadline." },
    { question: "Who else can deploy if the main developer is unavailable?", why: "Single points of failure in people, too.", findingId: "F-16", impact: "Medium", evidence: "Partial", validation: "Run a deploy with a second engineer." },
  ],
  [
    { question: "What data would be lost if the database is corrupted today?", why: "Backups are not mentioned in the plan.", impact: "High", evidence: "None", validation: "Restore a backup to staging." },
    { question: "Does the university require a data-protection review?", why: "Could block launch late.", findingId: "F-05", impact: "High", evidence: "None", validation: "Email the data office this week." },
  ],
];
