import asyncio
import json
import random

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Simulación mínima de TrafficPriorityQueue
congestion = {"carril_1": 8, "carril_2": 2, "carril_3": 5, "carril_4": 1}


def compute_state():
    cola = sorted(congestion.items(), key=lambda x: -x[1])
    return {
        "congestion": congestion,
        "orden_luz_verde": cola,
        "luz_verde_actual": cola[0][0],
    }


@app.get("/status")
def status():
    return {"orden_luz_verde": sorted(congestion.items(), key=lambda x: -x[1])}


@app.websocket("/ws")
async def ws_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            for carril in congestion:
                congestion[carril] = random.randint(0, 15)
            await websocket.send_text(json.dumps(compute_state()))
            await asyncio.sleep(1.5)
    except WebSocketDisconnect:
        pass


# Smoke test original (Opción A del README de pruebas):
#   from fastapi.testclient import TestClient
#   client = TestClient(app)
#   r = client.get("/status")
#   print("TEST_PASSED:", r.status_code, r.json())

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8010)
