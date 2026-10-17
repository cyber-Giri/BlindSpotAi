from typing import Dict, Any, Tuple


class RiskEngine:
    """
    Deterministic risk scoring engine.
    Likelihood scale: 1-5
    Impact scale: 1-10 (or 1-5, normalized to 1-25 max score)
    Confidence: 0-100 (strength of evidence, distinct from severity)
    """

    # Severity bands configurable in one place
    # Max score is 25 (or 50 if 5*10; we normalize to standard 1-25 score: likelihood * (impact / 2 or impact capped))
    SEVERITY_BANDS = [
        {"name": "Critical", "min_score": 20, "max_score": 25},
        {"name": "High", "min_score": 12, "max_score": 19},
        {"name": "Medium", "min_score": 6, "max_score": 11},
        {"name": "Low", "min_score": 1, "max_score": 5},
    ]

    @classmethod
    def calculate_risk_score(cls, likelihood: int, impact: int) -> int:
        """
        Calculates risk_score.
        likelihood: 1 to 5
        impact: 1 to 10 or 1 to 5.
        Normalized to 1-25.
        """
        clamped_l = max(1, min(5, likelihood))
        # If impact is provided on 1-10 scale (common in frontend), map to 1-5 for standard 25 score
        if impact > 5:
            norm_impact = max(1, min(5, round(impact / 2.0)))
        else:
            norm_impact = max(1, min(5, impact))
        
        score = clamped_l * norm_impact
        return max(1, min(25, score))

    @classmethod
    def determine_severity(cls, risk_score: int) -> str:
        """
        Maps a 1-25 risk score into a severity band.
        """
        for band in cls.SEVERITY_BANDS:
            if band["min_score"] <= risk_score <= band["max_score"]:
                return band["name"]
        if risk_score > 25:
            return "Critical"
        return "Low"

    @classmethod
    def evaluate_finding(cls, likelihood: int, impact: int, confidence: int) -> Dict[str, Any]:
        """
        Returns calculated risk_score, severity, and confidence clamped to 0-100.
        """
        score = cls.calculate_risk_score(likelihood, impact)
        severity = cls.determine_severity(score)
        clamped_conf = max(0, min(100, confidence))
        return {
            "risk_score": score,
            "severity": severity,
            "confidence": clamped_conf
        }
