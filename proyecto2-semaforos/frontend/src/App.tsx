import { useEffect, useMemo, useRef, useState } from "react";
import "./cars.css";

type Dir = "N" | "S" | "E" | "W";
type Nodo = "N1" | "N2" | "N3" | "N4";
type Fase = "NS" | "EW";
type Subfase = "verde" | "amarillo" | "calculando";

interface InterseccionState {
  fase: Fase;
  subfase: Subfase;
  restante: number;
  colas: Record<Dir, number>;
  verdeCalculado: number | null;
}

interface LiveState {
  tick: number;
  intersecciones: Record<Nodo, InterseccionState>;
}

const NODOS: Nodo[] = ["N1", "N2", "N3", "N4"];
const DIRS: Dir[] = ["N", "S", "E", "W"];

// Mismo grafo que el backend (main.py): quién es vecino de quién en cada
// dirección. Lo que no tiene vecino es una entrada/salida externa de la red.
const NEIGHBORS: Record<Nodo, Partial<Record<Dir, Nodo>>> = {
  N1: { E: "N2", S: "N3" },
  N2: { W: "N1", S: "N4" },
  N3: { N: "N1", E: "N4" },
  N4: { N: "N2", W: "N3" },
};

const CENTERS: Record<Nodo, { x: number; y: number }> = {
  N1: { x: 300, y: 220 },
  N2: { x: 620, y: 220 },
  N3: { x: 300, y: 540 },
  N4: { x: 620, y: 540 },
};

const STUB: Record<Dir, { dx: number; dy: number }> = {
  N: { dx: 0, dy: -140 },
  S: { dx: 0, dy: 140 },
  E: { dx: 140, dy: 0 },
  W: { dx: -140, dy: 0 },
};

function laneOuterPoint(nodo: Nodo, dir: Dir) {
  const vecino = NEIGHBORS[nodo][dir];
  if (vecino) return CENTERS[vecino];
  const c = CENTERS[nodo];
  const off = STUB[dir];
  return { x: c.x + off.dx, y: c.y + off.dy };
}

const ROADS: { x1: number; y1: number; x2: number; y2: number; interna: boolean }[] = (() => {
  const roads: { x1: number; y1: number; x2: number; y2: number; interna: boolean }[] = [];
  const vistos = new Set<string>();
  for (const nodo of NODOS) {
    for (const dir of DIRS) {
      const vecino = NEIGHBORS[nodo][dir];
      const c = CENTERS[nodo];
      if (vecino) {
        const key = [nodo, vecino].sort().join("-");
        if (vistos.has(key)) continue;
        vistos.add(key);
        roads.push({ x1: c.x, y1: c.y, x2: CENTERS[vecino].x, y2: CENTERS[vecino].y, interna: true });
      } else {
        const outer = laneOuterPoint(nodo, dir);
        roads.push({ x1: c.x, y1: c.y, x2: outer.x, y2: outer.y, interna: false });
      }
    }
  }
  return roads;
})();

const SEMAFORO_OFFSET: Record<Fase, { dx: number; dy: number }> = {
  NS: { dx: -34, dy: -8 },
  EW: { dx: 34, dy: -8 },
};

const SUBFASE_LABEL: Record<Subfase, string> = {
  verde: "verde",
  amarillo: "amarillo",
  calculando: "calculando…",
};

const LUZ_COLOR: Record<"rojo" | "amarillo" | "verde", string> = {
  rojo: "#ef4444",
  amarillo: "#f59e0b",
  verde: "#22c55e",
};

function axisColor(inter: InterseccionState, eje: Fase): "rojo" | "amarillo" | "verde" {
  if (inter.fase !== eje) return "rojo";
  if (inter.subfase === "verde") return "verde";
  if (inter.subfase === "amarillo") return "amarillo";
  return "rojo"; // "calculando" = corte en rojo total mientras decide
}

function Semaforo({ x, y, eje, color }: { x: number; y: number; eje: Fase; color: "rojo" | "amarillo" | "verde" }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <rect x={-11} y={-30} width={22} height={48} rx={6} fill="#111827" stroke="#374151" strokeWidth={1} />
      <circle cx={0} cy={-19} r={5.5} fill={color === "rojo" ? LUZ_COLOR.rojo : "#3f1d1d"} />
      <circle cx={0} cy={-5} r={5.5} fill={color === "amarillo" ? LUZ_COLOR.amarillo : "#4a3a12"} />
      <circle cx={0} cy={9} r={5.5} fill={color === "verde" ? LUZ_COLOR.verde : "#123a1e"} />
      <text x={0} y={26} fontSize={8} fill="#94a3b8" textAnchor="middle">
        {eje}
      </text>
    </g>
  );
}

