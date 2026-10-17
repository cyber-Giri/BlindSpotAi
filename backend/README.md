# BlindSpot AI — Backend Service

BlindSpot AI is an AI-powered project blind spot detection platform. It analyzes project documents (PDF, DOCX, TXT), datasets (CSV, XLSX), and workflow descriptions to identify unstated assumptions, missing constraints, contradictions, hidden dependencies, and operational risks.

---

## 1. Quick Start (Windows PowerShell)

Follow these steps from the root of the project to set up and start the backend:

```powershell
# 1. Navigate to the backend directory
cd backend

# 2. Create Python virtual environment (Python 3.12, 3.14, or compatible)
py -m venv .venv

# 3. Activate the virtual environment
.\.venv\Scripts\Activate.ps1

# 4. Install dependencies
pip install --upgrade pip
pip install -r requirements.txt

# 5. Configure environment variables
Copy-Item .env.example .env
```

### Adding your Google Gemini API Key

Open `backend/.env` in your editor and provide your Gemini API key:

```env
GOOGLE_API_KEY=AIzaSy...your_actual_key_here...
GEMINI_MODEL=gemini-2.5-flash
DATABASE_URL=sqlite:///./blindspot.db
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173,http://127.0.0.1:3000
MAX_UPLOAD_MB=20
ENVIRONMENT=development
```

> **Note:** If no Gemini API key is provided, deterministic modules (dataset profiling, What-If simulation, ripple dependency graph, risk scoring) still operate completely. AI document and workflow endpoints will return a clean, actionable error advising that `GOOGLE_API_KEY` is required.

---

## 2. Running the Server

Start the FastAPI application with Uvicorn:

```powershell
uvicorn app.main:app --reload
```

- **API Base URL:** `http://127.0.0.1:8000`
- **Interactive Swagger Documentation:** `http://127.0.0.1:8000/docs`
- **Health Check Endpoint:** `http://127.0.0.1:8000/api/health`

---

## 3. Running the Test Suite

Run the full pytest suite:

```powershell
python -m pytest -v
```

All 12 automated unit and integration tests run with mocked AI responses to ensure 100% deterministic test coverage without requiring paid API credits.

---

## 4. API Endpoints Overview

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Health status and AI configuration check |
| `POST` | `/api/analyze` | Multi-file document risk & blind spot analysis (PDF, DOCX, TXT) |
| `POST` | `/api/analyze/dataset` | Statistical data-quality profiler & target leakage check (CSV, XLSX) |
| `POST` | `/api/analyze/workflow` | Step-by-step workflow bottleneck & failure mode analysis |
| `GET` | `/api/projects` | List all persisted projects |
| `POST` | `/api/projects` | Create a new project record |
| `GET` | `/api/projects/{project_id}` | Retrieve project details |
| `GET` | `/api/projects/{project_id}/findings` | Retrieve all detected findings for a project |
| `PATCH` | `/api/findings/{finding_id}` | Update finding status (Open, Investigating, Accepted, Resolved) |
| `POST` | `/api/findings/{finding_id}/comments`| Add discussion comment to a finding |
| `GET` | `/api/projects/{project_id}/assumptions` | Retrieve project assumptions ledger |
| `POST` | `/api/assumptions` | Create an assumption |
| `PATCH` | `/api/assumptions/{assumption_id}` | Update assumption verification status |
| `DELETE` | `/api/assumptions/{assumption_id}` | Delete an assumption |
| `GET` | `/api/projects/{project_id}/recommendations` | Retrieve actionable recommendations |
| `PATCH` | `/api/recommendations/{id}` | Update recommendation status |
| `GET` | `/api/projects/{project_id}/ripple` | Graph nodes, edges, and downstream trace for React Flow |
| `POST` | `/api/devils-advocate` | Adversarial challenge scenarios and probing questions |
| `POST` | `/api/simulate` | Deterministic What-If simulator |
| `POST` | `/api/projects/{project_id}/scenarios` | Persist a What-If scenario run |
| `GET` | `/api/projects/{project_id}/report` | Executive summary report and readiness score |

---

## 5. Risk Scoring Methodology

BlindSpot AI uses an independent, deterministic risk engine:

$$\text{risk\_score} = \text{likelihood} \times \text{impact}$$

- **Likelihood:** integer scale 1 to 5.
- **Impact:** integer scale 1 to 5 (or normalized from 1–10).
- **Maximum Risk Score:** 25.

### Configurable Severity Bands:
- **20–25:** Critical
- **12–19:** High
- **6–11:** Medium
- **1–5:** Low

> **Confidence:** Kept strictly separate from risk and severity. Confidence (0–100%) represents the empirical strength of the extracted document quotation or statistical proof.

---

## 6. Connecting to the Lovable Frontend

1. In the root directory, create or edit `.env` for Vite:

```env
VITE_API_BASE_URL=http://127.0.0.1:8000/api
```

2. The frontend integration helper is located at `src/lib/api-client.ts`. It provides typed methods (`analyzeDocumentsBackend`, `analyzeDatasetBackend`, `fetchRippleGraphBackend`, `simulateWhatIfBackend`, etc.) that directly match the backend API contract.
3. If deployed on Lovable or custom domain, update `ALLOWED_ORIGINS` in `backend/.env` with your frontend URL.
