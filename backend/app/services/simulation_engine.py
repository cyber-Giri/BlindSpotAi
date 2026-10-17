from typing import Dict, Any, List


class SimulationEngine:
    """
    Transparent, deterministic What-If simulator.
    Predicts schedule pressure, budget pressure, affected milestones, new risks, and mitigations.
    Consistent: same inputs always produce identical results.
    """

    @classmethod
    def simulate(cls, inputs: Dict[str, Any]) -> Dict[str, Any]:
        budget_cut = float(inputs.get("budgetCut", 0.0))
        deadline_cut = float(inputs.get("deadlineCut", 0.0))
        user_growth = float(inputs.get("userGrowth", 1.0))
        team_cut = float(inputs.get("teamCut", 0.0))
        api_availability = float(inputs.get("apiAvailability", 100.0))
        extra_cost = float(inputs.get("extraCost", 0.0))

        # Explicit formulas
        schedule_pressure = min(
            100,
            round(deadline_cut * 1.6 + team_cut * 0.9 + (user_growth - 1.0) * 4.0 + (100.0 - api_availability) * 1.5)
        )
        budget_pressure = min(
            100,
            round(budget_cut * 1.3 + (extra_cost / 1000.0) * 2.0 + (user_growth - 1.0) * 5.0 + team_cut * 0.3)
        )

        schedule_pressure = max(0, int(schedule_pressure))
        budget_pressure = max(0, int(budget_pressure))

        affected_milestones: List[str] = []
        if deadline_cut > 5 or team_cut > 20:
            affected_milestones.append("Pilot launch milestone")
        if deadline_cut > 12 or schedule_pressure > 55:
            affected_milestones.append("End-to-end load testing completion")
        if budget_cut > 15 or budget_pressure > 50:
            affected_milestones.append("Second canteen partner onboarding")
        if api_availability < 98:
            affected_milestones.append("Payment integration sign-off & security review")

        new_risks: List[str] = []
        if user_growth >= 2.5:
            new_risks.append("Peak-hour concurrency exceeds database connection pool capacity")
        if api_availability < 99:
            new_risks.append("Payment gateway timeout frequency spikes during rush hour")
        if team_cut >= 25:
            new_risks.append("Critical knowledge silo: deploy script maintained by single engineer")
        if budget_cut >= 20:
            new_risks.append("Automated test coverage cut from sprint scope")
        if extra_cost > 5000:
            new_risks.append("Project contingency reserve completely exhausted")

        mitigations: List[str] = []
        if schedule_pressure > 40:
            mitigations.append("Defer non-essential features (e.g., dish reviews, favorites list) to v1.1")
        if api_availability < 99:
            mitigations.append("Prioritize payment failure retry queue and pending verification state")
        if user_growth >= 2.5:
            mitigations.append("Implement time-slot order throttling and rate-limiting per student")
        if budget_pressure > 40:
            mitigations.append("Negotiate bulk payment processing rates; switch SMS notifications to push/email fallback")
        if not mitigations:
            mitigations.append("Current project plan has sufficient buffer for the specified scenario conditions.")

        assumptions_used = [
            "Formula: schedule_pressure = min(100, deadlineCut * 1.6 + teamCut * 0.9 + (userGrowth - 1) * 4 + (100 - apiAvailability) * 1.5)",
            "Formula: budget_pressure = min(100, budgetCut * 1.3 + (extraCost / 1000) * 2 + (userGrowth - 1) * 5 + teamCut * 0.3)",
            "Model is an illustrative heuristic estimate; real impact may vary depending on code modularity and architecture slack."
        ]

        return {
            "schedulePressure": schedule_pressure,
            "budgetPressure": budget_pressure,
            "affectedMilestones": affected_milestones,
            "newRisks": new_risks,
            "mitigations": mitigations,
            "assumptionsUsed": assumptions_used,
            "isDeterministic": True
        }
