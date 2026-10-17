import io
from typing import Dict, Any, List, Optional
import pandas as pd
import numpy as np
from fastapi import UploadFile, HTTPException
from app.services.risk_engine import RiskEngine


class DatasetAnalyzer:
    MAX_FILE_BYTES = 20 * 1024 * 1024

    @classmethod
    async def analyze(
        cls,
        file: UploadFile,
        dataset_purpose: Optional[str] = None,
        important_columns: Optional[str] = None,
        target_column: Optional[str] = None,
        missing_tolerance_pct: float = 5.0
    ) -> Dict[str, Any]:
        filename = file.filename or "dataset"
        content = await file.read()
        
        if len(content) == 0:
            raise HTTPException(status_code=400, detail=f"File '{filename}' is empty.")
        if len(content) > cls.MAX_FILE_BYTES:
            raise HTTPException(status_code=400, detail=f"File exceeds maximum {cls.MAX_FILE_BYTES // (1024*1024)}MB.")

        ext = filename.split(".")[-1].lower() if "." in filename else ""
        if ext not in ["csv", "xlsx"]:
            raise HTTPException(status_code=400, detail="Only CSV and XLSX files are supported for dataset analysis.")

        try:
            if ext == "csv":
                try:
                    df = pd.read_csv(io.BytesIO(content))
                except Exception:
                    df = pd.read_csv(io.BytesIO(content), encoding="latin-1")
            else:
                df = pd.read_excel(io.BytesIO(content))
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to parse dataset '{filename}': {str(e)}")

        row_count, col_count = df.shape
        columns = [str(c) for c in df.columns.tolist()]
        dtypes = {str(c): str(t) for c, t in df.dtypes.items()}

        # 1. Missing values
        missing_summary: Dict[str, Dict[str, Any]] = {}
        for col in df.columns:
            cnt = int(df[col].isna().sum())
            pct = round(float((cnt / row_count) * 100), 2) if row_count > 0 else 0.0
            missing_summary[str(col)] = {"count": cnt, "percentage": pct}

        # 2. Duplicate rows
        dup_count = int(df.duplicated().sum())

        # 3. Constant columns (single unique value)
        constant_cols = [str(c) for c in df.columns if df[c].nunique(dropna=False) <= 1]

        # 4. Outliers using IQR method for numerical columns
        outlier_summary: Dict[str, int] = {}
        numeric_cols = df.select_dtypes(include=[np.number]).columns
        for col in numeric_cols:
            series = df[col].dropna()
            if len(series) > 4:
                q25 = series.quantile(0.25)
                q75 = series.quantile(0.75)
                iqr = q75 - q25
                if iqr > 0:
                    lower_bound = q25 - 1.5 * iqr
                    upper_bound = q75 + 1.5 * iqr
                    outliers = int(((series < lower_bound) | (series > upper_bound)).sum())
                    if outliers > 0:
                        outlier_summary[str(col)] = outliers

        # 5. Potential target leakage check (heuristic pattern)
        leakage_risks: List[str] = []
        if target_column and target_column in df.columns:
            # Check correlations with numeric target or high association
            for col in numeric_cols:
                if col != target_column:
                    corr = df[[col, target_column]].dropna().corr().iloc[0, 1]
                    if abs(corr) > 0.95:
                        leakage_risks.append(
                            f"Column '{col}' has extreme statistical correlation ({corr:.2f}) with target '{target_column}', indicating potential target leakage or post-event feature."
                        )

        # Build structured findings
        findings: List[Dict[str, Any]] = []

        # Missing values findings
        for col, stats in missing_summary.items():
            if stats["percentage"] > missing_tolerance_pct:
                severity = "Critical" if stats["percentage"] > 25 else "High" if stats["percentage"] > 10 else "Medium"
                score_info = RiskEngine.evaluate_finding(
                    likelihood=4 if stats["percentage"] > 20 else 3,
                    impact=8 if stats["percentage"] > 20 else 5,
                    confidence=95
                )
                findings.append({
                    "title": f"Excessive missing values in column '{col}'",
                    "description": f"Column '{col}' has {stats['count']} missing entries ({stats['percentage']}% of dataset), exceeding the tolerance threshold of {missing_tolerance_pct}%.",
                    "category": "Data Quality Issue",
                    "severity": score_info["severity"],
                    "likelihood": 4 if stats["percentage"] > 20 else 3,
                    "impact": 8 if stats["percentage"] > 20 else 5,
                    "confidence": 95,
                    "evidence": "Available",
                    "recommendation": f"Verify whether '{col}' values are missing at random or due to ingestion bugs, and define an imputation or rejection policy.",
                    "status": "Open",
                    "overlooked": f"Data intake pipeline allows incomplete '{col}' records without fallback validation.",
                    "whyMatters": "Downstream business logic, pricing computations, or machine learning models may fail or introduce bias.",
                    "evidenceItems": [{
                        "source": filename,
                        "passage": f"Calculated: {stats['count']} nulls out of {row_count} rows ({stats['percentage']}%) in column '{col}'.",
                        "origin": "uploaded-document"
                    }],
                    "consequences": [f"Downstream service exceptions when handling {col}", "Inaccurate analytics reporting"],
                    "verificationTest": f"Check upstream database constraints for {col} not-null rule."
                })

        # Duplicate rows finding
        if dup_count > 0:
            dup_pct = round((dup_count / row_count) * 100, 2)
            findings.append({
                "title": f"Duplicate records detected ({dup_count} rows)",
                "description": f"Found {dup_count} duplicate rows ({dup_pct}% of dataset). Duplicate records skew aggregate counts and may result in multiple processing of identical orders.",
                "category": "Data Quality Issue",
                "severity": "High" if dup_pct > 5 else "Medium",
                "likelihood": 4,
                "impact": 6,
                "confidence": 95,
                "evidence": "Available",
                "recommendation": "Inspect ingestion pipeline for missing unique primary keys or idempotency token enforcement.",
                "status": "Open",
                "overlooked": "Idempotent ingestion and unique constraints were not enforced prior to dataset generation.",
                "whyMatters": "Duplicate data skews reporting, inflates metrics, and risks duplicate physical fulfillment.",
                "evidenceItems": [{
                    "source": filename,
                    "passage": f"Exact match across all columns found on {dup_count} rows ({dup_pct}%).",
                    "origin": "uploaded-document"
                }],
                "consequences": ["Double processing", "Distorted business metrics"],
                "verificationTest": "Add unique index or deduplication step at intake."
            })

        # Constant columns finding
        for ccol in constant_cols:
            val = df[ccol].iloc[0] if row_count > 0 else "None"
            findings.append({
                "title": f"Zero-variance column '{ccol}'",
                "description": f"Column '{ccol}' has constant value '{val}' across all {row_count} rows. It adds no discriminatory information.",
                "category": "Data Quality Issue",
                "severity": "Low",
                "likelihood": 2,
                "impact": 3,
                "confidence": 90,
                "evidence": "Available",
                "recommendation": f"Confirm if '{ccol}' is deprecated or redundant metadata that should be removed from payload.",
                "status": "Open",
                "whyMatters": "Unnecessary storage overhead and potential dead configuration code.",
                "evidenceItems": [{
                    "source": filename,
                    "passage": f"Column '{ccol}' has 1 unique value across {row_count} rows.",
                    "origin": "uploaded-document"
                }]
            })

        # Outliers finding (distinguishing statistical anomaly from verified error)
        for col, out_cnt in outlier_summary.items():
            out_pct = round((out_cnt / row_count) * 100, 2)
            findings.append({
                "title": f"Statistical outliers in numerical column '{col}' ({out_cnt} rows)",
                "description": f"Found {out_cnt} values ({out_pct}%) outside 1.5×IQR boundary in '{col}'. Note: Statistical anomalies are not necessarily errors, but warrant domain verification.",
                "category": "Data Quality Issue",
                "severity": "Medium",
                "likelihood": 3,
                "impact": 5,
                "confidence": 85,
                "evidence": "Available",
                "recommendation": f"Audit extreme high/low values in '{col}' against valid physical ranges (e.g. valid menu pricing or order quantities).",
                "status": "Investigating",
                "whyMatters": "Extreme values may corrupt averages or indicate currency unit confusion.",
                "evidenceItems": [{
                    "source": filename,
                    "passage": f"Outlier calculation: {out_cnt} values beyond IQR bounds for column '{col}'.",
                    "origin": "uploaded-document"
                }]
            })

        # Target leakage finding
        for leak in leakage_risks:
            findings.append({
                "title": f"Potential target leakage pattern detected",
                "description": leak,
                "category": "Data Quality Issue",
                "severity": "High",
                "likelihood": 4,
                "impact": 8,
                "confidence": 80,
                "evidence": "Partial",
                "recommendation": "Review feature calculation timestamp to confirm whether feature is known strictly prior to target event.",
                "status": "Open",
                "whyMatters": "Features that leak target information will cause dramatic performance degradation in production.",
                "evidenceItems": [{
                    "source": filename,
                    "passage": leak,
                    "origin": "uploaded-document"
                }]
            })

        return {
            "fileName": filename,
            "rowCount": row_count,
            "columnCount": col_count,
            "columns": columns,
            "dtypes": dtypes,
            "missingSummary": missing_summary,
            "duplicateRowsCount": dup_count,
            "constantColumns": constant_cols,
            "outlierSummary": outlier_summary,
            "targetLeakageRisks": leakage_risks,
            "findings": findings
        }
