from typing import Dict, Any, List, Optional


class DevilsAdvocateService:
    """
    Adversarial challenge generator.
    Simulates stressful scenarios: budget cut, rush traffic, API outage, staff departures.
    """

    CHALLENGE_BANK: Dict[str, List[Dict[str, Any]]] = {
        "Sudden user growth": [
            {
                "question": "Can the database and kitchen queue handle 5× the expected peak lunch concurrency?",
                "why": "Lunch rush traffic is concentrated in a tight 90-minute window; slowdown is effectively an outage.",
                "impact": "Critical",
                "evidence": "None",
                "validation": "Conduct synthetic load test at 5× baseline concurrency."
            },
            {
                "question": "What happens when the third-party payment gateway hits its rate limit or quota?",
                "why": "Payment gateway quota errors manifest as failures with no fallback.",
                "impact": "Critical",
                "evidence": "Partial",
                "validation": "Verify payment provider quota tiers and simulate quota-exhaustion responses."
            },
            {
                "question": "Can physical canteen kitchens fulfill dishes at the rate orders are placed digitally?",
                "why": "Software scaling does not scale physical chef capacity; food quality and pickup queues degrade.",
                "impact": "High",
                "evidence": "Partial",
                "validation": "Pilot with per-slot order caps for one week."
            }
        ],
        "External API failure": [
            {
                "question": "What state is the order left in if the payment API times out mid-transaction?",
                "why": "Undefined recovery leads to double charges or unpaid food preparation.",
                "impact": "Critical",
                "evidence": "Available",
                "validation": "Inject 10-second timeout delays in gateway webhook staging."
            },
            {
                "question": "Does kitchen staff receive unpaid tickets if webhook delivery fails?",
                "why": "Results in food waste and lost revenue.",
                "impact": "High",
                "evidence": "Partial",
                "validation": "Trace order state in staging during complete gateway drop."
            },
            {
                "question": "Is there a fallback channel when push notifications fail or are blocked by OS battery savers?",
                "why": "Students will miss order readiness alerts and food will spoil on the counter.",
                "impact": "High",
                "evidence": "None",
                "validation": "Disable push provider in staging and verify in-app polling fallback."
            }
        ],
        "Budget reduction": [
            {
                "question": "Which features will be dropped first if engineering budget is reduced by 25%?",
                "why": "Without a pre-agreed cut list, teams cut automated testing and security hardening first.",
                "impact": "High",
                "evidence": "None",
                "validation": "Formalize priority ranking of backlog items with stakeholders."
            },
            {
                "question": "Are cloud hosting and notification egress costs modeled for monthly overrun risk?",
                "why": "Pay-per-SMS or auto-scaling container services can generate surprise bills.",
                "impact": "Medium",
                "evidence": "None",
                "validation": "Establish billing budget alerts and notification quota caps."
            }
        ],
        "Staff unavailability": [
            {
                "question": "Can another engineer safely deploy emergency hotfixes if the primary developer is unavailable?",
                "why": "Single points of human knowledge cause catastrophic launch-day delays.",
                "impact": "Critical",
                "evidence": "Partial",
                "validation": "Run a simulated production deploy conducted entirely by a secondary engineer."
            }
        ]
    }

    GENERIC_CHALLENGES: List[Dict[str, Any]] = [
        {
            "question": "Is the order cancellation and refund workflow operational before launch day?",
            "why": "Customer refund disputes occur on day one; manual refunds damage reputation and take hours.",
            "impact": "Critical",
            "evidence": "Available",
            "validation": "Test full refund cycle in staging with real bank sandbox."
        },
        {
            "question": "How are sold-out canteen items synced in real time to prevent invalid purchases?",
            "why": "Ordering unavailable dishes triggers angry cancellations during peak lunch rush.",
            "impact": "High",
            "evidence": "Partial",
            "validation": "Demonstrate instant inventory toggling from canteen staff tablet."
        },
        {
            "question": "What data is lost if the primary database is corrupted right now?",
            "why": "Backup and point-in-time recovery plans are rarely tested until after data loss.",
            "impact": "High",
            "evidence": "None",
            "validation": "Execute test restore of latest database snapshot to an isolated environment."
        }
    ]

    @classmethod
    def generate_challenges(
        cls,
        scenario_type: Optional[str] = None,
        custom_scenario: Optional[str] = None,
        project_findings: Optional[List[Any]] = None
    ) -> Dict[str, Any]:
        scenario = scenario_type or (f"Custom: {custom_scenario}" if custom_scenario else "General Stress Test")
        
        # Pick scenario specific questions or generic
        questions = list(cls.CHALLENGE_BANK.get(scenario_type or "", cls.GENERIC_CHALLENGES))

        # If project has findings, link or tailor finding IDs where relevant
        if project_findings:
            for q in questions:
                # Find matching finding title or category if any
                for f in project_findings:
                    f_id = getattr(f, "id", None) or f.get("id")
                    f_title = (getattr(f, "title", None) or f.get("title", "")).lower()
                    if "payment" in f_title and "payment" in q["question"].lower():
                        q["findingId"] = f_id
                    elif "peak" in f_title and "lunch" in q["question"].lower():
                        q["findingId"] = f_id

        return {
            "scenario": scenario,
            "challenges": questions,
            "explanation": f"Devil's advocate challenge questions configured for scenario: '{scenario}'."
        }
