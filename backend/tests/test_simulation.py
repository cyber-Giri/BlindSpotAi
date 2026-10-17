import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_simulation_consistency():
    inputs = {
        "budgetCut": 15.0,
        "deadlineCut": 8.0,
        "userGrowth": 2.5,
        "teamCut": 10.0,
        "apiAvailability": 98.5,
        "extraCost": 2000.0
    }
    # Run twice with the exact same inputs
    resp1 = client.post("/api/simulate", json=inputs)
    resp2 = client.post("/api/simulate", json=inputs)

    assert resp1.status_code == 200
    assert resp2.status_code == 200
    r1 = resp1.json()
    r2 = resp2.json()

    assert r1["schedulePressure"] == r2["schedulePressure"]
    assert r1["budgetPressure"] == r2["budgetPressure"]
    assert r1["affectedMilestones"] == r2["affectedMilestones"]
    assert r1["newRisks"] == r2["newRisks"]
    assert r1["mitigations"] == r2["mitigations"]
    assert r1["isDeterministic"] is True


def test_devils_advocate_generation():
    payload = {
        "scenarioType": "External API failure",
        "customScenario": None
    }
    resp = client.post("/api/devils-advocate", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert "challenges" in data
    assert len(data["challenges"]) > 0
    assert any("payment" in c["question"].lower() for c in data["challenges"])


def test_ripple_graph_endpoint():
    # 1. Create a project
    proj = client.post("/api/projects", json={"name": "Graph Test Project"}).json()
    p_id = proj["id"]

    resp = client.get(f"/api/projects/{p_id}/ripple")
    assert resp.status_code == 200
    graph = resp.json()
    assert "nodes" in graph
    assert "edges" in graph
    assert "downstreamTraces" in graph
    assert len(graph["nodes"]) > 0
    # Check trace from 'api' node
    assert "api" in graph["downstreamTraces"]
    assert "proc" in graph["downstreamTraces"]["api"]