// --- Simulación de cola de autos por carril -------------------------------
//
// En vez de animar emojis en bucle infinito (que "flotaban" sin llegar a
// ningún lado), cada auto es un objeto con identidad estable. Mientras el
// semáforo de su eje está en rojo/amarillo se queda parado en su puesto de
// la fila (más cerca del cruce = primero en salir); cuando el backend libera
// carros de esa cola, esos autos pasan a "leaving" y una transición CSS los
// desliza a través del cruce hasta desvanecerse. El resto de la fila se
// recorre automáticamente porque su posición depende de su índice, y ese
// cambio también se anima por CSS.

type CarEstado = "queued" | "leaving";

interface Car {
  id: number;
  estado: CarEstado;
  leftAt?: number;
}

const CAP = 6; // máximo de autos dibujados por carril (el resto se resume en "+N")
const STOP_OFFSET = 40; // distancia del primer auto en cola al centro del cruce
const CAR_GAP = 20; // separación entre autos consecutivos en la fila
const LEAVE_DIST = 55; // qué tan lejos, cruzando el nodo, se dibuja un auto que ya salió
const LEAVE_MS = 1100; // cuánto se mantiene visible un auto "leaving" antes de limpiarlo
const CAR_COLORS = ["#f97316", "#38bdf8", "#a3e635", "#f472b6", "#facc15", "#c084fc", "#fb7185", "#5eead4"];

let carIdSeq = 0;
const nextCarId = () => carIdSeq++;

type QueuesByDir = Record<Dir, Car[]>;
type QueuesByNodo = Record<Nodo, QueuesByDir>;

function crearQueuesVacias(): QueuesByNodo {
  const porNodo = {} as QueuesByNodo;
  for (const nodo of NODOS) {
    const porDir = {} as QueuesByDir;
    for (const dir of DIRS) porDir[dir] = [];
    porNodo[nodo] = porDir;
  }
  return porNodo;
}

function actualizarQueues(queues: QueuesByNodo, nuevoEstado: LiveState) {
  const ahora = Date.now();
  for (const nodo of NODOS) {
    for (const dir of DIRS) {
      let fila = queues[nodo][dir];
      fila = fila.filter((c) => c.estado !== "leaving" || ahora - (c.leftAt ?? 0) < LEAVE_MS);

      const cantidad = nuevoEstado.intersecciones[nodo].colas[dir];
      const objetivoVisible = Math.min(cantidad, CAP);
      const enCola = fila.filter((c) => c.estado === "queued").length;
      const diff = objetivoVisible - enCola;

      if (diff > 0) {
        for (let i = 0; i < diff; i++) fila.push({ id: nextCarId(), estado: "queued" });
      } else if (diff < 0) {
        let porQuitar = -diff;
        for (let i = 0; i < fila.length && porQuitar > 0; i++) {
          if (fila[i].estado === "queued") {
            fila[i] = { ...fila[i], estado: "leaving", leftAt: ahora };
            porQuitar--;
          }
        }
      }
      queues[nodo][dir] = fila;
    }
  }
}

function CarShape({ x, y, angleDeg, color, leaving }: { x: number; y: number; angleDeg: number; color: string; leaving: boolean }) {
  return (
    <g
      className={`car-token${leaving ? " car-leaving" : ""}`}
      style={{ transform: `translate(${x}px, ${y}px) rotate(${angleDeg}deg)` }}
    >
      <rect x={-8} y={-5} width={16} height={10} rx={3} fill={color} stroke="#0f172a" strokeWidth={1} />
      <rect x={2.5} y={-4} width={4} height={3} rx={0.5} fill="#e0f2fe" opacity={0.9} />
      <rect x={2.5} y={1} width={4} height={3} rx={0.5} fill="#e0f2fe" opacity={0.9} />
    </g>
  );
}

function StopLine({ nodo, dir }: { nodo: Nodo; dir: Dir }) {
  const { x: x1, y: y1 } = laneOuterPoint(nodo, dir);
  const { x: x2, y: y2 } = CENTERS[nodo];
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const px = -uy;
  const py = ux;
  const dist = STOP_OFFSET - 8;
  const cx = x2 - ux * dist + px * 7;
  const cy = y2 - uy * dist + py * 7;
  const angle = (Math.atan2(uy, ux) * 180) / Math.PI + 90;
  return <rect x={-9} y={-1.5} width={18} height={3} rx={1} fill="#e2e8f0" opacity={0.5} transform={`translate(${cx},${cy}) rotate(${angle})`} />;
}

