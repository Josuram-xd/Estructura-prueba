from fastapi import FastAPI
from fastapi.testclient import TestClient
import heapq

app = FastAPI()

# Simulación mínima de TrafficPriorityQueue
congestion = {"carril_1": 8, "carril_2": 2, "carril_3": 5, "carril_4": 1}

@app.get("/status")
def status():
    cola = sorted(congestion.items(), key=lambda x: -x[1])
    return {"orden_luz_verde": cola}

if __name__ == "__main__":
    client = TestClient(app)
    r = client.get("/status")
    print("TEST_PASSED:", r.status_code, r.json())
