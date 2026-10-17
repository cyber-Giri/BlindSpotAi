from typing import Dict, Any, List


class ReportService:
    @classmethod
    def generate_executive_summary(
        cls,
        project: Any,
        findings: List[Any],
        assumptions: List[Any],
        recommendations: List[Any]
    ) -> Dict[str, Any]:
        """
        Builds a comprehensive executive summary report from persisted project data.
        """
        # Group findings by severity
        by_severity = {
            "Critical": [],
            "High": [],
            "Medium": [],
            "Low": []
        }
        for f in findings:
            sev = getattr(f, "severity", "Medium")
            if sev in by_severity:
                by_severity[sev].append({
                    "id": getattr(f, "id", ""),
                    "title": getattr(f, "title", ""),
                    "category": getattr(f, "category", ""),
                    "status": getattr(f, "status", "Open"),
                    "confidence": getattr(f, "confidence", 70),
                    "evidence": getattr(f, "evidence", "Available"),
                    "recommendation": getattr(f, "recommendation", "")
                })

        # Unverified assumptions
        unverified_assumptions = [
            {
                "id": getattr(a, "id", ""),
                "text": getattr(a, "text", ""),
                "status": getattr(a, "status", "Unverified"),
                "riskIfFalse": getattr(a, "risk_if_false", "High"),
                "owner": getattr(a, "owner", "Unassigned")
            }
            for a in assumptions
            if getattr(a, "status", "") in ["Unverified", "Partially Verified"]
        ]

        # Top recommendations
        top_recs = [
            {
                "id": getattr(r, "id", ""),
                "action": getattr(r, "action", ""),
                "effort": getattr(r, "effort", "Medium"),
                "priority": getattr(r, "priority", 1),
                "status": getattr(r, "status", "Not Started")
            }
            for r in recommendations
        ]

        # Overall readiness score formula matching frontend
        # penalty: Critical=12, High=6, Medium=2.5, Low=1
        penalty = 0.0
        for f in findings:
            st = getattr(f, "status", "Open")
            if st in ["Open", "Investigating"]:
                sev = getattr(f, "severity", "Medium")
                penalty += {"Critical": 12.0, "High": 6.0, "Medium": 2.5, "Low": 1.0}.get(sev, 2.5)

        readiness_score = max(0, min(100, round(100 - penalty)))

        return {
            "project": {
                "id": getattr(project, "id", ""),
                "name": getattr(project, "name", ""),
                "description": getattr(project, "description", ""),
            },
            "readinessScore": readiness_score,
            "findingsCount": len(findings),
            "findingsBySeverity": {
                "Critical": len(by_severity["Critical"]),
                "High": len(by_severity["High"]),
                "Medium": len(by_severity["Medium"]),
                "Low": len(by_severity["Low"]),
            },
            "criticalFindings": by_severity["Critical"],
            "highFindings": by_severity["High"],
            "unverifiedAssumptions": unverified_assumptions,
            "recommendations": top_recs,
            "generatedAt": getattr(project, "updated_at", None) or "Just now"
        }
