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

# Red vial: cuadrícula 2x2 de 4 intersecciones dobles (carretera de doble sentido
# entre cada par de nodos vecinos). Cada intersección tiene semáforo de 2 fases
# (eje N-S / eje E-O) con transición verde -> amarillo -> "calculando" -> verde.
# Durante "calculando" el backend decide el próximo eje y calcula su tiempo de
# verde según la cola acumulada ANTES de soltar los carros (sección 4.x del
# stack propuesto: TrafficPriorityQueue).

NEIGHBORS = {
    "N1": {"E": "N2", "S": "N3"},
    "N2": {"W": "N1", "S": "N4"},
    "N3": {"N": "N1", "E": "N4"},
    "N4": {"N": "N2", "W": "N3"},
}
DIRS = ("N", "S", "E", "W")
OPPOSITE = {"N": "S", "S": "N", "E": "W", "W": "E"}
AXIS_DIRS = {"NS": ("N", "S"), "EW": ("E", "W")}

YELLOW_TICKS = 2
CALC_TICKS = 1
MIN_GREEN = 3
MAX_GREEN = 8
FLOW_RATE = 4
MAX_QUEUE = 20


def external_dirs(nodo):
    return [d for d in DIRS if d not in NEIGHBORS[nodo]]


def propagate_target(nodo, direccion):
    """A dónde va un carro liberado desde la cola `direccion` de `nodo`."""
    destino = NEIGHBORS[nodo].get(OPPOSITE[direccion])
    return (destino, direccion) if destino else (None, None)


def clamp(v, lo, hi):
    return max(lo, min(hi, v))


class Interseccion:
    def __init__(self, nodo):
        self.nodo = nodo
        self.fase = "NS"
        self.subfase = "verde"
        self.timer = MIN_GREEN
        self.colas = {d: 0 for d in DIRS}
        self._pendiente_fase = None
        self._pendiente_verde = None

    def liberar(self, buffer_entrada):
        if self.subfase != "verde":
            return
        for d in AXIS_DIRS[self.fase]:
            liberados = min(self.colas[d], FLOW_RATE)
            self.colas[d] -= liberados
            destino, slot = propagate_target(self.nodo, d)
            if destino:
                buffer_entrada[destino][slot] += liberados

    def llegada_externa(self):
        for d in external_dirs(self.nodo):
            self.colas[d] = min(MAX_QUEUE, self.colas[d] + random.randint(0, 2))

    def avanzar_reloj(self):
        self.timer -= 1
        if self.timer > 0:
            return

        if self.subfase == "verde":
            self.subfase = "amarillo"
            self.timer = YELLOW_TICKS
        elif self.subfase == "amarillo":
            # Momento de cálculo: se decide el próximo eje y su verde ANTES
            # de que ningún carro se mueva en esa fase.
            self.subfase = "calculando"
            self.timer = CALC_TICKS
            proximo_eje = "EW" if self.fase == "NS" else "NS"
            total = sum(self.colas[d] for d in AXIS_DIRS[proximo_eje])
            self._pendiente_fase = proximo_eje
            self._pendiente_verde = clamp(MIN_GREEN + total // 4, MIN_GREEN, MAX_GREEN)
        elif self.subfase == "calculando":
            self.fase = self._pendiente_fase
            self.subfase = "verde"
            self.timer = self._pendiente_verde

    def to_dict(self):
        return {
            "fase": self.fase,
            "subfase": self.subfase,
            "restante": self.timer,
            "colas": dict(self.colas),
            "verdeCalculado": self._pendiente_verde if self.subfase == "calculando" else None,
        }


red = {nodo: Interseccion(nodo) for nodo in NEIGHBORS}
tick_num = 0


def avanzar_tick():
    global tick_num
    tick_num += 1

    buffer_entrada = {nodo: {d: 0 for d in DIRS} for nodo in red}

    for interseccion in red.values():
        interseccion.liberar(buffer_entrada)
        interseccion.llegada_externa()
        interseccion.avanzar_reloj()

    for nodo, entradas in buffer_entrada.items():
        colas = red[nodo].colas
        for d, cant in entradas.items():
            colas[d] = min(MAX_QUEUE, colas[d] + cant)


def compute_state():
    return {
        "tick": tick_num,
        "intersecciones": {nodo: i.to_dict() for nodo, i in red.items()},
    }


@app.get("/status")
def status():
    return compute_state()


@app.websocket("/ws")
async def ws_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            avanzar_tick()
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
