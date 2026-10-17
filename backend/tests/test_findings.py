import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_project_crud_and_finding_persistence():
    # 1. Create a project
    proj_resp = client.post("/api/projects", json={
        "name": "Persistence Test Project",
        "description": "Testing database persistence"
    })
    assert proj_resp.status_code == 200
    proj = proj_resp.json()
    proj_id = proj["id"]

    # 2. Add an assumption
    assump_resp = client.post("/api/assumptions", json={
        "projectId": proj_id,
        "text": "Campus network wifi is stable in all canteens",
        "category": "Technical",
        "confidence": 75,
        "status": "Unverified",
        "riskIfFalse": "Critical",
        "owner": "Network Team"
    })
    assert assump_resp.status_code == 200
    assump = assump_resp.json()
    assump_id = assump["id"]

    # 3. Update assumption status
    update_resp = client.patch(f"/api/assumptions/{assump_id}", json={
        "status": "Verified",
        "confidence": 90
    })
    assert update_resp.status_code == 200
    assert update_resp.json()["status"] == "Verified"
    assert len(update_resp.json()["history"]) > 1

    # 4. Fetch project assumptions
    list_assump = client.get(f"/api/projects/{proj_id}/assumptions")
    assert list_assump.status_code == 200
    assert len(list_assump.json()) == 1
    assert list_assump.json()[0]["status"] == "Verified"

    # 5. Non-existent project
    missing_resp = client.get("/api/projects/non-existent-id-xyz")
    assert missing_resp.status_code == 404
