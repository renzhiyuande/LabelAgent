from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_health_uses_api_response():
    response = client.get("/health")
    assert response.status_code == 200
    body = response.json()
    assert body["code"] == "SUCCESS"
    assert body["traceId"]


def test_internal_token_required():
    response = client.get("/internal/health")
    assert response.status_code == 401
    assert response.json()["code"] == "INTERNAL_UNAUTHORIZED"

    ok = client.get("/internal/health", headers={"X-Internal-Token": "test-internal-token"})
    assert ok.status_code == 200
    assert ok.json()["data"]["scope"] == "internal"
