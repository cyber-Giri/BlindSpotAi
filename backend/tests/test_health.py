import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_check():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "version" in data
    assert "ai_configured" in data
    assert data["database"] == "sqlite"


def test_root_endpoint():
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "message" in data
    assert data["docs"] == "/docs"
