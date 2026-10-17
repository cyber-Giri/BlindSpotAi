import io
import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from app.main import app
import pymupdf

client = TestClient(app)


def create_dummy_pdf(text: str) -> bytes:
    doc = pymupdf.open()
    page = doc.new_page()
    page.insert_text((50, 72), text)
    pdf_bytes = doc.tobytes()
    doc.close()
    return pdf_bytes


def test_empty_document_upload_rejected():
    files = [("files", ("empty.txt", b"", "text/plain"))]
    response = client.post("/api/analyze", files=files)
    assert response.status_code == 400
    assert "empty" in response.json()["detail"].lower()


def test_invalid_file_extension_rejected():
    files = [("files", ("script.sh", b"echo 'malicious'", "application/x-sh"))]
    response = client.post("/api/analyze", files=files)
    assert response.status_code == 400
    assert "unsupported" in response.json()["detail"].lower()


def test_ai_provider_not_configured_error():
    # Patch settings to have empty GOOGLE_API_KEY
    with patch("app.services.ai_analyzer.get_settings") as mock_settings:
        mock_s = MagicMock()
        mock_s.GOOGLE_API_KEY = ""
        mock_settings.return_value = mock_s
        
        files = [("files", ("valid.txt", b"Valid project document content.", "text/plain"))]
        response = client.post("/api/analyze", files=files)
        assert response.status_code == 503
        assert "not configured" in response.json()["detail"].lower()


def test_valid_document_analysis_with_mocked_ai():
    mock_ai_result = {
        "findings": [
            {
                "title": "Payment failure recovery is undefined",
                "description": "No behavior is specified for when payment times out.",
                "category": "Missing Requirement",
                "likelihood": 4,
                "impact": 10,
                "confidence": 88,
                "evidence": "Available",
                "recommendation": "Define retry and idempotent state rules.",
                "whyMatters": "Students may be charged without order fulfillment.",
                "evidenceItems": [{"source": "spec.pdf", "passage": "Redirects to provider.", "origin": "uploaded-document"}],
                "consequences": ["Double charges"]
            }
        ],
        "assumptions": [
            {
                "text": "Payment gateway SLA guarantees 99.9% uptime",
                "category": "Technical",
                "confidence": 65,
                "riskIfFalse": "Critical"
            }
        ],
        "raw_summary": "Analyzed 1 document."
    }

    pdf_bytes = create_dummy_pdf("Product Specification v1: Checkout redirects to payment provider.")

    with patch("app.api.routes.ai_analyzer.is_configured", return_value=True), \
         patch("app.api.routes.ai_analyzer.analyze_documents", return_value=mock_ai_result):
        
        files = [("files", ("spec.pdf", pdf_bytes, "application/pdf"))]
        data = {
            "projectName": "Campus Order System",
            "projectDescription": "Food ordering app",
            "depth": "Standard"
        }
        response = client.post("/api/analyze", files=files, data=data)
        assert response.status_code == 200
        res = response.json()
        assert "projectId" in res
        assert len(res["findings"]) == 1
        assert res["findings"][0]["title"] == "Payment failure recovery is undefined"
        assert res["findings"][0]["severity"] == "Critical"
        assert len(res["assumptions"]) == 1
