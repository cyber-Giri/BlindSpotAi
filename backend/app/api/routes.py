from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Body
from sqlalchemy.orm import Session
from app.database import get_db
from app.config import get_settings
from app import models, schemas
from app.services.document_parser import DocumentParser
from app.services.dataset_analyzer import DatasetAnalyzer
from app.services.ai_analyzer import AIAnalyzer
from app.services.risk_engine import RiskEngine
from app.services.ripple_engine import RippleEngine
from app.services.simulation_engine import SimulationEngine
from app.services.devils_advocate import DevilsAdvocateService
from app.services.report_service import ReportService

router = APIRouter()
ai_analyzer = AIAnalyzer()
settings = get_settings()


# Helper to convert model finding to response schema format
def finding_to_dict(f: models.Finding) -> dict:
    return {
        "id": f.id,
        "projectId": f.project_id,
        "title": f.title,
        "description": f.description,
        "category": f.category,
        "severity": f.severity,
        "likelihood": f.likelihood,
        "impact": f.impact,
        "risk_score": f.risk_score,
        "confidence": f.confidence,
        "evidence": f.evidence,
        "recommendation": f.recommendation or "",
        "status": f.status,
        "detectedAt": f.detected_at.isoformat() if f.detected_at else "",
        "owner": f.owner,
        "overlooked": f.overlooked or "",
        "whyMatters": f.why_matters or "",
        "evidenceItems": f.evidence_items or [],
        "assumptionIds": f.assumption_ids or [],
        "consequences": f.consequences or [],
        "verificationTest": f.verification_test or "",
        "uncertainty": f.uncertainty or "",
        "nodeIds": f.node_ids or [],
        "comments": f.comments or [],
        "isDemo": f.is_demo
    }


def assumption_to_dict(a: models.Assumption) -> dict:
    return {
        "id": a.id,
        "projectId": a.project_id,
        "text": a.text,
        "category": a.category,
        "evidence": a.evidence or [],
        "confidence": a.confidence,
        "status": a.status,
        "riskIfFalse": a.risk_if_false,
        "owner": a.owner,
        "dueDate": a.due_date,
        "findingIds": a.finding_ids or [],
        "history": a.history or [],
        "updatedAt": a.updated_at.strftime("%Y-%m-%d") if a.updated_at else ""
    }


def recommendation_to_dict(r: models.Recommendation) -> dict:
    return {
        "id": r.id,
        "projectId": r.project_id,
        "findingId": r.finding_id,
        "action": r.action,
        "rationale": r.rationale or "",
        "evidence": r.evidence or "",
        "benefit": r.benefit or "",
        "effort": r.effort,
        "priority": r.priority,
        "dependencies": r.dependencies or [],
        "verification": r.verification or "",
        "status": r.status,
        "owner": r.owner,
        "dueDate": r.due_date
    }


# --- 1. Health ---

@router.get("/health", response_model=schemas.HealthResponse)
def health_check():
    return {
        "status": "healthy",
        "version": settings.VERSION,
        "ai_configured": ai_analyzer.is_configured(),
        "ai_model": settings.GEMINI_MODEL,
        "database": "sqlite"
    }


# --- 2. Projects ---

@router.get("/projects", response_model=List[schemas.ProjectResponse])
def get_projects(db: Session = Depends(get_db)):
    projects = db.query(models.Project).all()
    return [
        {
            "id": p.id,
            "name": p.name,
            "description": p.description,
            "createdAt": p.created_at.isoformat() if p.created_at else "",
            "updatedAt": p.updated_at.isoformat() if p.updated_at else ""
        }
        for p in projects
    ]


@router.post("/projects", response_model=schemas.ProjectResponse)
def create_project(data: schemas.ProjectCreate, db: Session = Depends(get_db)):
    proj = models.Project(name=data.name, description=data.description)
    db.add(proj)
    db.commit()
    db.refresh(proj)
    return {
        "id": proj.id,
        "name": proj.name,
        "description": proj.description,
        "createdAt": proj.created_at.isoformat(),
        "updatedAt": proj.updated_at.isoformat()
    }


