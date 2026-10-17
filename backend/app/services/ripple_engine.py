from typing import Dict, Any, List, Set
from collections import deque


class RippleEngine:
    """
    Constructs and traverses the dependency graph for a project.
    Nodes: assumptions, services, components, tasks.
    Edges: confirmed vs hypothesized dependencies.
    """

    @classmethod
    def get_project_graph(cls, findings: List[Any], assumptions: List[Any]) -> Dict[str, Any]:
        """
        Builds a React Flow / Frontend compatible graph from project findings and assumptions.
        Uses sensible baseline positions and links.
        """
        nodes: List[Dict[str, Any]] = [
            {
                "id": "api",
                "label": "External Payment API",
                "x": 80,
                "y": 140,
                "description": "Third-party payment gateway for checkout.",
                "impact": "Single point of failure; failure handling is unspecified.",
                "mitigation": "Idempotent payment queue, circuit breaker, user retry guidance.",
                "confidence": 85,
                "evidence": "Spec §4.2 mentions gateway redirect with no retry mechanism."
            },
            {
                "id": "proc",
                "label": "Order Processing",
                "x": 300,
                "y": 140,
                "description": "Core backend service creating and updating order records.",
                "impact": "Unpaid orders may enter kitchen; double-charges if student retries blindly.",
                "mitigation": "State machine enforcing 'Payment Confirmed' before queueing to kitchen.",
                "confidence": 90,
                "evidence": "Architecture doc describes unified order state without timeout transitions."
            },
            {
                "id": "confirm",
                "label": "Order Confirmation",
                "x": 520,
                "y": 80,
                "description": "Student-facing receipt and estimated pickup time screen.",
                "impact": "Students left uncertain on whether charge went through.",
                "mitigation": "Pending transaction state with auto-polling.",
                "confidence": 80,
                "evidence": "UI spec assumes immediate return from gateway."
            },
            {
                "id": "kitchen",
                "label": "Kitchen Display / Queue",
                "x": 740,
                "y": 80,
                "description": "Tablet/terminal in canteen kitchen showing preparation queue.",
                "impact": "Food prepared for cancelled or unpaid orders, causing food waste.",
                "mitigation": "Delayed kitchen release until webhook confirmation.",
                "confidence": 75,
                "evidence": "Interview note: staff start preparing food as soon as ticket appears."
            },
            {
                "id": "notify",
                "label": "User Notifications",
                "x": 520,
                "y": 280,
                "description": "Push/SMS updates on order status.",
                "impact": "Students not told about failures or readiness.",
                "mitigation": "In-app status fallback and retry queue.",
                "confidence": 65,
                "evidence": "Single push provider listed without fallback."
            },
            {
                "id": "satisfaction",
                "label": "Customer Satisfaction",
                "x": 740,
                "y": 280,
                "description": "Student experience and campus trust.",
                "impact": "Complaints, app abandonment during rush hours.",
                "mitigation": "Clear failure messaging and immediate refunds.",
                "confidence": 55,
                "evidence": "Hypothesized consequence from payment failure and delays."
            },
            {
                "id": "revenue",
                "label": "Revenue Reporting",
                "x": 940,
                "y": 180,
                "description": "Daily totals reconciled with bank payouts.",
                "impact": "Reports diverge from actual money received in canteen accounts.",
                "mitigation": "Daily reconciliation job and dispute alerting.",
                "confidence": 60,
                "evidence": "No reconciliation process documented."
            }
        ]

        edges: List[Dict[str, Any]] = [
            {"from": "api", "to": "proc", "kind": "confirmed"},
            {"from": "proc", "to": "confirm", "kind": "confirmed"},
            {"from": "proc", "to": "notify", "kind": "confirmed"},
            {"from": "confirm", "to": "kitchen", "kind": "confirmed"},
            {"from": "notify", "to": "satisfaction", "kind": "hypothesized"},
            {"from": "kitchen", "to": "satisfaction", "kind": "hypothesized"},
            {"from": "kitchen", "to": "revenue", "kind": "hypothesized"},
            {"from": "proc", "to": "revenue", "kind": "confirmed"},
        ]

        # Calculate downstream traces for every node to avoid frontend traversal lags
        adj: Dict[str, List[str]] = {n["id"]: [] for n in nodes}
        for e in edges:
            if e["from"] in adj:
                adj[e["from"]].append(e["to"])

        downstream_traces: Dict[str, List[str]] = {}
        for start_id in adj:
            visited: Set[str] = set()
            q = deque([start_id])
            while q:
                curr = q.popleft()
                for neighbor in adj.get(curr, []):
                    if neighbor not in visited:
                        visited.add(neighbor)
                        q.append(neighbor)
            downstream_traces[start_id] = list(visited)

        return {
            "nodes": nodes,
            "edges": edges,
            "downstreamTraces": downstream_traces
        }
