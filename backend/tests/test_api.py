from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_and_benchmarks():
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}

    b = client.get("/api/v1/benchmarks")
    assert b.status_code == 200
    assert len(b.json()) >= 8


def test_simulate_baseline_and_marginal_endpoints():
    payload = {
        "process": {
            "name": "Liquidación Cirugía",
            "category": "liquidacion",
            "complexity": "alta",
            "expected_monthly_demand": 598,
            "avg_time_minutes": 70,
            "working_days_per_month": 22,
            "effective_hours_per_day": 8,
            "base_inefficiency_rate": 0.1,
        }
    }
    r1 = client.post("/api/v1/simulate/baseline", json=payload)
    assert r1.status_code == 200
    assert r1.json()["required_resources_rounded"] >= 1

    r2 = client.post(
        "/api/v1/simulate/marginal",
        json={
            "process": payload["process"],
            "resource": {"resource_type": "human", "available_hours_per_day": 8, "available_days_per_month": 22},
            "max_staff": 8,
        },
    )
    assert r2.status_code == 200
    assert len(r2.json()["curve"]) == 8