function Carros({ nodo, dir, inter, fila }: { nodo: Nodo; dir: Dir; inter: InterseccionState; fila: Car[] }) {
  const cantidad = inter.colas[dir];
  const overflow = Math.max(0, cantidad - CAP);
  if (fila.length === 0 && overflow === 0) return null;

  const { x: x1, y: y1 } = laneOuterPoint(nodo, dir);
  const { x: x2, y: y2 } = CENTERS[nodo];
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const px = -uy;
  const py = ux;
  const laneOffset = 7;
  const angleDeg = (Math.atan2(uy, ux) * 180) / Math.PI;

  let queuedIdx = 0;
  const puestos = fila.map((car) => {
    const dist = car.estado === "queued" ? STOP_OFFSET + queuedIdx++ * CAR_GAP : -LEAVE_DIST;
    const cx = x2 - ux * dist + px * laneOffset;
    const cy = y2 - uy * dist + py * laneOffset;
    return { car, cx, cy };
  });

  const ultimo = puestos[puestos.length - 1];

  return (
    <>
      {puestos.map(({ car, cx, cy }) => (
        <CarShape
          key={car.id}
          x={cx}
          y={cy}
          angleDeg={angleDeg}
          color={CAR_COLORS[car.id % CAR_COLORS.length]}
          leaving={car.estado === "leaving"}
        />
      ))}
      {overflow > 0 && (
        <text
          x={ultimo ? ultimo.cx - ux * CAR_GAP : x2 - ux * STOP_OFFSET}
          y={ultimo ? ultimo.cy - uy * CAR_GAP : y2 - uy * STOP_OFFSET}
          fontSize={10}
          fill="#94a3b8"
          textAnchor="middle"
        >
          +{overflow}
        </text>
      )}
    </>
  );
}

function Interseccion({ nodo, inter, queues }: { nodo: Nodo; inter: InterseccionState; queues: QueuesByDir }) {
  const c = CENTERS[nodo];
  const nsOff = SEMAFORO_OFFSET.NS;
  const ewOff = SEMAFORO_OFFSET.EW;
  const calculando = inter.subfase === "calculando";

  return (
    <g>
      {DIRS.map((dir) => (
        <StopLine key={dir} nodo={nodo} dir={dir} />
      ))}
      <rect x={c.x - 24} y={c.y - 24} width={48} height={48} rx={10} fill="#1f2937" stroke="#475569" />
      <text x={c.x} y={c.y + 5} fontSize={11} fill="#e2e8f0" textAnchor="middle" fontWeight={600}>
        {nodo}
      </text>
      <Semaforo x={c.x + nsOff.dx} y={c.y + nsOff.dy} eje="NS" color={axisColor(inter, "NS")} />
      <Semaforo x={c.x + ewOff.dx} y={c.y + ewOff.dy} eje="EW" color={axisColor(inter, "EW")} />
      {calculando && (
        <text x={c.x} y={c.y - 42} fontSize={11} textAnchor="middle" className="calculando-badge">
          calculando siguiente fase…
        </text>
      )}
      <text x={c.x} y={c.y + 44} fontSize={10} fill="#94a3b8" textAnchor="middle">
        {inter.fase} {SUBFASE_LABEL[inter.subfase]} · {inter.restante}t
      </text>
      {DIRS.map((dir) => (
        <Carros key={dir} nodo={nodo} dir={dir} inter={inter} fila={queues[dir]} />
      ))}
    </g>
  );
}

export default function App() {
  const [state, setState] = useState<LiveState | null>(null);
  const [connected, setConnected] = useState(false);
  const [queues, setQueues] = useState<QueuesByNodo>(crearQueuesVacias());
  const queuesRef = useRef<QueuesByNodo>(queues);

  useEffect(() => {
    const ws = new WebSocket("ws://localhost:8010/ws");
    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onmessage = (ev) => {
      const nuevoEstado = JSON.parse(ev.data) as LiveState;
      actualizarQueues(queuesRef.current, nuevoEstado);
      setState(nuevoEstado);
      setQueues({ ...queuesRef.current });
    };
    return () => ws.close();
  }, []);

  const totalEsperando = useMemo(() => {
    if (!state) return 0;
    return NODOS.reduce(
      (acc, n) => acc + DIRS.reduce((a, d) => a + state.intersecciones[n].colas[d], 0),
      0
    );
  }, [state]);

  return (
    <div className="app-semaforos">
      <div className="overlay">
        <h2>Proyecto 2 — Semáforos inteligentes</h2>
        <p>
          Backend: {connected ? "conectado ✅" : "desconectado ❌"} (ws://localhost:8010/ws)
          {state && ` · tick ${state.tick} · ${totalEsperando} carros en cola`}
        </p>
        <p className="legend">
          🔴 rojo · 🟡 amarillo (transición) · 🟢 verde — cada semáforo calcula el
          tiempo de verde según la cola ANTES de soltar los carros. Los autos se
          acumulan detrás de la línea de pare y cruzan cuando su eje está en verde.
        </p>
      </div>
      <svg viewBox="0 0 920 760" className="road-svg">
        {ROADS.map((r, i) => (
          <g key={i}>
            <line
              x1={r.x1}
              y1={r.y1}
              x2={r.x2}
              y2={r.y2}
              className="road-asphalt"
              strokeWidth={r.interna ? 34 : 26}
            />
            <line x1={r.x1} y1={r.y1} x2={r.x2} y2={r.y2} className="road-centerline" />
          </g>
        ))}
        {state &&
          NODOS.map((nodo) => (
            <Interseccion key={nodo} nodo={nodo} inter={state.intersecciones[nodo]} queues={queues[nodo]} />
          ))}
      </svg>
    </div>
  );
}