@router.get("/projects/{project_id}")
def get_project(project_id: str, db: Session = Depends(get_db)):
    proj = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
    return {
        "id": proj.id,
        "name": proj.name,
        "description": proj.description,
        "createdAt": proj.created_at.isoformat() if proj.created_at else "",
        "updatedAt": proj.updated_at.isoformat() if proj.updated_at else ""
    }


# --- 3. Document Analysis ---

@router.post("/analyze")
async def analyze_documents(
    files: List[UploadFile] = File(...),
    projectName: Optional[str] = Form(None),
    projectDescription: Optional[str] = Form(None),
    depth: Optional[str] = Form("Standard"),
    focusAreas: Optional[str] = Form(None),
    riskSensitivity: Optional[str] = Form("Balanced"),
    db: Session = Depends(get_db)
):
    if not files:
        raise HTTPException(status_code=400, detail="At least one document must be uploaded.")

    # 1. Parse documents
    parsed_docs = []
    for f in files:
        parsed = await DocumentParser.parse_file(f)
        parsed_docs.append(parsed)

    # 2. Check AI configuration
    if not ai_analyzer.is_configured():
        raise HTTPException(
            status_code=503,
            detail="AI Provider is not configured. Please set the GOOGLE_API_KEY environment variable in backend/.env to run live AI analysis."
        )

    # 3. Focus areas list
    areas_list = [a.strip() for a in focusAreas.split(",")] if focusAreas else []

    # 4. Run AI analysis
    ai_result = await ai_analyzer.analyze_documents(
        documents=parsed_docs,
        project_name=projectName,
        project_description=projectDescription,
        depth=depth or "Standard",
        focus_areas=areas_list,
        risk_sensitivity=riskSensitivity or "Balanced"
    )

    # 5. Persist project & findings
    proj = models.Project(
        name=projectName or f"Project-{datetime.utcnow().strftime('%Y%m%d-%H%M')}",
        description=projectDescription or f"Analysis of {len(files)} uploaded document(s)."
    )
    db.add(proj)
    db.commit()
    db.refresh(proj)

    analysis_record = models.Analysis(
        project_id=proj.id,
        analysis_type="documents",
        depth=depth or "Standard",
        areas_of_concern=areas_list,
        risk_sensitivity=riskSensitivity or "Balanced",
        source_files=[{"filename": d["filename"], "chars": d["char_count"]} for d in parsed_docs],
        raw_summary=ai_result.get("raw_summary")
    )
    db.add(analysis_record)

    saved_findings = []
    for f_data in ai_result.get("findings", []):
        l = f_data.get("likelihood", 3)
        imp = f_data.get("impact", 5)
        conf = f_data.get("confidence", 70)
        calc = RiskEngine.evaluate_finding(l, imp, conf)
        
        finding = models.Finding(
            project_id=proj.id,
            title=f_data["title"],
            description=f_data["description"],
            category=f_data.get("category", "Missing Requirement"),
            severity=f_data.get("severity") or calc["severity"],
            likelihood=l,
            impact=imp,
            risk_score=f_data.get("risk_score") or calc["risk_score"],
            confidence=conf,
            evidence=f_data.get("evidence", "Available"),
            recommendation=f_data.get("recommendation", ""),
            status="Open",
            overlooked=f_data.get("overlooked", ""),
            why_matters=f_data.get("whyMatters", ""),
            evidence_items=f_data.get("evidenceItems", []),
            consequences=f_data.get("consequences", []),
            verification_test=f_data.get("verificationTest", ""),
            uncertainty=f_data.get("uncertainty", ""),
            node_ids=f_data.get("nodeIds", []),
            is_demo=False
        )
        db.add(finding)
        saved_findings.append(finding)

    saved_assumptions = []
    for a_data in ai_result.get("assumptions", []):
        assumption = models.Assumption(
            project_id=proj.id,
            text=a_data["text"],
            category=a_data.get("category", "Technical"),
            evidence=a_data.get("evidence", []),
            confidence=a_data.get("confidence", 70),
            status="Unverified",
            risk_if_false=a_data.get("riskIfFalse", "High"),
            owner="Unassigned"
        )
        db.add(assumption)
        saved_assumptions.append(assumption)

    db.commit()

    return {
        "projectId": proj.id,
        "projectName": proj.name,
        "findings": [finding_to_dict(f) for f in saved_findings],
        "assumptions": [assumption_to_dict(a) for a in saved_assumptions],
        "summary": ai_result.get("raw_summary")
    }


