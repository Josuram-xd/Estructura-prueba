import { useEffect, useState, type CSSProperties } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  BaseEdge,
  EdgeLabelRenderer,
  type Node,
  type Edge,
  type EdgeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import "./cars.css";

type CarEdgeData = { nivel: number; isGreen: boolean };

function CarEdge({ sourceX, sourceY, targetX, targetY, style, data }: EdgeProps<Edge<CarEdgeData>>) {
  const nivel = data?.nivel ?? 0;
  const isGreen = data?.isGreen ?? false;
  const path = `M ${sourceX},${sourceY} L ${targetX},${targetY}`;
  const dx = targetX - sourceX;
  const dy = targetY - sourceY;
  const midX = (sourceX + targetX) / 2;
  const midY = (sourceY + targetY) / 2;

  // La luz verde deja pasar los carros hasta el centro; en rojo se quedan
  // haciendo fila antes de la intersección.
  const travel = isGreen ? 1 : 0.6;
  const duration = isGreen ? 1 : 3.5;
  const carCount = nivel <= 0 ? 0 : Math.min(6, Math.max(1, Math.round(nivel / 3)));

  return (
    <>
      <BaseEdge path={path} style={style} />
      <EdgeLabelRenderer>
        <div
          className="edge-count"
          style={{ position: "absolute", left: midX, top: midY, transform: "translate(-50%, -50%)" }}
        >
          {nivel}
        </div>
        {Array.from({ length: carCount }).map((_, i) => (
          <div
            key={i}
            className="car"
            style={
              {
                position: "absolute",
                left: sourceX,
                top: sourceY,
                "--dx": `${dx * travel}px`,
                "--dy": `${dy * travel}px`,
                animationDuration: `${duration}s`,
                animationDelay: `${-(i / carCount) * duration}s`,
              } as CSSProperties
            }
          >
            🚗
          </div>
        ))}
      </EdgeLabelRenderer>
    </>
  );
}

const edgeTypes = { carEdge: CarEdge };

type LiveState = {
  congestion: Record<string, number>;
  orden_verde: [string, number][];
  luz_verde_actual: string;
};

const LANE_POSITIONS: Record<string, { x: number; y: number }> = {
  carril_1: { x: 300, y: 40 },
  carril_2: { x: 560, y: 260 },
  carril_3: { x: 300, y: 480 },
  carril_4: { x: 40, y: 260 },
};

const CENTER = { x: 300, y: 260 };

function buildNodes(state: LiveState | null): Node[] {
  const center: Node = {
    id: "interseccion",
    position: CENTER,
    data: { label: "Intersección" },
    style: {
      background: "#1f2937",
      color: "#fff",
      borderRadius: 12,
      padding: 10,
      fontWeight: 600,
    },
  };

  const lanes = Object.keys(LANE_POSITIONS).map((carril) => {
    const isGreen = state?.luz_verde_actual === carril;
    const nivel = state?.congestion[carril] ?? 0;
    const bg = isGreen
      ? "#16a34a"
      : nivel > 10
      ? "#b91c1c"
      : nivel > 5
      ? "#d97706"
      : "#334155";

    return {
      id: carril,
      position: LANE_POSITIONS[carril],
      data: { label: `${carril}\n${isGreen ? "🟢 verde" : `cong: ${nivel}`}` },
      style: {
        background: bg,
        color: "#fff",
        borderRadius: 10,
        padding: 10,
        border: isGreen ? "3px solid #86efac" : "1px solid #475569",
        whiteSpace: "pre-line" as const,
        textAlign: "center" as const,
        minWidth: 110,
      },
    };
  });

  return [center, ...lanes];
}

function buildEdges(state: LiveState | null): Edge[] {
  return Object.keys(LANE_POSITIONS).map((carril) => {
    const nivel = state?.congestion[carril] ?? 0;
    const isGreen = state?.luz_verde_actual === carril;
    return {
      id: `${carril}-interseccion`,
      source: carril,
      target: "interseccion",
      type: "carEdge",
      data: { nivel, isGreen },
      style: {
        strokeWidth: 1 + nivel / 3,
        stroke: isGreen ? "#22c55e" : "#64748b",
      },
    };
  });
}

export default function App() {
  const [state, setState] = useState<LiveState | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const ws = new WebSocket("ws://localhost:8010/ws");
    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onmessage = (ev) => {
      const raw = JSON.parse(ev.data);
      setState({
        congestion: raw.congestion,
        orden_verde: raw.orden_luz_verde,
        luz_verde_actual: raw.luz_verde_actual,
      });
    };
    return () => ws.close();
  }, []);

  return (
    <div style={{ width: "100vw", height: "100vh", background: "#0f172a" }}>
      <div
        style={{
          position: "absolute",
          zIndex: 10,
          padding: "10px 16px",
          color: "#e2e8f0",
          fontFamily: "sans-serif",
        }}
      >
        <h2 style={{ margin: 0 }}>Proyecto 2 — Semáforos inteligentes</h2>
        <p style={{ margin: 0, opacity: 0.7 }}>
          Backend: {connected ? "conectado ✅" : "desconectado ❌"} (ws://localhost:8010/ws)
        </p>
      </div>
      <ReactFlow
        nodes={buildNodes(state)}
        edges={buildEdges(state)}
        edgeTypes={edgeTypes}
        fitView
      >
        <Background color="#334155" />
        <Controls />
      </ReactFlow>
    </div>
  );
}
