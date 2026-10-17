import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_dataset_analysis_csv():
    csv_content = (
        "item_id,price,canteen,allergens\n"
        "1,15.5,North Canteen,Nuts\n"
        "2,20.0,North Canteen,\n"
        "3,12.0,South Canteen,\n"
        "1,15.5,North Canteen,Nuts\n"  # Duplicate row
        "4,150.0,South Canteen,Dairy\n" # Outlier
    ).encode("utf-8")

    files = [("file", ("menu.csv", csv_content, "text/csv"))]
    data = {
        "datasetPurpose": "Menu items pricing",
        "missingTolerancePct": 10.0
    }
    response = client.post("/api/analyze/dataset", files=files, data=data)
    assert response.status_code == 200
    res = response.json()

    assert res["rowCount"] == 5
    assert res["columnCount"] == 4
    assert res["duplicateRowsCount"] == 1  # Successfully identified duplicate
    assert "allergens" in res["missingSummary"]
    assert res["missingSummary"]["allergens"]["count"] == 2
    assert len(res["findings"]) > 0

    # Ensure findings exist for duplicate records and missing values
    titles = [f["title"] for f in res["findings"]]
    assert any("duplicate" in t.lower() for t in titles)
    assert any("allergens" in t.lower() for t in titles)


def test_empty_dataset_rejected():
    files = [("file", ("empty.csv", b"", "text/csv"))]
    response = client.post("/api/analyze/dataset", files=files)
    assert response.status_code == 400