# --- 4. Dataset Analysis ---

@router.post("/analyze/dataset")
async def analyze_dataset(
    file: UploadFile = File(...),
    datasetPurpose: Optional[str] = Form(None),
    importantColumns: Optional[str] = Form(None),
    targetColumn: Optional[str] = Form(None),
    missingTolerancePct: Optional[float] = Form(5.0),
    projectName: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    profile = await DatasetAnalyzer.analyze(
        file=file,
        dataset_purpose=datasetPurpose,
        important_columns=importantColumns,
        target_column=targetColumn,
        missing_tolerance_pct=missingTolerancePct or 5.0
    )

    # Persist as project and findings
    proj = models.Project(
        name=projectName or f"Dataset: {profile['fileName']}",
        description=datasetPurpose or f"Statistical data quality profile of {profile['fileName']}"
    )
    db.add(proj)
    db.commit()
    db.refresh(proj)

    saved_findings = []
    for f_data in profile["findings"]:
        f_model = models.Finding(
            project_id=proj.id,
            title=f_data["title"],
            description=f_data["description"],
            category=f_data["category"],
            severity=f_data["severity"],
            likelihood=f_data["likelihood"],
            impact=f_data["impact"],
            risk_score=RiskEngine.calculate_risk_score(f_data["likelihood"], f_data["impact"]),
            confidence=f_data["confidence"],
            evidence=f_data["evidence"],
            recommendation=f_data["recommendation"],
            status="Open",
            overlooked=f_data.get("overlooked", ""),
            why_matters=f_data.get("whyMatters", ""),
            evidence_items=f_data.get("evidenceItems", []),
            consequences=f_data.get("consequences", []),
            verification_test=f_data.get("verificationTest", "")
        )
        db.add(f_model)
        saved_findings.append(f_model)

    db.commit()

    profile["projectId"] = proj.id
    profile["findings"] = [finding_to_dict(f) for f in saved_findings]
    return profile


# --- 5. Workflow Analysis ---

@router.post("/analyze/workflow")
async def analyze_workflow(
    request: schemas.WorkflowAnalysisRequest,
    db: Session = Depends(get_db)
):
    if not request.workflow or len(request.workflow.strip()) < 10:
        raise HTTPException(status_code=400, detail="Workflow description is too short (minimum 10 characters).")

    if not ai_analyzer.is_configured():
        raise HTTPException(
            status_code=503,
            detail="AI Provider is not configured. Please set the GOOGLE_API_KEY environment variable in backend/.env to run live workflow analysis."
        )

    ai_result = await ai_analyzer.analyze_workflow_text(
        workflow_text=request.workflow,
        project_name="Workflow Analysis"
    )

    # Persist project if requested
    proj_id = request.projectId
    if not proj_id:
        proj = models.Project(
            name="Workflow Analysis Project",
            description=request.workflow[:200]
        )
        db.add(proj)
        db.commit()
        db.refresh(proj)
        proj_id = proj.id

    saved_findings = []
    for f_data in ai_result.get("findings", []):
        f_model = models.Finding(
            project_id=proj_id,
            title=f_data["title"],
            description=f_data["description"],
            category=f_data["category"],
            severity=f_data["severity"],
            likelihood=f_data["likelihood"],
            impact=f_data["impact"],
            risk_score=f_data.get("risk_score", 15),
            confidence=f_data["confidence"],
            evidence=f_data["evidence"],
            recommendation=f_data["recommendation"],
            status="Open",
            overlooked=f_data.get("overlooked", ""),
            why_matters=f_data.get("whyMatters", ""),
            evidence_items=f_data.get("evidenceItems", []),
            consequences=f_data.get("consequences", []),
            verification_test=f_data.get("verificationTest", "")
        )
        db.add(f_model)
        saved_findings.append(f_model)

    db.commit()

    return {
        "projectId": proj_id,
        "findings": [finding_to_dict(f) for f in saved_findings],
        "assumptions": ai_result.get("assumptions", [])
    }


# --- 6. Findings CRUD & Status Updates ---

@router.get("/projects/{project_id}/findings")
def get_project_findings(project_id: str, db: Session = Depends(get_db)):
    proj = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
    findings = db.query(models.Finding).filter(models.Finding.project_id == project_id).all()
    return [finding_to_dict(f) for f in findings]


@router.patch("/findings/{finding_id}")
def update_finding(
    finding_id: str,
    patch: schemas.FindingUpdate,
    db: Session = Depends(get_db)
):
    finding = db.query(models.Finding).filter(models.Finding.id == finding_id).first()
    if not finding:
        raise HTTPException(status_code=404, detail="Finding not found")

    patch_dict = patch.model_dump(exclude_unset=True)
    for field, val in patch_dict.items():
        if field == "whyMatters":
            finding.why_matters = val
        elif field == "verificationTest":
            finding.verification_test = val
        elif field == "evidenceItems":
            finding.evidence_items = [e.model_dump() if hasattr(e, "model_dump") else e for e in val]
        elif hasattr(finding, field):
            setattr(finding, field, val)

    # Recalculate score if likelihood or impact changed
    if "likelihood" in patch_dict or "impact" in patch_dict:
        eval_res = RiskEngine.evaluate_finding(finding.likelihood, finding.impact, finding.confidence)
        finding.risk_score = eval_res["risk_score"]
        if "severity" not in patch_dict:
            finding.severity = eval_res["severity"]

    db.commit()
    db.refresh(finding)
    return finding_to_dict(finding)


@router.post("/findings/{finding_id}/comments")
def add_finding_comment(
    finding_id: str,
    text: str = Body(..., embed=True),
    author: Optional[str] = Body("User", embed=True),
    db: Session = Depends(get_db)
):
    finding = db.query(models.Finding).filter(models.Finding.id == finding_id).first()
    if not finding:
        raise HTTPException(status_code=404, detail="Finding not found")

    comments = list(finding.comments or [])
    new_comment = {
        "id": models.generate_uuid()[:8],
        "author": author or "User",
        "text": text,
        "at": datetime.utcnow().isoformat()
    }
    comments.append(new_comment)
    finding.comments = comments
    db.commit()
    return new_comment


# --- 7. Assumptions CRUD ---

@router.get("/projects/{project_id}/assumptions")
def get_project_assumptions(project_id: str, db: Session = Depends(get_db)):
    proj = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
    assumptions = db.query(models.Assumption).filter(models.Assumption.project_id == project_id).all()
    return [assumption_to_dict(a) for a in assumptions]


@router.post("/assumptions")
def create_assumption(
    data: schemas.AssumptionCreate,
    db: Session = Depends(get_db)
):
    if not data.projectId:
        raise HTTPException(status_code=400, detail="projectId is required")
    proj = db.query(models.Project).filter(models.Project.id == data.projectId).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")

    assumption = models.Assumption(
        project_id=data.projectId,
        text=data.text,
        category=data.category,
        evidence=data.evidence,
        confidence=data.confidence,
        status=data.status,
        risk_if_false=data.riskIfFalse,
        owner=data.owner,
        due_date=data.dueDate,
        finding_ids=data.findingIds,
        history=[{"status": data.status, "at": datetime.utcnow().strftime("%Y-%m-%d"), "note": "Created"}]
    )
    db.add(assumption)
    db.commit()
    db.refresh(assumption)
    return assumption_to_dict(assumption)


@router.patch("/assumptions/{assumption_id}")
def update_assumption(
    assumption_id: str,
    patch: schemas.AssumptionUpdate,
    db: Session = Depends(get_db)
):
    assumption = db.query(models.Assumption).filter(models.Assumption.id == assumption_id).first()
    if not assumption:
        raise HTTPException(status_code=404, detail="Assumption not found")

    patch_dict = patch.model_dump(exclude_unset=True)
    if "status" in patch_dict and patch_dict["status"] != assumption.status:
        hist = list(assumption.history or [])
        hist.append({
            "status": patch_dict["status"],
            "at": datetime.utcnow().strftime("%Y-%m-%d"),
            "note": f"Status updated to {patch_dict['status']}"
        })
        assumption.history = hist

    for field, val in patch_dict.items():
        if field == "riskIfFalse":
            assumption.risk_if_false = val
        elif field == "dueDate":
            assumption.due_date = val
        elif field == "findingIds":
            assumption.finding_ids = val
        elif hasattr(assumption, field):
            setattr(assumption, field, val)

    assumption.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(assumption)
    return assumption_to_dict(assumption)


@router.delete("/assumptions/{assumption_id}")
def delete_assumption(assumption_id: str, db: Session = Depends(get_db)):
    assumption = db.query(models.Assumption).filter(models.Assumption.id == assumption_id).first()
    if not assumption:
        raise HTTPException(status_code=404, detail="Assumption not found")
    db.delete(assumption)
    db.commit()
    return {"status": "deleted", "id": assumption_id}


# --- 8. Recommendations CRUD ---

@router.get("/projects/{project_id}/recommendations")
def get_project_recommendations(project_id: str, db: Session = Depends(get_db)):
    recs = db.query(models.Recommendation).filter(models.Recommendation.project_id == project_id).all()
    return [recommendation_to_dict(r) for r in recs]


@router.patch("/recommendations/{recommendation_id}")
def update_recommendation(
    recommendation_id: str,
    patch: schemas.RecommendationUpdate,
    db: Session = Depends(get_db)
):
    rec = db.query(models.Recommendation).filter(models.Recommendation.id == recommendation_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Recommendation not found")

    patch_dict = patch.model_dump(exclude_unset=True)
    for field, val in patch_dict.items():
        if field == "dueDate":
            rec.due_date = val
        elif hasattr(rec, field):
            setattr(rec, field, val)

    db.commit()
    db.refresh(rec)
    return recommendation_to_dict(rec)


# --- 9. Ripple Graph ---

@router.get("/projects/{project_id}/ripple", response_model=schemas.RippleGraphResponse)
def get_project_ripple(project_id: str, db: Session = Depends(get_db)):
    proj = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")

    findings = db.query(models.Finding).filter(models.Finding.project_id == project_id).all()
    assumptions = db.query(models.Assumption).filter(models.Assumption.project_id == project_id).all()

    graph = RippleEngine.get_project_graph(findings, assumptions)
    return graph


# --- 10. Devil's Advocate ---

@router.post("/devils-advocate", response_model=schemas.DevilsAdvocateResponse)
def get_devils_advocate_challenges(
    request: schemas.DevilsAdvocateRequest,
    db: Session = Depends(get_db)
):
    project_findings = []
    if request.projectId:
        project_findings = db.query(models.Finding).filter(models.Finding.project_id == request.projectId).all()

    challenges = DevilsAdvocateService.generate_challenges(
        scenario_type=request.scenarioType,
        custom_scenario=request.customScenario,
        project_findings=project_findings
    )
    return challenges


# --- 11. What-If Simulator ---

@router.post("/simulate", response_model=schemas.WhatIfResult)
def simulate_scenario(inputs: schemas.WhatIfInputs):
    result = SimulationEngine.simulate(inputs.model_dump())
    return result


@router.post("/projects/{project_id}/scenarios", response_model=schemas.SavedScenarioResponse)
def save_scenario(
    project_id: str,
    name: str = Body(..., embed=True),
    inputs: schemas.WhatIfInputs = Body(...),
    db: Session = Depends(get_db)
):
    proj = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")

    calc_result = SimulationEngine.simulate(inputs.model_dump())
    scenario = models.Scenario(
        project_id=project_id,
        name=name,
        inputs=inputs.model_dump(),
        result=calc_result
    )
    db.add(scenario)
    db.commit()
    db.refresh(scenario)

    return {
        "id": scenario.id,
        "name": scenario.name,
        "inputs": scenario.inputs,
        "result": scenario.result,
        "at": scenario.created_at.strftime("%Y-%m-%d %H:%M")
    }


# --- 12. Reports ---

@router.get("/projects/{project_id}/report")
def get_project_report(project_id: str, db: Session = Depends(get_db)):
    proj = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")

    findings = db.query(models.Finding).filter(models.Finding.project_id == project_id).all()
    assumptions = db.query(models.Assumption).filter(models.Assumption.project_id == project_id).all()
    recs = db.query(models.Recommendation).filter(models.Recommendation.project_id == project_id).all()

    summary = ReportService.generate_executive_summary(proj, findings, assumptions, recs)
    return summary
