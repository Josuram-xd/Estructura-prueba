import { useEffect, useMemo, useState } from "react";
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

const AXIS_OF: Record<Dir, Fase> = { N: "NS", S: "NS", E: "EW", W: "EW" };

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

function Carros({ nodo, dir, inter }: { nodo: Nodo; dir: Dir; inter: InterseccionState }) {
  const cantidad = inter.colas[dir];
  if (cantidad <= 0) return null;

  const isGreen = inter.fase === AXIS_OF[dir] && inter.subfase === "verde";
  const { x: x1, y: y1 } = laneOuterPoint(nodo, dir);
  const { x: x2, y: y2 } = CENTERS[nodo];
  const travel = isGreen ? 0.95 : 0.6;
  const duration = isGreen ? 1.1 : 3.2;
  const carCount = Math.min(4, Math.max(1, Math.round(cantidad / 4)));

  return (
    <>
      {Array.from({ length: carCount }).map((_, i) => (
        <text
          key={i}
          x={x1}
          y={y1}
          fontSize={16}
          textAnchor="middle"
          className="car-svg"
          style={
            {
              "--dx": `${(x2 - x1) * travel}px`,
              "--dy": `${(y2 - y1) * travel}px`,
              animationDuration: `${duration}s`,
              animationDelay: `${-(i / carCount) * duration}s`,
            } as React.CSSProperties
          }
        >
          🚗
        </text>
      ))}
    </>
  );
}

function Interseccion({ nodo, inter }: { nodo: Nodo; inter: InterseccionState }) {
  const c = CENTERS[nodo];
  const nsOff = SEMAFORO_OFFSET.NS;
  const ewOff = SEMAFORO_OFFSET.EW;
  const calculando = inter.subfase === "calculando";

  return (
    <g>
      <rect x={c.x - 24} y={c.y - 24} width={48} height={48} rx={10} fill="#1f2937" stroke="#475569" />
      <text x={c.x} y={c.y + 5} fontSize={11} fill="#e2e8f0" textAnchor="middle" fontWeight={600}>
        {nodo}
      </text>
      <Semaforo x={c.x + nsOff.dx} y={c.y + nsOff.dy} eje="NS" color={axisColor(inter, "NS")} />
      <Semaforo x={c.x + ewOff.dx} y={c.y + ewOff.dy} eje="EW" color={axisColor(inter, "EW")} />
      {calculando && (
        <text x={c.x} y={c.y - 42} fontSize={11} textAnchor="middle" className="calculando-badge">
          🧮 calculando siguiente fase…
        </text>
      )}
      <text x={c.x} y={c.y + 44} fontSize={10} fill="#94a3b8" textAnchor="middle">
        {inter.fase} {SUBFASE_LABEL[inter.subfase]} · {inter.restante}t
      </text>
      {DIRS.map((dir) => (
        <Carros key={dir} nodo={nodo} dir={dir} inter={inter} />
      ))}
    </g>
  );
}

export default function App() {
  const [state, setState] = useState<LiveState | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const ws = new WebSocket("ws://localhost:8010/ws");
    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onmessage = (ev) => {
      setState(JSON.parse(ev.data) as LiveState);
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
          tiempo de verde según la cola ANTES de soltar los carros.
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
          NODOS.map((nodo) => <Interseccion key={nodo} nodo={nodo} inter={state.intersecciones[nodo]} />)}
      </svg>
    </div>
  );
}
